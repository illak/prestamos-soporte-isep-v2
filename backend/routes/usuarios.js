const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { getDb } = require('../database');

const upload = multer({ storage: multer.memoryStorage() });

// Validaciones comunes
const usuarioValidations = [
  body('mail').isEmail().withMessage('Email inválido'),
  body('nombre').trim().notEmpty().withMessage('Nombre requerido')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('Nombre solo puede contener letras'),
  body('apellido').trim().notEmpty().withMessage('Apellido requerido')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('Apellido solo puede contener letras'),
  body('dni').trim().notEmpty().withMessage('DNI requerido')
    .matches(/^\d+$/).withMessage('DNI debe contener solo números'),
  body('area_equipo').trim().notEmpty().withMessage('Área/Equipo requerido'),
  body('rol').isIn(['usuario', 'soporte_it']).withMessage('Rol inválido')
];

// GET /api/usuarios - Listar usuarios con filtros y paginación
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('busqueda').optional().trim(),
  query('activo').optional().isIn(['0', '1', 'todos']),
  query('area').optional().trim(),
  query('rol').optional().isIn(['usuario', 'soporte_it', 'todos']),
  query('orderBy').optional().isIn(['nombre', 'apellido', 'dni', 'area_equipo', 'fecha_creacion']),
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
  const busqueda = req.query.busqueda || '';
  const activo = req.query.activo || '1';
  const area = req.query.area || '';
  const rol = req.query.rol || 'todos';
  const orderBy = req.query.orderBy || 'apellido';
  const order = req.query.order || 'asc';

  let whereClause = '1=1';
  const params = [];

  if (activo !== 'todos') {
    whereClause += ' AND activo = ?';
    params.push(activo === '1' ? 1 : 0);
  }

  if (busqueda) {
    whereClause += ' AND (nombre LIKE ? OR apellido LIKE ? OR dni LIKE ? OR mail LIKE ?)';
    const searchTerm = `%${busqueda}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (area) {
    whereClause += ' AND area_equipo = ?';
    params.push(area);
  }

  if (rol !== 'todos') {
    whereClause += ' AND rol = ?';
    params.push(rol);
  }

  // Contar total
  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM usuarios WHERE ${whereClause}`);
  const { total } = countStmt.get(...params);

  // Obtener usuarios
  const stmt = db.prepare(`
    SELECT * FROM usuarios
    WHERE ${whereClause}
    ORDER BY ${orderBy} ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `);
  const usuarios = stmt.all(...params, limit, offset);

  res.json({
    success: true,
    data: usuarios,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// GET /api/usuarios/soporte-it - Obtener solo usuarios con rol soporte_it activos
router.get('/soporte-it', (req, res) => {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, nombre, apellido, mail
    FROM usuarios
    WHERE rol = 'soporte_it' AND activo = 1
    ORDER BY apellido, nombre
  `);
  const usuarios = stmt.all();
  res.json({ success: true, data: usuarios });
});

// GET /api/usuarios/areas - Obtener lista de áreas únicas
router.get('/areas', (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT DISTINCT area_equipo FROM usuarios WHERE activo = 1 ORDER BY area_equipo');
  const areas = stmt.all().map(row => row.area_equipo);
  res.json({ success: true, data: areas });
});

// GET /api/usuarios/export - Exportar usuarios a CSV
router.get('/export', (req, res) => {
  const db = getDb();
  const incluirInactivos = req.query.incluirInactivos === '1';

  let whereClause = incluirInactivos ? '1=1' : 'activo = 1';
  const stmt = db.prepare(`SELECT mail, nombre, apellido, dni, area_equipo, rol FROM usuarios WHERE ${whereClause} ORDER BY apellido, nombre`);
  const usuarios = stmt.all();

  const csv = stringify(usuarios, {
    header: true,
    columns: ['mail', 'nombre', 'apellido', 'dni', 'area_equipo', 'rol']
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=usuarios.csv');
  res.send('\ufeff' + csv); // BOM para Excel
});

// GET /api/usuarios/:id - Obtener un usuario
router.get('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const stmt = db.prepare('SELECT * FROM usuarios WHERE id = ?');
  const usuario = stmt.get(req.params.id);

  if (!usuario) {
    return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
  }

  res.json({ success: true, data: usuario });
});

// POST /api/usuarios - Crear usuario
router.post('/', usuarioValidations, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const { mail, nombre, apellido, dni, area_equipo, rol } = req.body;

  // Verificar duplicados
  const existeMail = db.prepare('SELECT id FROM usuarios WHERE mail = ?').get(mail);
  if (existeMail) {
    return res.status(400).json({ success: false, error: 'El email ya está registrado' });
  }

  const existeDni = db.prepare('SELECT id FROM usuarios WHERE dni = ?').get(dni);
  if (existeDni) {
    return res.status(400).json({ success: false, error: 'El DNI ya está registrado' });
  }

  const stmt = db.prepare(`
    INSERT INTO usuarios (mail, nombre, apellido, dni, area_equipo, rol)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  try {
    const result = stmt.run(mail, nombre.trim(), apellido.trim(), dni.trim(), area_equipo.trim(), rol);
    const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: usuario });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear usuario' });
  }
});

