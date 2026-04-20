const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { getDiasTranscurridos, getEstadoVisual } = require('../utils/helpers');

// GET /api/dashboard/metricas
router.get('/metricas', (req, res) => {
  const db = getDb();

  const prestamosActivos = db.prepare("SELECT * FROM prestamos WHERE estado = 'Activo'").all();
  const prestamosConDias = prestamosActivos.map(p => ({
    ...p,
    dias_transcurridos: getDiasTranscurridos(p.fecha_hora_prestamo)
  }));

  const prestamosHoy = prestamosConDias.filter(p => p.dias_transcurridos === 0).length;
  const prestamosPendientes = prestamosConDias.filter(p => p.dias_transcurridos >= 1).length;
  const dia1 = prestamosConDias.filter(p => p.dias_transcurridos === 1).length;
  const dias2a3 = prestamosConDias.filter(p => p.dias_transcurridos >= 2 && p.dias_transcurridos <= 3).length;
  const dias4plus = prestamosConDias.filter(p => p.dias_transcurridos >= 4).length;
  const maxDias = prestamosConDias.length > 0 ? Math.max(...prestamosConDias.map(p => p.dias_transcurridos)) : 0;

  // Conteo por estado desde tabla estados
  const countsByEstado = db.prepare(`
    SELECT e.desc, COUNT(inv.id) as count
    FROM estados e
    LEFT JOIN inventario inv ON inv.id_estado = e.id
    GROUP BY e.id, e.desc
  `).all();

  const getCount = (desc) => (countsByEstado.find(r => r.desc === desc) || { count: 0 }).count;

  const totalInventario = countsByEstado.reduce((sum, r) => sum + r.count, 0);

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
        desglose: { dia_1: dia1, dias_2_3: dias2a3, dias_4_plus: dias4plus }
      },
      inventario: {
        disponibles: getCount('Disponible'),
        asignados: getCount('Asignado'),
        en_reparacion: getCount('En reparación'),
        danados: getCount('Dañado'),
        extraviados: getCount('Extraviado'),
        total: totalInventario
      },
      usuarios: { activos: usuariosActivos, soporte_it: usuariosSoporteIt }
    }
  });
});

