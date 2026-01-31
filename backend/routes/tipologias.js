const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { getDb } = require('../database');

// Validaciones comunes
const tipologiaValidations = [
  body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
  body('descripcion').optional().trim()
];

// GET /api/tipologias - Listar tipologías
router.get('/', [
  query('activo').optional().isIn(['0', '1', 'true', 'false']),
  query('busqueda').optional().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const busqueda = req.query.busqueda || '';
  let activo = req.query.activo;

  let whereClause = '1=1';
  const params = [];

  // Por defecto mostrar solo activos, a menos que se especifique
  if (activo === undefined || activo === '1' || activo === 'true') {
    whereClause += ' AND activo = 1';
  } else if (activo === '0' || activo === 'false') {
    whereClause += ' AND activo = 0';
  }
  // Si activo es 'all' no se filtra

  if (busqueda) {
    whereClause += ' AND (nombre LIKE ? OR descripcion LIKE ?)';
    const searchTerm = `%${busqueda}%`;
    params.push(searchTerm, searchTerm);
  }

  // Obtener tipologías con conteo de insumos
  const stmt = db.prepare(`
    SELECT
      t.*,
      (SELECT COUNT(*) FROM insumos WHERE tipologia = t.nombre) as cantidad_insumos,
      (SELECT COUNT(*) FROM insumos WHERE tipologia = t.nombre AND estado = 'Disponible') as cantidad_disponibles,
      (SELECT COUNT(*) FROM insumos WHERE tipologia = t.nombre AND estado = 'En préstamo') as cantidad_prestados
    FROM tipologias t
    WHERE ${whereClause}
    ORDER BY t.nombre ASC
  `);

  const tipologias = stmt.all(...params);
  res.json({ success: true, data: tipologias });
});

// GET /api/tipologias/nombres - Obtener solo nombres (para selects)
router.get('/nombres', (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT nombre FROM tipologias WHERE activo = 1 ORDER BY nombre ASC');
  const tipologias = stmt.all().map(t => t.nombre);
  res.json({ success: true, data: tipologias });
});

