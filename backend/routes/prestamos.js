const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { stringify } = require('csv-stringify/sync');
const { getDb } = require('../database');
const { getDiasTranscurridos, getEstadoVisual, formatearFechaArg } = require('../utils/helpers');

function getEstadoId(db, desc) {
  const e = db.prepare('SELECT id FROM estados WHERE desc = ?').get(desc);
  return e ? e.id : null;
}

const BASE_PRESTAMO_SELECT = `
  SELECT
    p.*,
    u.nombre as usuario_nombre,
    u.apellido as usuario_apellido,
    u.dni as usuario_dni,
    ar.desc as usuario_area,
    cat.desc as inventario_categoria,
    inv.fabricante as inventario_fabricante,
    inv.modelo as inventario_modelo,
    inv.serie as inventario_serie,
    it.nombre as it_nombre,
    it.apellido as it_apellido
  FROM prestamos p
  JOIN usuarios u ON p.usuario_id = u.id
  LEFT JOIN areas ar ON u.id_area = ar.id
  JOIN inventario inv ON p.inventario_id = inv.id
  LEFT JOIN categorias cat ON inv.id_categoria = cat.id
  JOIN usuarios it ON p.usuario_it_id = it.id
`;

function formatPrestamo(p) {
  const diasTranscurridos = p.estado === 'Activo' ? getDiasTranscurridos(p.fecha_hora_prestamo) : null;
  let duracionDias = null;
  if (p.fecha_hora_devolucion_real) {
    const inicio = new Date(p.fecha_hora_prestamo);
    const fin = new Date(p.fecha_hora_devolucion_real);
    duracionDias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
    if (duracionDias === 0) duracionDias = 1;
  }
  const nombre = `${p.inventario_fabricante || ''} ${p.inventario_modelo || ''}`.trim();
  return {
    ...p,
    usuario_nombre_completo: `${p.usuario_nombre} ${p.usuario_apellido}`,
    inventario_descripcion: `${p.inventario_categoria || ''} - ${nombre}`.trim().replace(/^- /, ''),
    it_nombre_completo: `${p.it_nombre} ${p.it_apellido}`,
    dias_transcurridos: diasTranscurridos,
    duracion_dias: duracionDias,
    estado_visual: diasTranscurridos !== null ? getEstadoVisual(diasTranscurridos) : null
  };
}

