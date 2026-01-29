const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { getDiasTranscurridos, getEstadoVisual } = require('../utils/helpers');

// GET /api/dashboard/metricas - Obtener métricas principales
router.get('/metricas', (req, res) => {
  const db = getDb();

  // Préstamos activos
  const prestamosActivos = db.prepare("SELECT * FROM prestamos WHERE estado = 'Activo'").all();

  // Calcular días transcurridos para cada préstamo activo
  const prestamosConDias = prestamosActivos.map(p => ({
    ...p,
    dias_transcurridos: getDiasTranscurridos(p.fecha_hora_prestamo)
  }));

  // Préstamos de hoy (día 0)
  const prestamosHoy = prestamosConDias.filter(p => p.dias_transcurridos === 0).length;

  // Préstamos pendientes (día 1+)
  const prestamosPendientes = prestamosConDias.filter(p => p.dias_transcurridos >= 1).length;

  // Desglose por días
  const dia1 = prestamosConDias.filter(p => p.dias_transcurridos === 1).length;
  const dias2a3 = prestamosConDias.filter(p => p.dias_transcurridos >= 2 && p.dias_transcurridos <= 3).length;
  const dias4plus = prestamosConDias.filter(p => p.dias_transcurridos >= 4).length;

  // Máximo de días (para color del badge principal)
  const maxDias = prestamosConDias.length > 0
    ? Math.max(...prestamosConDias.map(p => p.dias_transcurridos))
    : 0;

  // Insumos por estado
  const insumosDisponibles = db.prepare("SELECT COUNT(*) as count FROM insumos WHERE estado = 'Disponible'").get().count;
  const insumosEnPrestamo = db.prepare("SELECT COUNT(*) as count FROM insumos WHERE estado = 'En préstamo'").get().count;
  const insumosEnMantenimiento = db.prepare("SELECT COUNT(*) as count FROM insumos WHERE estado = 'En mantenimiento'").get().count;
  const insumosDadosDeBaja = db.prepare("SELECT COUNT(*) as count FROM insumos WHERE estado = 'Dado de baja'").get().count;

  // Total de usuarios activos
  const usuariosActivos = db.prepare("SELECT COUNT(*) as count FROM usuarios WHERE activo = 1").get().count;
  const usuariosSoporteIt = db.prepare("SELECT COUNT(*) as count FROM usuarios WHERE activo = 1 AND rol = 'soporte_it'").get().count;

  res.json({
    success: true,
    data: {
      prestamos: {
        activos_hoy: prestamosHoy,
        pendientes: prestamosPendientes,
        total_activos: prestamosActivos.length,
        max_dias: maxDias,
        estado_visual: getEstadoVisual(maxDias),
        desglose: {
          dia_1: dia1,
          dias_2_3: dias2a3,
          dias_4_plus: dias4plus
        }
      },
      insumos: {
        disponibles: insumosDisponibles,
        en_prestamo: insumosEnPrestamo,
        en_mantenimiento: insumosEnMantenimiento,
        dados_de_baja: insumosDadosDeBaja,
        total: insumosDisponibles + insumosEnPrestamo + insumosEnMantenimiento + insumosDadosDeBaja
      },
      usuarios: {
        activos: usuariosActivos,
        soporte_it: usuariosSoporteIt
      }
    }
  });
});

