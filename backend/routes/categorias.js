const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { getDb } = require('../database');

const categoriaValidations = [
  body('desc').trim().notEmpty().withMessage('Descripción requerida')
];

// GET /api/categorias
router.get('/', [
  query('activo').optional(),
  query('busqueda').optional().trim()
], (req, res) => {
  const db = getDb();
  const busqueda = req.query.busqueda || '';
  let activo = req.query.activo;

  let whereClause = '1=1';
  const params = [];

  if (activo === undefined || activo === '1' || activo === 'true') {
    whereClause += ' AND c.activo = 1';
  } else if (activo === '0' || activo === 'false') {
    whereClause += ' AND c.activo = 0';
  }

  if (busqueda) {
    whereClause += ' AND c.desc LIKE ?';
    params.push(`%${busqueda}%`);
  }

  const stmt = db.prepare(`
    SELECT
      c.*,
      (SELECT COUNT(*) FROM inventario WHERE id_categoria = c.id) as cantidad_items,
      (SELECT COUNT(*) FROM inventario inv JOIN estados e ON inv.id_estado = e.id WHERE inv.id_categoria = c.id AND e.desc = 'Disponible') as cantidad_disponibles,
      (SELECT COUNT(*) FROM inventario inv JOIN estados e ON inv.id_estado = e.id WHERE inv.id_categoria = c.id AND e.desc = 'Asignado') as cantidad_asignados
    FROM categorias c
    WHERE ${whereClause}
    ORDER BY c.desc ASC
  `);

  res.json({ success: true, data: stmt.all(...params) });
});

// GET /api/categorias/nombres
router.get('/nombres', (req, res) => {
  const db = getDb();
  const categorias = db.prepare('SELECT id, desc FROM categorias WHERE activo = 1 ORDER BY desc ASC').all();
  res.json({ success: true, data: categorias });
});

// GET /api/categorias/:id
router.get('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const cat = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM inventario WHERE id_categoria = c.id) as cantidad_items
    FROM categorias c WHERE c.id = ?
  `).get(req.params.id);

  if (!cat) return res.status(404).json({ success: false, error: 'Categoría no encontrada' });
  res.json({ success: true, data: cat });
});

// GET /api/categorias/:id/inventario
router.get('/:id/inventario', [param('id').isInt(), query('id_estado').optional().isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const id = req.params.id;
  const cat = db.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
  if (!cat) return res.status(404).json({ success: false, error: 'Categoría no encontrada' });

  let whereClause = 'inv.id_categoria = ?';
  const params = [id];
  if (req.query.id_estado) { whereClause += ' AND inv.id_estado = ?'; params.push(req.query.id_estado); }

  const items = db.prepare(`
    SELECT inv.*, e.desc as estado_desc
    FROM inventario inv
    LEFT JOIN estados e ON inv.id_estado = e.id
    WHERE ${whereClause}
    ORDER BY inv.fabricante, inv.modelo
  `).all(...params);

  res.json({ success: true, data: { categoria: cat, items } });
});

// POST /api/categorias
router.post('/', categoriaValidations, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const { desc } = req.body;

  const existe = db.prepare('SELECT id FROM categorias WHERE LOWER(desc) = LOWER(?)').get(desc.trim());
  if (existe) return res.status(400).json({ success: false, error: 'Ya existe una categoría con ese nombre' });

  try {
    const result = db.prepare('INSERT INTO categorias (desc) VALUES (?)').run(desc.trim());
    const cat = db.prepare('SELECT * FROM categorias WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: cat });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear categoría' });
  }
});

// PUT /api/categorias/:id
router.put('/:id', [param('id').isInt(), ...categoriaValidations], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const { desc, activo } = req.body;
  const id = req.params.id;

  const cat = db.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
  if (!cat) return res.status(404).json({ success: false, error: 'Categoría no encontrada' });

  const existe = db.prepare('SELECT id FROM categorias WHERE LOWER(desc) = LOWER(?) AND id != ?').get(desc.trim(), id);
  if (existe) return res.status(400).json({ success: false, error: 'Ya existe otra categoría con ese nombre' });

  try {
    db.prepare('UPDATE categorias SET desc = ?, activo = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?')
      .run(desc.trim(), activo !== undefined ? (activo ? 1 : 0) : cat.activo, id);
    const updated = db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM inventario WHERE id_categoria = c.id) as cantidad_items
      FROM categorias c WHERE c.id = ?
    `).get(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al actualizar categoría' });
  }
});

// PUT /api/categorias/:id/toggle
router.put('/:id/toggle', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const id = req.params.id;
  const cat = db.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
  if (!cat) return res.status(404).json({ success: false, error: 'Categoría no encontrada' });

  const nuevoEstado = cat.activo ? 0 : 1;
  db.prepare('UPDATE categorias SET activo = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?').run(nuevoEstado, id);
  const updated = db.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
  res.json({ success: true, data: updated, message: nuevoEstado ? 'Categoría activada' : 'Categoría desactivada' });
});

// DELETE /api/categorias/:id
router.delete('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const id = req.params.id;
  const cat = db.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
  if (!cat) return res.status(404).json({ success: false, error: 'Categoría no encontrada' });

  const count = db.prepare('SELECT COUNT(*) as count FROM inventario WHERE id_categoria = ?').get(id);
  if (count.count > 0) {
    return res.status(400).json({
      success: false,
      error: `No se puede eliminar la categoría porque tiene ${count.count} item(s) asociado(s). Puede desactivarla.`,
      sugerencia: 'desactivar'
    });
  }

  db.prepare('DELETE FROM categorias WHERE id = ?').run(id);
  res.json({ success: true, message: 'Categoría eliminada correctamente' });
});

module.exports = router;