// GET /api/prestamos
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('estado').optional().isIn(['Activo', 'Devuelto', 'todos']),
  query('usuario_id').optional().isInt(),
  query('id_categoria').optional().isInt(),
  query('dias_min').optional().isInt({ min: 0 }),
  query('dias_max').optional().isInt({ min: 0 }),
  query('usuario_it_id').optional().isInt(),
  query('fecha_desde').optional().isISO8601(),
  query('fecha_hasta').optional().isISO8601(),
  query('orderBy').optional().isIn(['fecha_hora_prestamo', 'dias_transcurridos', 'estado']),
  query('order').optional().isIn(['asc', 'desc'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const estado = req.query.estado || 'todos';
  const usuarioId = req.query.usuario_id;
  const idCategoria = req.query.id_categoria;
  const diasMin = req.query.dias_min !== undefined ? parseInt(req.query.dias_min) : null;
  const diasMax = req.query.dias_max !== undefined ? parseInt(req.query.dias_max) : null;
  const usuarioItId = req.query.usuario_it_id;
  const fechaDesde = req.query.fecha_desde;
  const fechaHasta = req.query.fecha_hasta;
  const orderBy = req.query.orderBy || 'fecha_hora_prestamo';
  const order = req.query.order || 'desc';

  let whereClause = '1=1';
  const params = [];

  if (estado !== 'todos') { whereClause += ' AND p.estado = ?'; params.push(estado); }
  if (usuarioId) { whereClause += ' AND p.usuario_id = ?'; params.push(usuarioId); }
  if (idCategoria) { whereClause += ' AND inv.id_categoria = ?'; params.push(idCategoria); }
  if (usuarioItId) { whereClause += ' AND p.usuario_it_id = ?'; params.push(usuarioItId); }
  if (fechaDesde) { whereClause += ' AND p.fecha_hora_prestamo >= ?'; params.push(fechaDesde); }
  if (fechaHasta) { whereClause += ' AND p.fecha_hora_prestamo <= ?'; params.push(fechaHasta); }

  const { total } = db.prepare(`
    SELECT COUNT(*) as total FROM prestamos p
    JOIN inventario inv ON p.inventario_id = inv.id
    WHERE ${whereClause}
  `).get(...params);

  const stmt = db.prepare(`
    ${BASE_PRESTAMO_SELECT}
    WHERE ${whereClause}
    ORDER BY
      CASE WHEN p.estado = 'Activo' THEN 0 ELSE 1 END,
      p.${orderBy === 'dias_transcurridos' ? 'fecha_hora_prestamo' : orderBy} ${orderBy === 'dias_transcurridos' ? 'ASC' : order.toUpperCase()}
    LIMIT ? OFFSET ?
  `);

  let prestamos = stmt.all(...params, limit, offset).map(formatPrestamo);

  if (diasMin !== null || diasMax !== null) {
    prestamos = prestamos.filter(p => {
      if (p.estado !== 'Activo') return true;
      if (diasMin !== null && p.dias_transcurridos < diasMin) return false;
      if (diasMax !== null && p.dias_transcurridos > diasMax) return false;
      return true;
    });
  }

  res.json({
    success: true,
    data: prestamos,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

// GET /api/prestamos/export
router.get('/export', (req, res) => {
  const db = getDb();
  const estado = req.query.estado || 'todos';
  const fechaDesde = req.query.fecha_desde;
  const fechaHasta = req.query.fecha_hasta;

  let whereClause = '1=1';
  const params = [];
  if (estado !== 'todos') { whereClause += ' AND p.estado = ?'; params.push(estado); }
  if (fechaDesde) { whereClause += ' AND p.fecha_hora_prestamo >= ?'; params.push(fechaDesde); }
  if (fechaHasta) { whereClause += ' AND p.fecha_hora_prestamo <= ?'; params.push(fechaHasta); }

  const stmt = db.prepare(`
    SELECT
      p.id,
      u.nombre || ' ' || u.apellido as usuario_nombre_completo,
      u.dni as usuario_dni,
      ar.desc as usuario_area,
      cat.desc as inventario_categoria,
      inv.fabricante as inventario_fabricante,
      inv.modelo as inventario_modelo,
      inv.serie as inventario_serie,
      p.fecha_hora_prestamo,
      p.fecha_hora_devolucion_real,
      p.estado,
      it.nombre || ' ' || it.apellido as responsable_it,
      p.observaciones_prestamo,
      p.observaciones_devolucion
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    LEFT JOIN areas ar ON u.id_area = ar.id
    JOIN inventario inv ON p.inventario_id = inv.id
    LEFT JOIN categorias cat ON inv.id_categoria = cat.id
    JOIN usuarios it ON p.usuario_it_id = it.id
    WHERE ${whereClause}
    ORDER BY p.fecha_hora_prestamo DESC
  `);

  const prestamos = stmt.all(...params).map(p => ({
    ...p,
    fecha_hora_prestamo: formatearFechaArg(p.fecha_hora_prestamo),
    fecha_hora_devolucion_real: p.fecha_hora_devolucion_real ? formatearFechaArg(p.fecha_hora_devolucion_real) : ''
  }));

  const csv = stringify(prestamos, {
    header: true,
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'usuario_nombre_completo', header: 'Usuario' },
      { key: 'usuario_dni', header: 'DNI' },
      { key: 'usuario_area', header: 'Área' },
      { key: 'inventario_categoria', header: 'Categoría' },
      { key: 'inventario_fabricante', header: 'Fabricante' },
      { key: 'inventario_modelo', header: 'Modelo' },
      { key: 'inventario_serie', header: 'N° Serie' },
      { key: 'fecha_hora_prestamo', header: 'Fecha Préstamo' },
      { key: 'fecha_hora_devolucion_real', header: 'Fecha Devolución' },
      { key: 'estado', header: 'Estado' },
      { key: 'responsable_it', header: 'Responsable IT' },
      { key: 'observaciones_prestamo', header: 'Obs. Préstamo' },
      { key: 'observaciones_devolucion', header: 'Obs. Devolución' }
    ]
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=prestamos.csv');
  res.send('\ufeff' + csv);
});

// GET /api/prestamos/:id
router.get('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const stmt = db.prepare(`
    SELECT
      p.*,
      u.nombre as usuario_nombre, u.apellido as usuario_apellido,
      u.dni as usuario_dni, u.mail as usuario_mail,
      ar.desc as usuario_area,
      cat.desc as inventario_categoria,
      inv.fabricante as inventario_fabricante,
      inv.modelo as inventario_modelo,
      inv.serie as inventario_serie,
      inv.notas as inventario_notas,
      it.nombre as it_nombre, it.apellido as it_apellido
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    LEFT JOIN areas ar ON u.id_area = ar.id
    JOIN inventario inv ON p.inventario_id = inv.id
    LEFT JOIN categorias cat ON inv.id_categoria = cat.id
    JOIN usuarios it ON p.usuario_it_id = it.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!stmt) return res.status(404).json({ success: false, error: 'Préstamo no encontrado' });

  const diasTranscurridos = stmt.estado === 'Activo' ? getDiasTranscurridos(stmt.fecha_hora_prestamo) : null;
  let duracionDias = null;
  if (stmt.fecha_hora_devolucion_real) {
    duracionDias = Math.ceil((new Date(stmt.fecha_hora_devolucion_real) - new Date(stmt.fecha_hora_prestamo)) / (1000 * 60 * 60 * 24));
  }
  const nombre = `${stmt.inventario_fabricante || ''} ${stmt.inventario_modelo || ''}`.trim();

  res.json({
    success: true,
    data: {
      ...stmt,
      usuario_nombre_completo: `${stmt.usuario_nombre} ${stmt.usuario_apellido}`,
      inventario_completo: `${stmt.inventario_categoria || ''} - ${nombre}`.trim().replace(/^- /, ''),
      it_nombre_completo: `${stmt.it_nombre} ${stmt.it_apellido}`,
      dias_transcurridos: diasTranscurridos,
      duracion_dias: duracionDias,
      estado_visual: diasTranscurridos !== null ? getEstadoVisual(diasTranscurridos) : null
    }
  });
});

// POST /api/prestamos
router.post('/', [
  body('usuario_id').isInt().withMessage('Usuario requerido'),
  body('inventario_id').isInt().withMessage('Item de inventario requerido'),
  body('usuario_it_id').isInt().withMessage('Responsable IT requerido'),
  body('fecha_hora_prestamo').optional().isISO8601(),
  body('observaciones_prestamo').optional().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const { usuario_id, inventario_id, usuario_it_id, fecha_hora_prestamo, observaciones_prestamo } = req.body;
  const fechaPrestamo = fecha_hora_prestamo || new Date().toISOString();

  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ? AND activo = 1').get(usuario_id);
  if (!usuario) return res.status(400).json({ success: false, error: 'Usuario no encontrado o inactivo' });

  const item = db.prepare('SELECT inv.*, e.desc as estado_desc FROM inventario inv JOIN estados e ON inv.id_estado = e.id WHERE inv.id = ?').get(inventario_id);
  if (!item) return res.status(400).json({ success: false, error: 'Item de inventario no encontrado' });
  if (item.condicion !== 'Entregable') return res.status(400).json({ success: false, error: 'Solo se pueden prestar items con condición "Entregable"' });
  if (item.estado_desc !== 'Disponible') return res.status(400).json({ success: false, error: `El item no está disponible (estado actual: ${item.estado_desc})` });

  const usuarioIt = db.prepare("SELECT * FROM usuarios WHERE id = ? AND activo = 1 AND rol = 'soporte_it'").get(usuario_it_id);
  if (!usuarioIt) return res.status(400).json({ success: false, error: 'Responsable IT no encontrado, inactivo o sin permisos' });

  const estadoAsigId = getEstadoId(db, 'Asignado');

  const insertPrestamo = db.prepare(`
    INSERT INTO prestamos (usuario_id, inventario_id, usuario_it_id, fecha_hora_prestamo, estado, observaciones_prestamo)
    VALUES (?, ?, ?, ?, 'Activo', ?)
  `);
  const updateInventario = db.prepare('UPDATE inventario SET id_estado = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?');

  const transaction = db.transaction(() => {
    const result = insertPrestamo.run(usuario_id, inventario_id, usuario_it_id, fechaPrestamo, observaciones_prestamo || null);
    updateInventario.run(estadoAsigId, inventario_id);
    return result.lastInsertRowid;
  });

  try {
    const prestamoId = transaction();
    const prestamo = db.prepare(`${BASE_PRESTAMO_SELECT} WHERE p.id = ?`).get(prestamoId);
    res.status(201).json({ success: true, data: { ...formatPrestamo(prestamo), dias_transcurridos: 0, estado_visual: getEstadoVisual(0) } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear préstamo: ' + err.message });
  }
});

// PUT /api/prestamos/:id
router.put('/:id', [
  param('id').isInt(),
  body('usuario_it_id').optional().isInt(),
  body('fecha_hora_prestamo').optional().isISO8601(),
  body('observaciones_prestamo').optional().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const id = req.params.id;
  const { usuario_it_id, fecha_hora_prestamo, observaciones_prestamo } = req.body;

  const prestamo = db.prepare('SELECT * FROM prestamos WHERE id = ?').get(id);
  if (!prestamo) return res.status(404).json({ success: false, error: 'Préstamo no encontrado' });
  if (prestamo.estado !== 'Activo') return res.status(400).json({ success: false, error: 'Solo se pueden editar préstamos activos' });

  if (usuario_it_id) {
    const usuarioIt = db.prepare("SELECT * FROM usuarios WHERE id = ? AND activo = 1 AND rol = 'soporte_it'").get(usuario_it_id);
    if (!usuarioIt) return res.status(400).json({ success: false, error: 'Responsable IT no encontrado, inactivo o sin permisos' });
  }

  db.prepare(`
    UPDATE prestamos
    SET usuario_it_id = COALESCE(?, usuario_it_id),
        fecha_hora_prestamo = COALESCE(?, fecha_hora_prestamo),
        observaciones_prestamo = COALESCE(?, observaciones_prestamo),
        fecha_modificacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(usuario_it_id || null, fecha_hora_prestamo || null, observaciones_prestamo, id);

  const updated = db.prepare(`${BASE_PRESTAMO_SELECT} WHERE p.id = ?`).get(id);
  res.json({ success: true, data: formatPrestamo(updated) });
});

// PUT /api/prestamos/:id/devolver
router.put('/:id/devolver', [
  param('id').isInt(),
  body('fecha_hora_devolucion').optional().isISO8601(),
  body('observaciones_devolucion').optional().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const id = req.params.id;
  const { fecha_hora_devolucion, observaciones_devolucion } = req.body;
  const fechaDevolucion = fecha_hora_devolucion || new Date().toISOString();

  const prestamo = db.prepare('SELECT * FROM prestamos WHERE id = ?').get(id);
  if (!prestamo) return res.status(404).json({ success: false, error: 'Préstamo no encontrado' });
  if (prestamo.estado !== 'Activo') return res.status(400).json({ success: false, error: 'El préstamo ya fue devuelto' });

  const estadoDispId = getEstadoId(db, 'Disponible');

  const updatePrestamo = db.prepare(`
    UPDATE prestamos
    SET estado = 'Devuelto', fecha_hora_devolucion_real = ?, observaciones_devolucion = ?, fecha_modificacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  const updateInventario = db.prepare('UPDATE inventario SET id_estado = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?');

  const transaction = db.transaction(() => {
    updatePrestamo.run(fechaDevolucion, observaciones_devolucion || null, id);
    updateInventario.run(estadoDispId, prestamo.inventario_id);
  });

  try {
    transaction();
    const devuelto = db.prepare(`${BASE_PRESTAMO_SELECT} WHERE p.id = ?`).get(id);
    const inicio = new Date(devuelto.fecha_hora_prestamo);
    const fin = new Date(devuelto.fecha_hora_devolucion_real);
    const duracionDias = Math.max(1, Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      data: { ...formatPrestamo(devuelto), duracion_dias: duracionDias },
      message: `Préstamo devuelto correctamente. Duración: ${duracionDias} día(s)`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al registrar devolución: ' + err.message });
  }
});

module.exports = router;