// GET /api/dashboard/prestamos-criticos (4+ días)
router.get('/prestamos-criticos', (req, res) => {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      p.*,
      u.nombre as usuario_nombre, u.apellido as usuario_apellido,
      u.dni as usuario_dni,
      ar.desc as usuario_area,
      cat.desc as inventario_categoria,
      inv.fabricante as inventario_fabricante,
      inv.modelo as inventario_modelo,
      it.nombre as it_nombre, it.apellido as it_apellido
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    LEFT JOIN areas ar ON u.id_area = ar.id
    JOIN inventario inv ON p.inventario_id = inv.id
    LEFT JOIN categorias cat ON inv.id_categoria = cat.id
    JOIN usuarios it ON p.usuario_it_id = it.id
    WHERE p.estado = 'Activo'
    ORDER BY p.fecha_hora_prestamo ASC
  `);

  const prestamos = stmt.all()
    .map(p => {
      const nombre = `${p.inventario_fabricante || ''} ${p.inventario_modelo || ''}`.trim();
      return {
        ...p,
        usuario_nombre_completo: `${p.usuario_nombre} ${p.usuario_apellido}`,
        inventario_descripcion: `${p.inventario_categoria || ''} - ${nombre}`.trim().replace(/^- /, ''),
        it_nombre_completo: `${p.it_nombre} ${p.it_apellido}`,
        dias_transcurridos: getDiasTranscurridos(p.fecha_hora_prestamo),
        estado_visual: getEstadoVisual(getDiasTranscurridos(p.fecha_hora_prestamo))
      };
    })
    .filter(p => p.dias_transcurridos >= 4);

  res.json({ success: true, data: prestamos });
});

// GET /api/dashboard/prestamos-antiguos
router.get('/prestamos-antiguos', (req, res) => {
  const db = getDb();
  const limit = parseInt(req.query.limit) || 10;

  const stmt = db.prepare(`
    SELECT
      p.*,
      u.nombre as usuario_nombre, u.apellido as usuario_apellido,
      ar.desc as usuario_area,
      cat.desc as inventario_categoria,
      inv.fabricante as inventario_fabricante,
      inv.modelo as inventario_modelo,
      it.nombre as it_nombre, it.apellido as it_apellido
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    LEFT JOIN areas ar ON u.id_area = ar.id
    JOIN inventario inv ON p.inventario_id = inv.id
    LEFT JOIN categorias cat ON inv.id_categoria = cat.id
    JOIN usuarios it ON p.usuario_it_id = it.id
    WHERE p.estado = 'Activo'
    ORDER BY p.fecha_hora_prestamo ASC
    LIMIT ?
  `);

  const prestamos = stmt.all(limit).map(p => {
    const nombre = `${p.inventario_fabricante || ''} ${p.inventario_modelo || ''}`.trim();
    return {
      ...p,
      usuario_nombre_completo: `${p.usuario_nombre} ${p.usuario_apellido}`,
      inventario_descripcion: `${p.inventario_categoria || ''} - ${nombre}`.trim().replace(/^- /, ''),
      it_nombre_completo: `${p.it_nombre} ${p.it_apellido}`,
      dias_transcurridos: getDiasTranscurridos(p.fecha_hora_prestamo),
      estado_visual: getEstadoVisual(getDiasTranscurridos(p.fecha_hora_prestamo))
    };
  });

  res.json({ success: true, data: prestamos });
});

// GET /api/dashboard/graficos
router.get('/graficos', (req, res) => {
  const db = getDb();

  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);
  const fechaInicio = hace30Dias.toISOString().split('T')[0];

  // Préstamos por día por categoría
  const prestamosPorDiaCat = db.prepare(`
    SELECT DATE(p.fecha_hora_prestamo) as fecha, cat.desc as categoria, COUNT(*) as cantidad
    FROM prestamos p
    JOIN inventario inv ON p.inventario_id = inv.id
    LEFT JOIN categorias cat ON inv.id_categoria = cat.id
    WHERE DATE(p.fecha_hora_prestamo) >= ?
    GROUP BY DATE(p.fecha_hora_prestamo), cat.desc
    ORDER BY fecha
  `).all(fechaInicio);

  const categoriasUnicas = [...new Set(prestamosPorDiaCat.map(p => p.categoria))];
  const fechasCat = [...new Set(prestamosPorDiaCat.map(p => p.fecha))];
  const prestamos_por_dia_categoria = fechasCat.map(fecha => {
    const row = { fecha };
    categoriasUnicas.forEach(cat => {
      const match = prestamosPorDiaCat.find(p => p.fecha === fecha && p.categoria === cat);
      row[cat] = match ? match.cantidad : 0;
    });
    return row;
  });

  // Préstamos por día por área
  const prestamosPorDiaArea = db.prepare(`
    SELECT DATE(p.fecha_hora_prestamo) as fecha, ar.desc as area, COUNT(*) as cantidad
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    LEFT JOIN areas ar ON u.id_area = ar.id
    WHERE DATE(p.fecha_hora_prestamo) >= ?
    GROUP BY DATE(p.fecha_hora_prestamo), ar.desc
    ORDER BY fecha
  `).all(fechaInicio);

  const areasUnicas = [...new Set(prestamosPorDiaArea.map(p => p.area).filter(Boolean))];
  const fechasArea = [...new Set(prestamosPorDiaArea.map(p => p.fecha))];
  const prestamos_por_dia_area = fechasArea.map(fecha => {
    const row = { fecha };
    areasUnicas.forEach(area => {
      const match = prestamosPorDiaArea.find(p => p.fecha === fecha && p.area === area);
      row[area] = match ? match.cantidad : 0;
    });
    return row;
  });

  // Distribución por categoría (actualmente asignados)
  const distribucionPorCategoria = db.prepare(`
    SELECT cat.desc as categoria, COUNT(*) as cantidad
    FROM inventario inv
    JOIN estados e ON inv.id_estado = e.id
    LEFT JOIN categorias cat ON inv.id_categoria = cat.id
    WHERE e.desc = 'Asignado'
    GROUP BY cat.desc
    ORDER BY cantidad DESC
  `).all();

  // Items más prestados
  const itemsMasPrestados = db.prepare(`
    SELECT inv.id, cat.desc as categoria, inv.fabricante, inv.modelo, inv.serie, COUNT(p.id) as total_prestamos
    FROM inventario inv
    JOIN prestamos p ON inv.id = p.inventario_id
    LEFT JOIN categorias cat ON inv.id_categoria = cat.id
    GROUP BY inv.id
    HAVING total_prestamos > 0
    ORDER BY total_prestamos DESC
    LIMIT 5
  `).all();

  // Usuarios con más préstamos activos
  const usuariosPendientes = db.prepare(`
    SELECT u.id, u.nombre, u.apellido, ar.desc as area, COUNT(p.id) as prestamos_activos
    FROM usuarios u
    JOIN prestamos p ON u.id = p.usuario_id AND p.estado = 'Activo'
    LEFT JOIN areas ar ON u.id_area = ar.id
    GROUP BY u.id
    ORDER BY prestamos_activos DESC
    LIMIT 5
  `).all().map(u => {
    const prestamos = db.prepare("SELECT fecha_hora_prestamo FROM prestamos WHERE usuario_id = ? AND estado = 'Activo'").all(u.id);
    return {
      ...u,
      nombre_completo: `${u.nombre} ${u.apellido}`,
      dias_acumulados: prestamos.reduce((sum, p) => sum + getDiasTranscurridos(p.fecha_hora_prestamo), 0)
    };
  });

  res.json({
    success: true,
    data: {
      prestamos_por_dia_categoria,
      categorias_unicas: categoriasUnicas,
      prestamos_por_dia_area,
      areas_unicas: areasUnicas,
      distribucion_por_categoria: distribucionPorCategoria,
      items_mas_prestados: itemsMasPrestados,
      usuarios_pendientes: usuariosPendientes
    }
  });
});

module.exports = router;