// GET /api/tipologias/:id - Obtener una tipología
router.get('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const tipologia = db.prepare(`
    SELECT
      t.*,
      (SELECT COUNT(*) FROM insumos WHERE tipologia = t.nombre) as cantidad_insumos
    FROM tipologias t
    WHERE t.id = ?
  `).get(req.params.id);

  if (!tipologia) {
    return res.status(404).json({ success: false, error: 'Tipología no encontrada' });
  }

  res.json({ success: true, data: tipologia });
});

// GET /api/tipologias/:id/insumos - Obtener insumos de una tipología
router.get('/:id/insumos', [
  param('id').isInt(),
  query('estado').optional().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const id = req.params.id;
  const estado = req.query.estado || '';

  // Obtener la tipología
  const tipologia = db.prepare('SELECT * FROM tipologias WHERE id = ?').get(id);
  if (!tipologia) {
    return res.status(404).json({ success: false, error: 'Tipología no encontrada' });
  }

  let whereClause = 'tipologia = ?';
  const params = [tipologia.nombre];

  if (estado) {
    whereClause += ' AND estado = ?';
    params.push(estado);
  }

  const stmt = db.prepare(`
    SELECT * FROM insumos
    WHERE ${whereClause}
    ORDER BY nombre ASC
  `);

  const insumos = stmt.all(...params);
  res.json({ success: true, data: { tipologia, insumos } });
});

// POST /api/tipologias - Crear tipología
router.post('/', tipologiaValidations, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const { nombre, descripcion } = req.body;

  // Verificar nombre único
  const existe = db.prepare('SELECT id FROM tipologias WHERE LOWER(nombre) = LOWER(?)').get(nombre.trim());
  if (existe) {
    return res.status(400).json({ success: false, error: 'Ya existe una tipología con ese nombre' });
  }

  const stmt = db.prepare(`
    INSERT INTO tipologias (nombre, descripcion)
    VALUES (?, ?)
  `);

  try {
    const result = stmt.run(nombre.trim(), descripcion?.trim() || null);
    const tipologia = db.prepare('SELECT * FROM tipologias WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: tipologia });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear tipología' });
  }
});

// PUT /api/tipologias/:id - Actualizar tipología
router.put('/:id', [param('id').isInt(), ...tipologiaValidations], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const { nombre, descripcion, activo } = req.body;
  const id = req.params.id;

  // Verificar que existe
  const tipologia = db.prepare('SELECT * FROM tipologias WHERE id = ?').get(id);
  if (!tipologia) {
    return res.status(404).json({ success: false, error: 'Tipología no encontrada' });
  }

  // Verificar nombre único excluyendo el actual
  const existe = db.prepare('SELECT id FROM tipologias WHERE LOWER(nombre) = LOWER(?) AND id != ?').get(nombre.trim(), id);
  if (existe) {
    return res.status(400).json({ success: false, error: 'Ya existe otra tipología con ese nombre' });
  }

  const nombreAnterior = tipologia.nombre;
  const nuevoNombre = nombre.trim();

  // Si el nombre cambió, actualizar los insumos que usan esta tipología
  if (nombreAnterior !== nuevoNombre) {
    const updateInsumos = db.prepare('UPDATE insumos SET tipologia = ? WHERE tipologia = ?');
    updateInsumos.run(nuevoNombre, nombreAnterior);
  }

  const stmt = db.prepare(`
    UPDATE tipologias
    SET nombre = ?, descripcion = ?, activo = ?, fecha_modificacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  try {
    stmt.run(
      nuevoNombre,
      descripcion?.trim() || null,
      activo !== undefined ? (activo ? 1 : 0) : tipologia.activo,
      id
    );
    const tipologiaActualizada = db.prepare(`
      SELECT
        t.*,
        (SELECT COUNT(*) FROM insumos WHERE tipologia = t.nombre) as cantidad_insumos
      FROM tipologias t
      WHERE t.id = ?
    `).get(id);
    res.json({ success: true, data: tipologiaActualizada });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al actualizar tipología' });
  }
});

// PUT /api/tipologias/:id/toggle - Activar/Desactivar tipología
router.put('/:id/toggle', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const id = req.params.id;

  const tipologia = db.prepare('SELECT * FROM tipologias WHERE id = ?').get(id);
  if (!tipologia) {
    return res.status(404).json({ success: false, error: 'Tipología no encontrada' });
  }

  const nuevoEstado = tipologia.activo ? 0 : 1;
  const stmt = db.prepare('UPDATE tipologias SET activo = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(nuevoEstado, id);

  const tipologiaActualizada = db.prepare('SELECT * FROM tipologias WHERE id = ?').get(id);
  res.json({
    success: true,
    data: tipologiaActualizada,
    message: nuevoEstado ? 'Tipología activada' : 'Tipología desactivada'
  });
});

// DELETE /api/tipologias/:id - Eliminar tipología
router.delete('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const id = req.params.id;

  const tipologia = db.prepare('SELECT * FROM tipologias WHERE id = ?').get(id);
  if (!tipologia) {
    return res.status(404).json({ success: false, error: 'Tipología no encontrada' });
  }

  // Verificar si tiene insumos asociados
  const insumos = db.prepare('SELECT COUNT(*) as count FROM insumos WHERE tipologia = ?').get(tipologia.nombre);
  if (insumos.count > 0) {
    return res.status(400).json({
      success: false,
      error: `No se puede eliminar la tipología porque tiene ${insumos.count} insumo(s) asociado(s). Puede desactivarla en su lugar.`,
      cantidad_insumos: insumos.count,
      sugerencia: 'desactivar'
    });
  }

  // Hard delete si no tiene insumos
  const stmt = db.prepare('DELETE FROM tipologias WHERE id = ?');
  stmt.run(id);

  res.json({ success: true, message: 'Tipología eliminada correctamente' });
});

module.exports = router;
