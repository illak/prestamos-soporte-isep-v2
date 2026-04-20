const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { getDb } = require('../database');

// GET /api/tipos
router.get('/', (req, res) => {
  const db = getDb();
  const activo = req.query.activo;
  let where = '1=1';
  if (activo === undefined || activo === '1') where = 'activo = 1';
  else if (activo === '0') where = 'activo = 0';

  const tipos = db.prepare(`
    SELECT t.*, (SELECT COUNT(*) FROM inventario WHERE id_tipo = t.id) as cantidad_items
    FROM tipos t WHERE ${where} ORDER BY t.desc ASC
  `).all();
  res.json({ success: true, data: tipos });
});

// GET /api/tipos/:id
router.get('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const tipo = db.prepare('SELECT * FROM tipos WHERE id = ?').get(req.params.id);
  if (!tipo) return res.status(404).json({ success: false, error: 'Tipo no encontrado' });
  res.json({ success: true, data: tipo });
});

// POST /api/tipos
router.post('/', [body('desc').trim().notEmpty().withMessage('Descripción requerida')], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const { desc } = req.body;
  const existe = db.prepare('SELECT id FROM tipos WHERE LOWER(desc) = LOWER(?)').get(desc.trim());
  if (existe) return res.status(400).json({ success: false, error: 'Ya existe un tipo con ese nombre' });

  try {
    const result = db.prepare('INSERT INTO tipos (desc) VALUES (?)').run(desc.trim());
    res.status(201).json({ success: true, data: db.prepare('SELECT * FROM tipos WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear tipo' });
  }
});

// PUT /api/tipos/:id
router.put('/:id', [param('id').isInt(), body('desc').trim().notEmpty()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const { desc, activo } = req.body;
  const id = req.params.id;

  const tipo = db.prepare('SELECT * FROM tipos WHERE id = ?').get(id);
  if (!tipo) return res.status(404).json({ success: false, error: 'Tipo no encontrado' });

  const existe = db.prepare('SELECT id FROM tipos WHERE LOWER(desc) = LOWER(?) AND id != ?').get(desc.trim(), id);
  if (existe) return res.status(400).json({ success: false, error: 'Ya existe otro tipo con ese nombre' });

  db.prepare('UPDATE tipos SET desc = ?, activo = ? WHERE id = ?')
    .run(desc.trim(), activo !== undefined ? (activo ? 1 : 0) : tipo.activo, id);
  res.json({ success: true, data: db.prepare('SELECT * FROM tipos WHERE id = ?').get(id) });
});

// DELETE /api/tipos/:id
router.delete('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const id = req.params.id;
  const tipo = db.prepare('SELECT * FROM tipos WHERE id = ?').get(id);
  if (!tipo) return res.status(404).json({ success: false, error: 'Tipo no encontrado' });

  const count = db.prepare('SELECT COUNT(*) as count FROM inventario WHERE id_tipo = ?').get(id);
  if (count.count > 0) {
    return res.status(400).json({ success: false, error: `No se puede eliminar el tipo porque tiene ${count.count} item(s) asociado(s).` });
  }

  db.prepare('DELETE FROM tipos WHERE id = ?').run(id);
  res.json({ success: true, message: 'Tipo eliminado correctamente' });
});

module.exports = router;
