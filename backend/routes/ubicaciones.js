const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { getDb } = require('../database');

// GET /api/ubicaciones
router.get('/', (req, res) => {
  const db = getDb();
  const activo = req.query.activo;
  let where = '1=1';
  if (activo === undefined || activo === '1') where = 'activo = 1';
  else if (activo === '0') where = 'activo = 0';

  const ubicaciones = db.prepare(`
    SELECT u.*, (SELECT COUNT(*) FROM inventario WHERE id_ubicacion = u.id) as cantidad_items
    FROM ubicaciones u WHERE ${where} ORDER BY u.piso, u.desc ASC
  `).all();
  res.json({ success: true, data: ubicaciones });
});

// GET /api/ubicaciones/:id
router.get('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const ub = db.prepare('SELECT * FROM ubicaciones WHERE id = ?').get(req.params.id);
  if (!ub) return res.status(404).json({ success: false, error: 'Ubicación no encontrada' });
  res.json({ success: true, data: ub });
});

// POST /api/ubicaciones
router.post('/', [
  body('desc').trim().notEmpty().withMessage('Descripción requerida'),
  body('piso').optional().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const { desc, piso } = req.body;

  try {
    const result = db.prepare('INSERT INTO ubicaciones (desc, piso) VALUES (?, ?)').run(desc.trim(), piso?.trim() || null);
    res.status(201).json({ success: true, data: db.prepare('SELECT * FROM ubicaciones WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear ubicación' });
  }
});

// PUT /api/ubicaciones/:id
router.put('/:id', [
  param('id').isInt(),
  body('desc').trim().notEmpty(),
  body('piso').optional().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const { desc, piso, activo } = req.body;
  const id = req.params.id;

  const ub = db.prepare('SELECT * FROM ubicaciones WHERE id = ?').get(id);
  if (!ub) return res.status(404).json({ success: false, error: 'Ubicación no encontrada' });

  db.prepare('UPDATE ubicaciones SET desc = ?, piso = ?, activo = ? WHERE id = ?')
    .run(desc.trim(), piso?.trim() || null, activo !== undefined ? (activo ? 1 : 0) : ub.activo, id);
  res.json({ success: true, data: db.prepare('SELECT * FROM ubicaciones WHERE id = ?').get(id) });
});

// DELETE /api/ubicaciones/:id
router.delete('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const id = req.params.id;
  const ub = db.prepare('SELECT * FROM ubicaciones WHERE id = ?').get(id);
  if (!ub) return res.status(404).json({ success: false, error: 'Ubicación no encontrada' });

  const count = db.prepare('SELECT COUNT(*) as count FROM inventario WHERE id_ubicacion = ?').get(id);
  if (count.count > 0) {
    return res.status(400).json({ success: false, error: `No se puede eliminar la ubicación porque tiene ${count.count} item(s) asociado(s).` });
  }

  db.prepare('DELETE FROM ubicaciones WHERE id = ?').run(id);
  res.json({ success: true, message: 'Ubicación eliminada correctamente' });
});

module.exports = router;