// GET /api/dashboard/prestamos-criticos - Obtener préstamos con 4+ días
router.get('/prestamos-criticos', (req, res) => {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      p.*,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido,
      u.dni as usuario_dni,
      u.area_equipo as usuario_area,
      i.tipologia as insumo_tipologia,
      i.nombre as insumo_nombre,
      it.nombre as it_nombre,
      it.apellido as it_apellido
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    JOIN insumos i ON p.insumo_id = i.id
    JOIN usuarios it ON p.usuario_it_id = it.id
    WHERE p.estado = 'Activo'
    ORDER BY p.fecha_hora_prestamo ASC
  `);

  const prestamos = stmt.all()
    .map(p => ({
      ...p,
      usuario_nombre_completo: `${p.usuario_nombre} ${p.usuario_apellido}`,
      insumo_descripcion: `${p.insumo_tipologia} - ${p.insumo_nombre}`,
      it_nombre_completo: `${p.it_nombre} ${p.it_apellido}`,
      dias_transcurridos: getDiasTranscurridos(p.fecha_hora_prestamo),
      estado_visual: getEstadoVisual(getDiasTranscurridos(p.fecha_hora_prestamo))
    }))
    .filter(p => p.dias_transcurridos >= 4);

  res.json({ success: true, data: prestamos });
});

// GET /api/dashboard/prestamos-antiguos - Top préstamos más antiguos
router.get('/prestamos-antiguos', (req, res) => {
  const db = getDb();
  const limit = parseInt(req.query.limit) || 10;

  const stmt = db.prepare(`
    SELECT
      p.*,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido,
      u.area_equipo as usuario_area,
      i.tipologia as insumo_tipologia,
      i.nombre as insumo_nombre,
      it.nombre as it_nombre,
      it.apellido as it_apellido
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    JOIN insumos i ON p.insumo_id = i.id
    JOIN usuarios it ON p.usuario_it_id = it.id
    WHERE p.estado = 'Activo'
    ORDER BY p.fecha_hora_prestamo ASC
    LIMIT ?
  `);

  const prestamos = stmt.all(limit).map(p => ({
    ...p,
    usuario_nombre_completo: `${p.usuario_nombre} ${p.usuario_apellido}`,
    insumo_descripcion: `${p.insumo_tipologia} - ${p.insumo_nombre}`,
    it_nombre_completo: `${p.it_nombre} ${p.it_apellido}`,
    dias_transcurridos: getDiasTranscurridos(p.fecha_hora_prestamo),
    estado_visual: getEstadoVisual(getDiasTranscurridos(p.fecha_hora_prestamo))
  }));

  res.json({ success: true, data: prestamos });
});

// GET /api/dashboard/graficos - Datos para gráficos
router.get('/graficos', (req, res) => {
  const db = getDb();

  // Fecha de inicio (últimos 30 días)
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);
  const fechaInicio = hace30Dias.toISOString().split('T')[0];

  // 1. Préstamos por día por tipología (últimos 30 días)
  const prestamosPorDiaTipo = db.prepare(`
    SELECT
      DATE(p.fecha_hora_prestamo) as fecha,
      i.tipologia,
      COUNT(*) as cantidad
    FROM prestamos p
    JOIN insumos i ON p.insumo_id = i.id
    WHERE DATE(p.fecha_hora_prestamo) >= ?
    GROUP BY DATE(p.fecha_hora_prestamo), i.tipologia
    ORDER BY fecha
  `).all(fechaInicio);

  // Obtener tipologías únicas
  const tipologiasUnicas = [...new Set(prestamosPorDiaTipo.map(p => p.tipologia))];

  // Agrupar por fecha con tipologías como columnas
  const fechasTipo = [...new Set(prestamosPorDiaTipo.map(p => p.fecha))];
  const prestamos_por_dia_tipo = fechasTipo.map(fecha => {
    const row = { fecha };
    tipologiasUnicas.forEach(tipo => {
      const match = prestamosPorDiaTipo.find(p => p.fecha === fecha && p.tipologia === tipo);
      row[tipo] = match ? match.cantidad : 0;
    });
    return row;
  });

  // 2. Préstamos por día por área (últimos 30 días)
  const prestamosPorDiaArea = db.prepare(`
    SELECT
      DATE(p.fecha_hora_prestamo) as fecha,
      u.area_equipo,
      COUNT(*) as cantidad
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    WHERE DATE(p.fecha_hora_prestamo) >= ?
    GROUP BY DATE(p.fecha_hora_prestamo), u.area_equipo
    ORDER BY fecha
  `).all(fechaInicio);

  // Obtener áreas únicas
  const areasUnicas = [...new Set(prestamosPorDiaArea.map(p => p.area_equipo))];

  // Agrupar por fecha con áreas como columnas
  const fechasArea = [...new Set(prestamosPorDiaArea.map(p => p.fecha))];
  const prestamos_por_dia_area = fechasArea.map(fecha => {
    const row = { fecha };
    areasUnicas.forEach(area => {
      const match = prestamosPorDiaArea.find(p => p.fecha === fecha && p.area_equipo === area);
      row[area] = match ? match.cantidad : 0;
    });
    return row;
  });

  // 3. Distribución de insumos en préstamo por tipología (actualmente)
  const distribucionInsumosPorTipo = db.prepare(`
    SELECT
      tipologia,
      COUNT(*) as cantidad
    FROM insumos
    WHERE estado = 'En préstamo'
    GROUP BY tipologia
    ORDER BY cantidad DESC
  `).all();

  // 4. Insumos más prestados (histórico)
  const insumosMasPrestados = db.prepare(`
    SELECT
      i.id,
      i.tipologia,
      i.nombre,
      i.numero_serie,
      COUNT(p.id) as total_prestamos
    FROM insumos i
    JOIN prestamos p ON i.id = p.insumo_id
    GROUP BY i.id
    HAVING total_prestamos > 0
    ORDER BY total_prestamos DESC
    LIMIT 5
  `).all();

  // 5. Usuarios con más préstamos activos
  const usuariosPendientes = db.prepare(`
    SELECT
      u.id,
      u.nombre,
      u.apellido,
      u.area_equipo,
      COUNT(p.id) as prestamos_activos
    FROM usuarios u
    JOIN prestamos p ON u.id = p.usuario_id AND p.estado = 'Activo'
    GROUP BY u.id
    ORDER BY prestamos_activos DESC
    LIMIT 5
  `).all().map(u => {
    // Calcular días acumulados
    const prestamos = db.prepare(`
      SELECT fecha_hora_prestamo FROM prestamos
      WHERE usuario_id = ? AND estado = 'Activo'
    `).all(u.id);

    const diasAcumulados = prestamos.reduce((sum, p) => sum + getDiasTranscurridos(p.fecha_hora_prestamo), 0);

    return {
      ...u,
      nombre_completo: `${u.nombre} ${u.apellido}`,
      dias_acumulados: diasAcumulados
    };
  });

  res.json({
    success: true,
    data: {
      prestamos_por_dia_tipo,
      tipologias_unicas: tipologiasUnicas,
      prestamos_por_dia_area,
      areas_unicas: areasUnicas,
      distribucion_insumos_por_tipo: distribucionInsumosPorTipo,
      insumos_mas_prestados: insumosMasPrestados,
      usuarios_pendientes: usuariosPendientes
    }
  });
});

module.exports = router;
