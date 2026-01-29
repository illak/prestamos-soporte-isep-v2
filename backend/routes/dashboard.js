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

  // 1. Préstamos por área
  const prestamosPorArea = db.prepare(`
    SELECT
      u.area_equipo,
      COUNT(*) as total,
      SUM(CASE WHEN p.estado = 'Activo' THEN 1 ELSE 0 END) as activos
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    GROUP BY u.area_equipo
    ORDER BY total DESC
  `).all();

  // Calcular activos hoy vs pendientes para cada área
  const prestamosActivosPorArea = db.prepare(`
    SELECT
      u.area_equipo,
      p.fecha_hora_prestamo
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    WHERE p.estado = 'Activo'
  `).all();

  const areaStats = {};
  prestamosActivosPorArea.forEach(p => {
    if (!areaStats[p.area_equipo]) {
      areaStats[p.area_equipo] = { hoy: 0, pendientes: 0 };
    }
    const dias = getDiasTranscurridos(p.fecha_hora_prestamo);
    if (dias === 0) {
      areaStats[p.area_equipo].hoy++;
    } else {
      areaStats[p.area_equipo].pendientes++;
    }
  });

  const prestamosPorAreaConDesglose = prestamosPorArea.map(a => ({
    ...a,
    activos_hoy: areaStats[a.area_equipo]?.hoy || 0,
    pendientes: areaStats[a.area_equipo]?.pendientes || 0
  }));

  // 2. Timeline de préstamos (últimos 30 días)
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);
  const fechaInicio = hace30Dias.toISOString().split('T')[0];

  const timelinePrestamos = db.prepare(`
    SELECT
      DATE(fecha_hora_prestamo) as fecha,
      COUNT(*) as prestamos_creados
    FROM prestamos
    WHERE DATE(fecha_hora_prestamo) >= ?
    GROUP BY DATE(fecha_hora_prestamo)
    ORDER BY fecha
  `).all(fechaInicio);

  const timelineDevoluciones = db.prepare(`
    SELECT
      DATE(fecha_hora_devolucion_real) as fecha,
      COUNT(*) as devoluciones
    FROM prestamos
    WHERE DATE(fecha_hora_devolucion_real) >= ?
    GROUP BY DATE(fecha_hora_devolucion_real)
    ORDER BY fecha
  `).all(fechaInicio);

  // Combinar timeline
  const fechasSet = new Set();
  timelinePrestamos.forEach(t => fechasSet.add(t.fecha));
  timelineDevoluciones.forEach(t => fechasSet.add(t.fecha));

  const timeline = Array.from(fechasSet).sort().map(fecha => {
    const prestamos = timelinePrestamos.find(t => t.fecha === fecha)?.prestamos_creados || 0;
    const devoluciones = timelineDevoluciones.find(t => t.fecha === fecha)?.devoluciones || 0;
    return { fecha, prestamos, devoluciones };
  });

  // 3. Distribución de estados de insumos
  const distribucionInsumos = db.prepare(`
    SELECT estado, COUNT(*) as cantidad
    FROM insumos
    GROUP BY estado
  `).all();

  // 4. Insumos más prestados
  const insumosMasPrestados = db.prepare(`
    SELECT
      i.id,
      i.tipologia,
      i.nombre,
      i.numero_serie,
      COUNT(p.id) as total_prestamos
    FROM insumos i
    LEFT JOIN prestamos p ON i.id = p.insumo_id
    GROUP BY i.id
    ORDER BY total_prestamos DESC
    LIMIT 5
  `).all();

  // 5. Responsables IT con más préstamos gestionados
  const responsablesIt = db.prepare(`
    SELECT
      u.id,
      u.nombre,
      u.apellido,
      COUNT(p.id) as total_prestamos
    FROM usuarios u
    JOIN prestamos p ON u.id = p.usuario_it_id
    WHERE u.rol = 'soporte_it'
    GROUP BY u.id
    ORDER BY total_prestamos DESC
    LIMIT 5
  `).all().map(r => ({
    ...r,
    nombre_completo: `${r.nombre} ${r.apellido}`
  }));

  // 6. Usuarios/áreas con más préstamos pendientes
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

  // 7. % de préstamos devueltos el mismo día (último mes)
  const prestamosUltimoMes = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN DATE(fecha_hora_prestamo) = DATE(fecha_hora_devolucion_real) THEN 1 ELSE 0 END) as mismo_dia
    FROM prestamos
    WHERE estado = 'Devuelto' AND DATE(fecha_hora_prestamo) >= ?
  `).get(fechaInicio);

  const porcentajeMismoDia = prestamosUltimoMes.total > 0
    ? ((prestamosUltimoMes.mismo_dia / prestamosUltimoMes.total) * 100).toFixed(1)
    : 0;

  // 8. Tiempo promedio de retención por tipología
  const tiempoPromedioTipologia = db.prepare(`
    SELECT
      i.tipologia,
      AVG(
        CAST(
          (julianday(p.fecha_hora_devolucion_real) - julianday(p.fecha_hora_prestamo)) AS REAL
        )
      ) as promedio_dias
    FROM prestamos p
    JOIN insumos i ON p.insumo_id = i.id
    WHERE p.estado = 'Devuelto' AND p.fecha_hora_devolucion_real IS NOT NULL
    GROUP BY i.tipologia
    ORDER BY promedio_dias DESC
  `).all().map(t => ({
    ...t,
    promedio_dias: parseFloat(t.promedio_dias?.toFixed(1) || 0)
  }));

  res.json({
    success: true,
    data: {
      prestamos_por_area: prestamosPorAreaConDesglose,
      timeline,
      distribucion_insumos: distribucionInsumos,
      insumos_mas_prestados: insumosMasPrestados,
      responsables_it: responsablesIt,
      usuarios_pendientes: usuariosPendientes,
      porcentaje_mismo_dia: parseFloat(porcentajeMismoDia),
      tiempo_promedio_tipologia: tiempoPromedioTipologia
    }
  });
});

module.exports = router;
