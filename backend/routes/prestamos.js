const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { stringify } = require('csv-stringify/sync');
const { getDb } = require('../database');
const { getDiasTranscurridos, getEstadoVisual, formatearFechaArg } = require('../utils/helpers');

// GET /api/prestamos - Listar préstamos con filtros y paginación
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('estado').optional().isIn(['Activo', 'Devuelto', 'todos']),
  query('usuario_id').optional().isInt(),
  query('tipologia').optional().trim(),
  query('dias_min').optional().isInt({ min: 0 }),
  query('dias_max').optional().isInt({ min: 0 }),
  query('usuario_it_id').optional().isInt(),
  query('fecha_desde').optional().isISO8601(),
  query('fecha_hasta').optional().isISO8601(),
  query('orderBy').optional().isIn(['fecha_hora_prestamo', 'dias_transcurridos', 'estado']),
  query('order').optional().isIn(['asc', 'desc'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const estado = req.query.estado || 'todos';
  const usuarioId = req.query.usuario_id;
  const tipologia = req.query.tipologia;
  const diasMin = req.query.dias_min !== undefined ? parseInt(req.query.dias_min) : null;
  const diasMax = req.query.dias_max !== undefined ? parseInt(req.query.dias_max) : null;
  const usuarioItId = req.query.usuario_it_id;
  const fechaDesde = req.query.fecha_desde;
  const fechaHasta = req.query.fecha_hasta;
  const orderBy = req.query.orderBy || 'fecha_hora_prestamo';
  const order = req.query.order || 'desc';

  let whereClause = '1=1';
  const params = [];

  if (estado !== 'todos') {
    whereClause += ' AND p.estado = ?';
    params.push(estado);
  }

  if (usuarioId) {
    whereClause += ' AND p.usuario_id = ?';
    params.push(usuarioId);
  }

  if (tipologia) {
    whereClause += ' AND i.tipologia = ?';
    params.push(tipologia);
  }

  if (usuarioItId) {
    whereClause += ' AND p.usuario_it_id = ?';
    params.push(usuarioItId);
  }

  if (fechaDesde) {
    whereClause += ' AND p.fecha_hora_prestamo >= ?';
    params.push(fechaDesde);
  }

  if (fechaHasta) {
    whereClause += ' AND p.fecha_hora_prestamo <= ?';
    params.push(fechaHasta);
  }

  // Contar total (sin filtro de días, se aplica después)
  const countStmt = db.prepare(`
    SELECT COUNT(*) as total
    FROM prestamos p
    JOIN insumos i ON p.insumo_id = i.id
    WHERE ${whereClause}
  `);
  const { total } = countStmt.get(...params);

  // Obtener préstamos
  const stmt = db.prepare(`
    SELECT
      p.*,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido,
      u.dni as usuario_dni,
      u.area_equipo as usuario_area,
      i.tipologia as insumo_tipologia,
      i.nombre as insumo_nombre,
      i.numero_serie as insumo_numero_serie,
      it.nombre as it_nombre,
      it.apellido as it_apellido
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    JOIN insumos i ON p.insumo_id = i.id
    JOIN usuarios it ON p.usuario_it_id = it.id
    WHERE ${whereClause}
    ORDER BY
      CASE WHEN p.estado = 'Activo' THEN 0 ELSE 1 END,
      p.${orderBy === 'dias_transcurridos' ? 'fecha_hora_prestamo' : orderBy} ${orderBy === 'dias_transcurridos' ? 'ASC' : order.toUpperCase()}
    LIMIT ? OFFSET ?
  `);

  let prestamos = stmt.all(...params, limit, offset).map(p => {
    const diasTranscurridos = p.estado === 'Activo'
      ? getDiasTranscurridos(p.fecha_hora_prestamo)
      : null;

    let duracionDias = null;
    if (p.fecha_hora_devolucion_real) {
      const inicio = new Date(p.fecha_hora_prestamo);
      const fin = new Date(p.fecha_hora_devolucion_real);
      duracionDias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
      if (duracionDias === 0) duracionDias = 1; // Mínimo 1 día
    }

    return {
      ...p,
      usuario_nombre_completo: `${p.usuario_nombre} ${p.usuario_apellido}`,
      insumo_descripcion: `${p.insumo_tipologia} - ${p.insumo_nombre}`,
      it_nombre_completo: `${p.it_nombre} ${p.it_apellido}`,
      dias_transcurridos: diasTranscurridos,
      duracion_dias: duracionDias,
      estado_visual: diasTranscurridos !== null ? getEstadoVisual(diasTranscurridos) : null
    };
  });

  // Filtrar por días transcurridos si se especificó (solo para activos)
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
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// GET /api/prestamos/export - Exportar préstamos a CSV
router.get('/export', (req, res) => {
  const db = getDb();
  const estado = req.query.estado || 'todos';
  const fechaDesde = req.query.fecha_desde;
  const fechaHasta = req.query.fecha_hasta;

  let whereClause = '1=1';
  const params = [];

  if (estado !== 'todos') {
    whereClause += ' AND p.estado = ?';
    params.push(estado);
  }

  if (fechaDesde) {
    whereClause += ' AND p.fecha_hora_prestamo >= ?';
    params.push(fechaDesde);
  }

  if (fechaHasta) {
    whereClause += ' AND p.fecha_hora_prestamo <= ?';
    params.push(fechaHasta);
  }

  const stmt = db.prepare(`
    SELECT
      p.id,
      u.nombre || ' ' || u.apellido as usuario_nombre_completo,
      u.dni as usuario_dni,
      u.area_equipo as usuario_area,
      i.tipologia as insumo_tipologia,
      i.nombre as insumo_nombre,
      i.numero_serie as insumo_numero_serie,
      p.fecha_hora_prestamo,
      p.fecha_hora_devolucion_real,
      p.estado,
      it.nombre || ' ' || it.apellido as responsable_it,
      p.observaciones_prestamo,
      p.observaciones_devolucion
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    JOIN insumos i ON p.insumo_id = i.id
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
      { key: 'insumo_tipologia', header: 'Tipología' },
      { key: 'insumo_nombre', header: 'Insumo' },
      { key: 'insumo_numero_serie', header: 'N° Serie' },
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

// GET /api/prestamos/:id - Obtener un préstamo
router.get('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const stmt = db.prepare(`
    SELECT
      p.*,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido,
      u.dni as usuario_dni,
      u.area_equipo as usuario_area,
      u.mail as usuario_mail,
      i.tipologia as insumo_tipologia,
      i.nombre as insumo_nombre,
      i.numero_serie as insumo_numero_serie,
      i.descripcion as insumo_descripcion,
      it.nombre as it_nombre,
      it.apellido as it_apellido
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    JOIN insumos i ON p.insumo_id = i.id
    JOIN usuarios it ON p.usuario_it_id = it.id
    WHERE p.id = ?
  `);

  const prestamo = stmt.get(req.params.id);

  if (!prestamo) {
    return res.status(404).json({ success: false, error: 'Préstamo no encontrado' });
  }

  const diasTranscurridos = prestamo.estado === 'Activo'
    ? getDiasTranscurridos(prestamo.fecha_hora_prestamo)
    : null;

  let duracionDias = null;
  if (prestamo.fecha_hora_devolucion_real) {
    const inicio = new Date(prestamo.fecha_hora_prestamo);
    const fin = new Date(prestamo.fecha_hora_devolucion_real);
    duracionDias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
  }

  res.json({
    success: true,
    data: {
      ...prestamo,
      usuario_nombre_completo: `${prestamo.usuario_nombre} ${prestamo.usuario_apellido}`,
      insumo_completo: `${prestamo.insumo_tipologia} - ${prestamo.insumo_nombre}`,
      it_nombre_completo: `${prestamo.it_nombre} ${prestamo.it_apellido}`,
      dias_transcurridos: diasTranscurridos,
      duracion_dias: duracionDias,
      estado_visual: diasTranscurridos !== null ? getEstadoVisual(diasTranscurridos) : null
    }
  });
});

// POST /api/prestamos - Crear préstamo
router.post('/', [
  body('usuario_id').isInt().withMessage('Usuario requerido'),
  body('insumo_id').isInt().withMessage('Insumo requerido'),
  body('usuario_it_id').isInt().withMessage('Responsable IT requerido'),
  body('fecha_hora_prestamo').optional().isISO8601().withMessage('Fecha inválida'),
  body('observaciones_prestamo').optional().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const { usuario_id, insumo_id, usuario_it_id, fecha_hora_prestamo, observaciones_prestamo } = req.body;
  const fechaPrestamo = fecha_hora_prestamo || new Date().toISOString();

  // Verificar usuario existe y está activo
  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ? AND activo = 1').get(usuario_id);
  if (!usuario) {
    return res.status(400).json({ success: false, error: 'Usuario no encontrado o inactivo' });
  }

  // Verificar insumo existe y está disponible
  const insumo = db.prepare('SELECT * FROM insumos WHERE id = ?').get(insumo_id);
  if (!insumo) {
    return res.status(400).json({ success: false, error: 'Insumo no encontrado' });
  }
  if (insumo.estado !== 'Disponible') {
    return res.status(400).json({ success: false, error: `El insumo no está disponible (estado actual: ${insumo.estado})` });
  }

  // Verificar usuario IT existe, está activo y tiene rol soporte_it
  const usuarioIt = db.prepare("SELECT * FROM usuarios WHERE id = ? AND activo = 1 AND rol = 'soporte_it'").get(usuario_it_id);
  if (!usuarioIt) {
    return res.status(400).json({ success: false, error: 'Responsable IT no encontrado, inactivo o sin permisos' });
  }

  // Crear préstamo y actualizar estado del insumo en una transacción
  const insertPrestamo = db.prepare(`
    INSERT INTO prestamos (usuario_id, insumo_id, usuario_it_id, fecha_hora_prestamo, estado, observaciones_prestamo)
    VALUES (?, ?, ?, ?, 'Activo', ?)
  `);

  const updateInsumo = db.prepare("UPDATE insumos SET estado = 'En préstamo', fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?");

  const transaction = db.transaction(() => {
    const result = insertPrestamo.run(usuario_id, insumo_id, usuario_it_id, fechaPrestamo, observaciones_prestamo || null);
    updateInsumo.run(insumo_id);
    return result.lastInsertRowid;
  });

  try {
    const prestamoId = transaction();

    // Obtener el préstamo creado con todos los datos
    const prestamo = db.prepare(`
      SELECT
        p.*,
        u.nombre as usuario_nombre,
        u.apellido as usuario_apellido,
        i.tipologia as insumo_tipologia,
        i.nombre as insumo_nombre,
        it.nombre as it_nombre,
        it.apellido as it_apellido
      FROM prestamos p
      JOIN usuarios u ON p.usuario_id = u.id
      JOIN insumos i ON p.insumo_id = i.id
      JOIN usuarios it ON p.usuario_it_id = it.id
      WHERE p.id = ?
    `).get(prestamoId);

    res.status(201).json({
      success: true,
      data: {
        ...prestamo,
        usuario_nombre_completo: `${prestamo.usuario_nombre} ${prestamo.usuario_apellido}`,
        insumo_descripcion: `${prestamo.insumo_tipologia} - ${prestamo.insumo_nombre}`,
        it_nombre_completo: `${prestamo.it_nombre} ${prestamo.it_apellido}`,
        dias_transcurridos: 0,
        estado_visual: getEstadoVisual(0)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear préstamo: ' + err.message });
  }
});

// PUT /api/prestamos/:id - Actualizar préstamo (solo activos)
router.put('/:id', [
  param('id').isInt(),
  body('usuario_it_id').optional().isInt(),
  body('fecha_hora_prestamo').optional().isISO8601(),
  body('observaciones_prestamo').optional().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const id = req.params.id;
  const { usuario_it_id, fecha_hora_prestamo, observaciones_prestamo } = req.body;

  // Verificar que existe y está activo
  const prestamo = db.prepare('SELECT * FROM prestamos WHERE id = ?').get(id);
  if (!prestamo) {
    return res.status(404).json({ success: false, error: 'Préstamo no encontrado' });
  }
  if (prestamo.estado !== 'Activo') {
    return res.status(400).json({ success: false, error: 'Solo se pueden editar préstamos activos' });
  }

  // Verificar usuario IT si se proporciona
  if (usuario_it_id) {
    const usuarioIt = db.prepare("SELECT * FROM usuarios WHERE id = ? AND activo = 1 AND rol = 'soporte_it'").get(usuario_it_id);
    if (!usuarioIt) {
      return res.status(400).json({ success: false, error: 'Responsable IT no encontrado, inactivo o sin permisos' });
    }
  }

  const stmt = db.prepare(`
    UPDATE prestamos
    SET
      usuario_it_id = COALESCE(?, usuario_it_id),
      fecha_hora_prestamo = COALESCE(?, fecha_hora_prestamo),
      observaciones_prestamo = COALESCE(?, observaciones_prestamo),
      fecha_modificacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(usuario_it_id || null, fecha_hora_prestamo || null, observaciones_prestamo, id);

  // Obtener préstamo actualizado
  const prestamoActualizado = db.prepare(`
    SELECT
      p.*,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido,
      i.tipologia as insumo_tipologia,
      i.nombre as insumo_nombre,
      it.nombre as it_nombre,
      it.apellido as it_apellido
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    JOIN insumos i ON p.insumo_id = i.id
    JOIN usuarios it ON p.usuario_it_id = it.id
    WHERE p.id = ?
  `).get(id);

  const diasTranscurridos = getDiasTranscurridos(prestamoActualizado.fecha_hora_prestamo);

  res.json({
    success: true,
    data: {
      ...prestamoActualizado,
      usuario_nombre_completo: `${prestamoActualizado.usuario_nombre} ${prestamoActualizado.usuario_apellido}`,
      insumo_descripcion: `${prestamoActualizado.insumo_tipologia} - ${prestamoActualizado.insumo_nombre}`,
      it_nombre_completo: `${prestamoActualizado.it_nombre} ${prestamoActualizado.it_apellido}`,
      dias_transcurridos: diasTranscurridos,
      estado_visual: getEstadoVisual(diasTranscurridos)
    }
  });
});

// PUT /api/prestamos/:id/devolver - Registrar devolución
router.put('/:id/devolver', [
  param('id').isInt(),
  body('fecha_hora_devolucion').optional().isISO8601(),
  body('observaciones_devolucion').optional().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const id = req.params.id;
  const { fecha_hora_devolucion, observaciones_devolucion } = req.body;
  const fechaDevolucion = fecha_hora_devolucion || new Date().toISOString();

  // Verificar que existe y está activo
  const prestamo = db.prepare('SELECT * FROM prestamos WHERE id = ?').get(id);
  if (!prestamo) {
    return res.status(404).json({ success: false, error: 'Préstamo no encontrado' });
  }
  if (prestamo.estado !== 'Activo') {
    return res.status(400).json({ success: false, error: 'El préstamo ya fue devuelto' });
  }

  // Actualizar préstamo y estado del insumo en una transacción
  const updatePrestamo = db.prepare(`
    UPDATE prestamos
    SET estado = 'Devuelto', fecha_hora_devolucion_real = ?, observaciones_devolucion = ?, fecha_modificacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const updateInsumo = db.prepare("UPDATE insumos SET estado = 'Disponible', fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?");

  const transaction = db.transaction(() => {
    updatePrestamo.run(fechaDevolucion, observaciones_devolucion || null, id);
    updateInsumo.run(prestamo.insumo_id);
  });

  try {
    transaction();

    // Obtener préstamo actualizado
    const prestamoDevuelto = db.prepare(`
      SELECT
        p.*,
        u.nombre as usuario_nombre,
        u.apellido as usuario_apellido,
        i.tipologia as insumo_tipologia,
        i.nombre as insumo_nombre,
        it.nombre as it_nombre,
        it.apellido as it_apellido
      FROM prestamos p
      JOIN usuarios u ON p.usuario_id = u.id
      JOIN insumos i ON p.insumo_id = i.id
      JOIN usuarios it ON p.usuario_it_id = it.id
      WHERE p.id = ?
    `).get(id);

    const inicio = new Date(prestamoDevuelto.fecha_hora_prestamo);
    const fin = new Date(prestamoDevuelto.fecha_hora_devolucion_real);
    const duracionDias = Math.max(1, Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      data: {
        ...prestamoDevuelto,
        usuario_nombre_completo: `${prestamoDevuelto.usuario_nombre} ${prestamoDevuelto.usuario_apellido}`,
        insumo_descripcion: `${prestamoDevuelto.insumo_tipologia} - ${prestamoDevuelto.insumo_nombre}`,
        it_nombre_completo: `${prestamoDevuelto.it_nombre} ${prestamoDevuelto.it_apellido}`,
        duracion_dias: duracionDias
      },
      message: `Préstamo devuelto correctamente. Duración: ${duracionDias} día(s)`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al registrar devolución: ' + err.message });
  }
});

module.exports = router;
