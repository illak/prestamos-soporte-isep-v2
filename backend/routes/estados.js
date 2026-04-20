const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { getDb } = require('../database');

// GET /api/estados
router.get('/', (req, res) => {
  const db = getDb();
  const activo = req.query.activo;
  let where = '1=1';
  if (activo === undefined || activo === '1') where = 'activo = 1';
  else if (activo === '0') where = 'activo = 0';

  const estados = db.prepare(`
    SELECT e.*, (SELECT COUNT(*) FROM inventario WHERE id_estado = e.id) as cantidad_items
    FROM estados e WHERE ${where} ORDER BY e.desc ASC
  `).all();
  res.json({ success: true, data: estados });
});

// GET /api/estados/:id
router.get('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const estado = db.prepare('SELECT * FROM estados WHERE id = ?').get(req.params.id);
  if (!estado) return res.status(404).json({ success: false, error: 'Estado no encontrado' });
  res.json({ success: true, data: estado });
});

// POST /api/estados
router.post('/', [body('desc').trim().notEmpty().withMessage('Descripción requerida')], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const { desc } = req.body;
  const existe = db.prepare('SELECT id FROM estados WHERE LOWER(desc) = LOWER(?)').get(desc.trim());
  if (existe) return res.status(400).json({ success: false, error: 'Ya existe un estado con ese nombre' });

  try {
    const result = db.prepare('INSERT INTO estados (desc) VALUES (?)').run(desc.trim());
    res.status(201).json({ success: true, data: db.prepare('SELECT * FROM estados WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear estado' });
  }
});

// PUT /api/estados/:id
router.put('/:id', [param('id').isInt(), body('desc').trim().notEmpty()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const { desc, activo } = req.body;
  const id = req.params.id;

  const estado = db.prepare('SELECT * FROM estados WHERE id = ?').get(id);
  if (!estado) return res.status(404).json({ success: false, error: 'Estado no encontrado' });

  const existe = db.prepare('SELECT id FROM estados WHERE LOWER(desc) = LOWER(?) AND id != ?').get(desc.trim(), id);
  if (existe) return res.status(400).json({ success: false, error: 'Ya existe otro estado con ese nombre' });

  db.prepare('UPDATE estados SET desc = ?, activo = ? WHERE id = ?')
    .run(desc.trim(), activo !== undefined ? (activo ? 1 : 0) : estado.activo, id);
  res.json({ success: true, data: db.prepare('SELECT * FROM estados WHERE id = ?').get(id) });
});

// DELETE /api/estados/:id
router.delete('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const id = req.params.id;
  const estado = db.prepare('SELECT * FROM estados WHERE id = ?').get(id);
  if (!estado) return res.status(404).json({ success: false, error: 'Estado no encontrado' });

  const count = db.prepare('SELECT COUNT(*) as count FROM inventario WHERE id_estado = ?').get(id);
  if (count.count > 0) {
    return res.status(400).json({ success: false, error: `No se puede eliminar el estado porque tiene ${count.count} item(s) asociado(s).` });
  }

  db.prepare('DELETE FROM estados WHERE id = ?').run(id);
  res.json({ success: true, message: 'Estado eliminado correctamente' });
});

module.exports = router;