// POST /api/usuarios/import - Importar usuarios desde CSV
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No se proporcionó archivo' });
  }

  const modoConflicto = req.body.modoConflicto || 'saltar'; // saltar, actualizar, cancelar

  try {
    const contenido = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, ''); // Remover BOM
    const registros = parse(contenido, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const db = getDb();
    const errores = [];
    const procesados = [];
    const saltados = [];

    for (let i = 0; i < registros.length; i++) {
      const linea = i + 2; // +2 por header y 0-index
      const reg = registros[i];

      // Validaciones
      if (!reg.mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reg.mail)) {
        errores.push({ linea, error: 'Email inválido', datos: reg });
        continue;
      }
      if (!reg.nombre || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(reg.nombre)) {
        errores.push({ linea, error: 'Nombre inválido', datos: reg });
        continue;
      }
      if (!reg.apellido || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(reg.apellido)) {
        errores.push({ linea, error: 'Apellido inválido', datos: reg });
        continue;
      }
      if (!reg.dni || !/^\d+$/.test(reg.dni)) {
        errores.push({ linea, error: 'DNI inválido', datos: reg });
        continue;
      }
      if (!reg.area_equipo) {
        errores.push({ linea, error: 'Área/Equipo requerido', datos: reg });
        continue;
      }
      if (!reg.rol || !['usuario', 'soporte_it'].includes(reg.rol)) {
        errores.push({ linea, error: 'Rol inválido (debe ser "usuario" o "soporte_it")', datos: reg });
        continue;
      }

      // Verificar duplicados
      const existeMail = db.prepare('SELECT id FROM usuarios WHERE mail = ?').get(reg.mail);
      const existeDni = db.prepare('SELECT id FROM usuarios WHERE dni = ?').get(reg.dni);

      if (existeMail || existeDni) {
        if (modoConflicto === 'cancelar') {
          return res.status(400).json({
            success: false,
            error: 'Importación cancelada por duplicados',
            detalle: { linea, mail: reg.mail, dni: reg.dni }
          });
        } else if (modoConflicto === 'saltar') {
          saltados.push({ linea, motivo: existeMail ? 'Email duplicado' : 'DNI duplicado', datos: reg });
          continue;
        } else if (modoConflicto === 'actualizar' && existeMail) {
          const updateStmt = db.prepare(`
            UPDATE usuarios SET nombre = ?, apellido = ?, dni = ?, area_equipo = ?, rol = ?, fecha_modificacion = CURRENT_TIMESTAMP
            WHERE mail = ?
          `);
          try {
            updateStmt.run(reg.nombre, reg.apellido, reg.dni, reg.area_equipo, reg.rol, reg.mail);
            procesados.push({ linea, accion: 'actualizado', datos: reg });
          } catch (err) {
            errores.push({ linea, error: 'Error al actualizar: ' + err.message, datos: reg });
          }
          continue;
        }
      }

      // Insertar nuevo
      const insertStmt = db.prepare(`
        INSERT INTO usuarios (mail, nombre, apellido, dni, area_equipo, rol)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      try {
        insertStmt.run(reg.mail, reg.nombre, reg.apellido, reg.dni, reg.area_equipo, reg.rol);
        procesados.push({ linea, accion: 'creado', datos: reg });
      } catch (err) {
        errores.push({ linea, error: 'Error al insertar: ' + err.message, datos: reg });
      }
    }

    res.json({
      success: true,
      resumen: {
        total: registros.length,
        procesados: procesados.length,
        saltados: saltados.length,
        errores: errores.length
      },
      detalles: { procesados, saltados, errores }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: 'Error al procesar CSV: ' + err.message });
  }
});

// PUT /api/usuarios/:id - Actualizar usuario
router.put('/:id', [param('id').isInt(), ...usuarioValidations], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const { mail, nombre, apellido, dni, area_equipo, rol } = req.body;
  const id = req.params.id;

  // Verificar que existe
  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!usuario) {
    return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
  }

  // Verificar duplicados excluyendo el registro actual
  const existeMail = db.prepare('SELECT id FROM usuarios WHERE mail = ? AND id != ?').get(mail, id);
  if (existeMail) {
    return res.status(400).json({ success: false, error: 'El email ya está registrado' });
  }

  const existeDni = db.prepare('SELECT id FROM usuarios WHERE dni = ? AND id != ?').get(dni, id);
  if (existeDni) {
    return res.status(400).json({ success: false, error: 'El DNI ya está registrado' });
  }

  const stmt = db.prepare(`
    UPDATE usuarios
    SET mail = ?, nombre = ?, apellido = ?, dni = ?, area_equipo = ?, rol = ?, fecha_modificacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  try {
    stmt.run(mail, nombre.trim(), apellido.trim(), dni.trim(), area_equipo.trim(), rol, id);
    const usuarioActualizado = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
    res.json({ success: true, data: usuarioActualizado });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al actualizar usuario' });
  }
});

