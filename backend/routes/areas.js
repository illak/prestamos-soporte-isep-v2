const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { getDb } = require('../database');

// GET /api/areas
router.get('/', (req, res) => {
  const db = getDb();
  const activo = req.query.activo;
  let where = '1=1';
  if (activo === undefined || activo === '1') where = 'activo = 1';
  else if (activo === '0') where = 'activo = 0';

  const areas = db.prepare(`
    SELECT a.*, (SELECT COUNT(*) FROM usuarios WHERE id_area = a.id AND activo = 1) as cantidad_usuarios
    FROM areas a WHERE ${where} ORDER BY a.desc ASC
  `).all();
  res.json({ success: true, data: areas });
});

// GET /api/areas/:id
router.get('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const area = db.prepare('SELECT * FROM areas WHERE id = ?').get(req.params.id);
  if (!area) return res.status(404).json({ success: false, error: 'Área no encontrada' });
  res.json({ success: true, data: area });
});

// POST /api/areas
router.post('/', [body('desc').trim().notEmpty().withMessage('Descripción requerida')], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const { desc } = req.body;

  const existe = db.prepare('SELECT id FROM areas WHERE LOWER(desc) = LOWER(?)').get(desc.trim());
  if (existe) return res.status(400).json({ success: false, error: 'Ya existe un área con ese nombre' });

  try {
    const result = db.prepare('INSERT INTO areas (desc) VALUES (?)').run(desc.trim());
    res.status(201).json({ success: true, data: db.prepare('SELECT * FROM areas WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear área' });
  }
});

// PUT /api/areas/:id
router.put('/:id', [param('id').isInt(), body('desc').trim().notEmpty()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const { desc, activo } = req.body;
  const id = req.params.id;

  const area = db.prepare('SELECT * FROM areas WHERE id = ?').get(id);
  if (!area) return res.status(404).json({ success: false, error: 'Área no encontrada' });

  const existe = db.prepare('SELECT id FROM areas WHERE LOWER(desc) = LOWER(?) AND id != ?').get(desc.trim(), id);
  if (existe) return res.status(400).json({ success: false, error: 'Ya existe otra área con ese nombre' });

  db.prepare('UPDATE areas SET desc = ?, activo = ? WHERE id = ?')
    .run(desc.trim(), activo !== undefined ? (activo ? 1 : 0) : area.activo, id);
  res.json({ success: true, data: db.prepare('SELECT * FROM areas WHERE id = ?').get(id) });
});

// DELETE /api/areas/:id
router.delete('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const id = req.params.id;
  const area = db.prepare('SELECT * FROM areas WHERE id = ?').get(id);
  if (!area) return res.status(404).json({ success: false, error: 'Área no encontrada' });

  const count = db.prepare('SELECT COUNT(*) as count FROM usuarios WHERE id_area = ?').get(id);
  if (count.count > 0) {
    return res.status(400).json({ success: false, error: `No se puede eliminar el área porque tiene ${count.count} usuario(s) asociado(s).` });
  }

  db.prepare('DELETE FROM areas WHERE id = ?').run(id);
  res.json({ success: true, message: 'Área eliminada correctamente' });
});

module.exports = router;
