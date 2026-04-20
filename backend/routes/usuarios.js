const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { getDb } = require('../database');

const upload = multer({ storage: multer.memoryStorage() });

const usuarioValidations = [
  body('mail').isEmail().withMessage('Email inválido'),
  body('nombre').trim().notEmpty().withMessage('Nombre requerido')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('Nombre solo puede contener letras'),
  body('apellido').trim().notEmpty().withMessage('Apellido requerido')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('Apellido solo puede contener letras'),
  body('dni').trim().notEmpty().withMessage('DNI requerido')
    .matches(/^\d+$/).withMessage('DNI debe contener solo números'),
  body('id_area').optional().isInt({ min: 1 }),
  body('rol').isIn(['usuario', 'soporte_it']).withMessage('Rol inválido')
];

// GET /api/usuarios
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('busqueda').optional().trim(),
  query('activo').optional().isIn(['0', '1', 'todos']),
  query('id_area').optional().isInt(),
  query('rol').optional().isIn(['usuario', 'soporte_it', 'todos']),
  query('orderBy').optional().isIn(['nombre', 'apellido', 'dni', 'fecha_creacion']),
  query('order').optional().isIn(['asc', 'desc'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const busqueda = req.query.busqueda || '';
  const activo = req.query.activo || '1';
  const idArea = req.query.id_area || '';
  const rol = req.query.rol || 'todos';
  const orderBy = req.query.orderBy || 'apellido';
  const order = req.query.order || 'asc';

  let whereClause = '1=1';
  const params = [];

  if (activo !== 'todos') { whereClause += ' AND u.activo = ?'; params.push(activo === '1' ? 1 : 0); }
  if (busqueda) {
    whereClause += ' AND (u.nombre LIKE ? OR u.apellido LIKE ? OR u.dni LIKE ? OR u.mail LIKE ?)';
    const s = `%${busqueda}%`;
    params.push(s, s, s, s);
  }
  if (idArea) { whereClause += ' AND u.id_area = ?'; params.push(idArea); }
  if (rol !== 'todos') { whereClause += ' AND u.rol = ?'; params.push(rol); }

  const { total } = db.prepare(`SELECT COUNT(*) as total FROM usuarios u WHERE ${whereClause}`).get(...params);

  const stmt = db.prepare(`
    SELECT u.*, a.desc as area_desc
    FROM usuarios u
    LEFT JOIN areas a ON u.id_area = a.id
    WHERE ${whereClause}
    ORDER BY u.${orderBy} ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `);

  res.json({
    success: true,
    data: stmt.all(...params, limit, offset),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

// GET /api/usuarios/soporte-it
router.get('/soporte-it', (req, res) => {
  const db = getDb();
  const usuarios = db.prepare(`
    SELECT id, nombre, apellido, mail FROM usuarios
    WHERE rol = 'soporte_it' AND activo = 1
    ORDER BY apellido, nombre
  `).all();
  res.json({ success: true, data: usuarios });
});

// GET /api/usuarios/areas - Obtener áreas desde tabla areas
router.get('/areas', (req, res) => {
  const db = getDb();
  const areas = db.prepare('SELECT id, desc FROM areas WHERE activo = 1 ORDER BY desc').all();
  res.json({ success: true, data: areas });
});

// GET /api/usuarios/export
router.get('/export', (req, res) => {
  const db = getDb();
  const incluirInactivos = req.query.incluirInactivos === '1';
  const whereClause = incluirInactivos ? '1=1' : 'u.activo = 1';

  const usuarios = db.prepare(`
    SELECT u.mail, u.nombre, u.apellido, u.dni, a.desc as area, u.rol
    FROM usuarios u
    LEFT JOIN areas a ON u.id_area = a.id
    WHERE ${whereClause}
    ORDER BY u.apellido, u.nombre
  `).all();

  const csv = stringify(usuarios, {
    header: true,
    columns: ['mail', 'nombre', 'apellido', 'dni', 'area', 'rol']
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=usuarios.csv');
  res.send('\ufeff' + csv);
});

// GET /api/usuarios/:id
router.get('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const usuario = db.prepare(`
    SELECT u.*, a.desc as area_desc
    FROM usuarios u LEFT JOIN areas a ON u.id_area = a.id
    WHERE u.id = ?
  `).get(req.params.id);

  if (!usuario) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
  res.json({ success: true, data: usuario });
});

// POST /api/usuarios
router.post('/', usuarioValidations, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const { mail, nombre, apellido, dni, id_area, rol } = req.body;

  const existeMail = db.prepare('SELECT id FROM usuarios WHERE mail = ?').get(mail);
  if (existeMail) return res.status(400).json({ success: false, error: 'El email ya está registrado' });

  const existeDni = db.prepare('SELECT id FROM usuarios WHERE dni = ?').get(dni);
  if (existeDni) return res.status(400).json({ success: false, error: 'El DNI ya está registrado' });

  if (id_area) {
    const areaExiste = db.prepare('SELECT id FROM areas WHERE id = ?').get(id_area);
    if (!areaExiste) return res.status(400).json({ success: false, error: 'Área no encontrada' });
  }

  try {
    const result = db.prepare('INSERT INTO usuarios (mail, nombre, apellido, dni, id_area, rol) VALUES (?, ?, ?, ?, ?, ?)')
      .run(mail, nombre.trim(), apellido.trim(), dni.trim(), id_area || null, rol);
    const usuario = db.prepare('SELECT u.*, a.desc as area_desc FROM usuarios u LEFT JOIN areas a ON u.id_area = a.id WHERE u.id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: usuario });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear usuario' });
  }
});

// POST /api/usuarios/import
router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No se proporcionó archivo' });

  const modoConflicto = req.body.modoConflicto || 'saltar';

  try {
    const contenido = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const registros = parse(contenido, { columns: true, skip_empty_lines: true, trim: true });

    const db = getDb();
    const errores = [], procesados = [], saltados = [];

    for (let i = 0; i < registros.length; i++) {
      const linea = i + 2;
      const reg = registros[i];

      if (!reg.mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reg.mail)) { errores.push({ linea, error: 'Email inválido', datos: reg }); continue; }
      if (!reg.nombre || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(reg.nombre)) { errores.push({ linea, error: 'Nombre inválido', datos: reg }); continue; }
      if (!reg.apellido || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(reg.apellido)) { errores.push({ linea, error: 'Apellido inválido', datos: reg }); continue; }
      if (!reg.dni || !/^\d+$/.test(reg.dni)) { errores.push({ linea, error: 'DNI inválido', datos: reg }); continue; }
      if (!reg.rol || !['usuario', 'soporte_it'].includes(reg.rol)) { errores.push({ linea, error: 'Rol inválido', datos: reg }); continue; }

      // Buscar id_area por desc si viene el campo area
      let idArea = null;
      if (reg.area) {
        const area = db.prepare('SELECT id FROM areas WHERE LOWER(desc) = LOWER(?)').get(reg.area);
        if (!area) { errores.push({ linea, error: `Área "${reg.area}" no encontrada`, datos: reg }); continue; }
        idArea = area.id;
      }

      const existeMail = db.prepare('SELECT id FROM usuarios WHERE mail = ?').get(reg.mail);
      const existeDni = db.prepare('SELECT id FROM usuarios WHERE dni = ?').get(reg.dni);

      if (existeMail || existeDni) {
        if (modoConflicto === 'cancelar') {
          return res.status(400).json({ success: false, error: 'Importación cancelada por duplicados', detalle: { linea, mail: reg.mail, dni: reg.dni } });
        } else if (modoConflicto === 'saltar') {
          saltados.push({ linea, motivo: existeMail ? 'Email duplicado' : 'DNI duplicado', datos: reg }); continue;
        } else if (modoConflicto === 'actualizar' && existeMail) {
          try {
            db.prepare('UPDATE usuarios SET nombre = ?, apellido = ?, dni = ?, id_area = ?, rol = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE mail = ?')
              .run(reg.nombre, reg.apellido, reg.dni, idArea, reg.rol, reg.mail);
            procesados.push({ linea, accion: 'actualizado', datos: reg }); continue;
          } catch (err) { errores.push({ linea, error: err.message, datos: reg }); continue; }
        }
      }

      try {
        db.prepare('INSERT INTO usuarios (mail, nombre, apellido, dni, id_area, rol) VALUES (?, ?, ?, ?, ?, ?)')
          .run(reg.mail, reg.nombre, reg.apellido, reg.dni, idArea, reg.rol);
        procesados.push({ linea, accion: 'creado', datos: reg });
      } catch (err) { errores.push({ linea, error: err.message, datos: reg }); }
    }

    res.json({
      success: true,
      resumen: { total: registros.length, procesados: procesados.length, saltados: saltados.length, errores: errores.length },
      detalles: { procesados, saltados, errores }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: 'Error al procesar CSV: ' + err.message });
  }
});

// PUT /api/usuarios/:id
router.put('/:id', [param('id').isInt(), ...usuarioValidations], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const { mail, nombre, apellido, dni, id_area, rol } = req.body;
  const id = req.params.id;

  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!usuario) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

  const existeMail = db.prepare('SELECT id FROM usuarios WHERE mail = ? AND id != ?').get(mail, id);
  if (existeMail) return res.status(400).json({ success: false, error: 'El email ya está registrado' });

  const existeDni = db.prepare('SELECT id FROM usuarios WHERE dni = ? AND id != ?').get(dni, id);
  if (existeDni) return res.status(400).json({ success: false, error: 'El DNI ya está registrado' });

  if (id_area) {
    const areaExiste = db.prepare('SELECT id FROM areas WHERE id = ?').get(id_area);
    if (!areaExiste) return res.status(400).json({ success: false, error: 'Área no encontrada' });
  }

  try {
    db.prepare('UPDATE usuarios SET mail = ?, nombre = ?, apellido = ?, dni = ?, id_area = ?, rol = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?')
      .run(mail, nombre.trim(), apellido.trim(), dni.trim(), id_area || null, rol, id);
    const updated = db.prepare('SELECT u.*, a.desc as area_desc FROM usuarios u LEFT JOIN areas a ON u.id_area = a.id WHERE u.id = ?').get(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al actualizar usuario' });
  }
});

// DELETE /api/usuarios/:id (soft delete)
router.delete('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const id = req.params.id;
  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!usuario) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

  const prestamosActivos = db.prepare("SELECT COUNT(*) as count FROM prestamos WHERE (usuario_id = ? OR usuario_it_id = ?) AND estado = 'Activo'").get(id, id);
  if (prestamosActivos.count > 0) {
    return res.status(400).json({ success: false, error: 'No se puede desactivar el usuario porque tiene préstamos activos' });
  }

  if (usuario.rol === 'soporte_it') {
    const otrosSoporte = db.prepare("SELECT COUNT(*) as count FROM usuarios WHERE rol = 'soporte_it' AND activo = 1 AND id != ?").get(id);
    if (otrosSoporte.count === 0) {
      return res.status(400).json({ success: false, error: 'No se puede desactivar el último usuario con rol Soporte IT' });
    }
  }

  db.prepare('UPDATE usuarios SET activo = 0, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  res.json({ success: true, message: 'Usuario desactivado correctamente' });
});

// PUT /api/usuarios/:id/restaurar
router.put('/:id/restaurar', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const id = req.params.id;
  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!usuario) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

  db.prepare('UPDATE usuarios SET activo = 1, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  const updated = db.prepare('SELECT u.*, a.desc as area_desc FROM usuarios u LEFT JOIN areas a ON u.id_area = a.id WHERE u.id = ?').get(id);
  res.json({ success: true, data: updated });
});

module.exports = router;