// DELETE /api/usuarios/:id - Soft delete de usuario
router.delete('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const id = req.params.id;

  // Verificar que existe
  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!usuario) {
    return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
  }

  // Verificar préstamos activos
  const prestamosActivos = db.prepare(`
    SELECT COUNT(*) as count FROM prestamos
    WHERE (usuario_id = ? OR usuario_it_id = ?) AND estado = 'Activo'
  `).get(id, id);

  if (prestamosActivos.count > 0) {
    return res.status(400).json({
      success: false,
      error: 'No se puede desactivar el usuario porque tiene préstamos activos'
    });
  }

  // Verificar si es el último soporte_it activo
  if (usuario.rol === 'soporte_it') {
    const otrosSoporte = db.prepare(`
      SELECT COUNT(*) as count FROM usuarios
      WHERE rol = 'soporte_it' AND activo = 1 AND id != ?
    `).get(id);

    if (otrosSoporte.count === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede desactivar el último usuario con rol Soporte IT'
      });
    }
  }

  // Soft delete
  const stmt = db.prepare('UPDATE usuarios SET activo = 0, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(id);

  res.json({ success: true, message: 'Usuario desactivado correctamente' });
});

// PUT /api/usuarios/:id/restaurar - Restaurar usuario
router.put('/:id/restaurar', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const id = req.params.id;

  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!usuario) {
    return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
  }

  const stmt = db.prepare('UPDATE usuarios SET activo = 1, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(id);

  const usuarioRestaurado = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  res.json({ success: true, data: usuarioRestaurado });
});

module.exports = router;
