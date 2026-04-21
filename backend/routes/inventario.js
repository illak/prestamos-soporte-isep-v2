const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { getDb } = require('../database');
const { getDiasTranscurridos, getEstadoVisual } = require('../utils/helpers');

const upload = multer({ storage: multer.memoryStorage() });

function getEstadoId(db, desc) {
  const e = db.prepare('SELECT id FROM estados WHERE desc = ?').get(desc);
  return e ? e.id : null;
}

const BASE_SELECT = `
  SELECT
    inv.*,
    cat.desc as categoria_desc,
    t.desc as tipo_desc,
    e.desc as estado_desc,
    ub.desc as ubicacion_desc,
    ub.piso as ubicacion_piso,
    u.nombre as asignado_nombre,
    u.apellido as asignado_apellido
  FROM inventario inv
  LEFT JOIN categorias cat ON inv.id_categoria = cat.id
  LEFT JOIN tipos t ON inv.id_tipo = t.id
  LEFT JOIN estados e ON inv.id_estado = e.id
  LEFT JOIN ubicaciones ub ON inv.id_ubicacion = ub.id
  LEFT JOIN usuarios u ON inv.id_asignado = u.id
`;

const inventarioValidations = [
  body('id_categoria').isInt({ min: 1 }).withMessage('Categoría requerida'),
  body('id_tipo').optional({ nullable: true }).isInt({ min: 1 }),
  body('condicion').optional({ nullable: true }).isIn(['Entregable', 'Asignable']),
  body('fabricante').optional({ nullable: true }).trim(),
  body('modelo').optional({ nullable: true }).trim(),
  body('serie').optional({ nullable: true }).trim(),
  body('lbl_activo').optional({ nullable: true }).trim(),
  body('id_estado').optional({ nullable: true }).isInt({ min: 1 }),
  body('id_ubicacion').optional({ nullable: true }).isInt({ min: 1 }),
  body('notas').optional({ nullable: true }).trim()
];

// GET /api/inventario
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('busqueda').optional().trim(),
  query('id_categoria').optional().isInt(),
  query('id_tipo').optional().isInt(),
  query('id_estado').optional().trim(),
  query('condicion').optional().isIn(['Entregable', 'Asignable', 'todos']),
  query('orderBy').optional().isIn(['modelo', 'fabricante', 'categoria_desc', 'estado_desc', 'fecha_creacion']),
  query('order').optional().isIn(['asc', 'desc'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const busqueda = req.query.busqueda || '';
  const idCategoria = req.query.id_categoria || '';
  const idTipo = req.query.id_tipo || '';
  const idEstado = req.query.id_estado || '';
  const condicion = req.query.condicion || '';
  const orderBy = req.query.orderBy || 'fecha_creacion';
  const order = req.query.order || 'desc';

  let whereClause = '1=1';
  const params = [];

  if (busqueda) {
    whereClause += ' AND (inv.fabricante LIKE ? OR inv.modelo LIKE ? OR inv.serie LIKE ? OR inv.lbl_activo LIKE ?)';
    const s = `%${busqueda}%`;
    params.push(s, s, s, s);
  }
  if (idCategoria) { whereClause += ' AND inv.id_categoria = ?'; params.push(idCategoria); }
  if (idTipo) { whereClause += ' AND inv.id_tipo = ?'; params.push(idTipo); }
  if (idEstado) {
    const estados = idEstado.split(',').map(e => e.trim()).filter(Boolean);
    if (estados.length > 0) {
      whereClause += ` AND inv.id_estado IN (${estados.map(() => '?').join(',')})`;
      params.push(...estados);
    }
  }
  if (condicion && condicion !== 'todos') { whereClause += ' AND inv.condicion = ?'; params.push(condicion); }

  const { total } = db.prepare(`SELECT COUNT(*) as total FROM inventario inv WHERE ${whereClause}`).get(...params);

  const orderCol = ['categoria_desc', 'estado_desc'].includes(orderBy)
    ? orderBy
    : `inv.${orderBy}`;

  const stmt = db.prepare(`
    ${BASE_SELECT}
    LEFT JOIN prestamos p ON inv.id = p.inventario_id AND p.estado = 'Activo'
    LEFT JOIN usuarios pu ON p.usuario_id = pu.id
    WHERE ${whereClause}
    ORDER BY ${orderCol} ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `);

  // Re-query without prestamos join for cleaner data, then get active loan separately
  const stmtClean = db.prepare(`
    ${BASE_SELECT}
    WHERE ${whereClause}
    ORDER BY ${orderCol} ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `);

  const items = stmtClean.all(...params, limit, offset).map(item => {
    if (item.condicion === 'Entregable') {
      const prestamoActivo = db.prepare(`
        SELECT p.id, p.usuario_id, p.fecha_hora_prestamo,
          u.nombre as usuario_nombre, u.apellido as usuario_apellido
        FROM prestamos p JOIN usuarios u ON p.usuario_id = u.id
        WHERE p.inventario_id = ? AND p.estado = 'Activo'
      `).get(item.id);

      if (prestamoActivo) {
        const dias = getDiasTranscurridos(prestamoActivo.fecha_hora_prestamo);
        return {
          ...item,
          prestamo_activo: {
            id: prestamoActivo.id,
            usuario_id: prestamoActivo.usuario_id,
            usuario_nombre: `${prestamoActivo.usuario_nombre} ${prestamoActivo.usuario_apellido}`,
            fecha_hora_prestamo: prestamoActivo.fecha_hora_prestamo,
            dias_transcurridos: dias,
            estado_visual: getEstadoVisual(dias)
          }
        };
      }
    }
    return { ...item, prestamo_activo: null };
  });

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

// GET /api/inventario/disponibles - Solo items Entregables disponibles (para préstamos)
router.get('/disponibles', (req, res) => {
  const db = getDb();
  const busqueda = req.query.busqueda || '';
  const estadoDispId = getEstadoId(db, 'Disponible');

  let whereClause = "inv.condicion = 'Entregable' AND inv.id_estado = ?";
  const params = [estadoDispId];

  if (busqueda) {
    whereClause += ' AND (inv.fabricante LIKE ? OR inv.modelo LIKE ? OR inv.serie LIKE ? OR cat.desc LIKE ?)';
    const s = `%${busqueda}%`;
    params.push(s, s, s, s);
  }

  const stmt = db.prepare(`
    SELECT inv.id, cat.desc as categoria_desc, inv.fabricante, inv.modelo, inv.serie, inv.lbl_activo
    FROM inventario inv
    LEFT JOIN categorias cat ON inv.id_categoria = cat.id
    WHERE ${whereClause}
    ORDER BY cat.desc, inv.fabricante, inv.modelo
    LIMIT 50
  `);

  res.json({ success: true, data: stmt.all(...params) });
});

// GET /api/inventario/estados - Lista de estados desde la DB
router.get('/estados', (req, res) => {
  const db = getDb();
  const estados = db.prepare('SELECT * FROM estados WHERE activo = 1 ORDER BY desc').all();
  res.json({ success: true, data: estados });
});

// GET /api/inventario/export
router.get('/export', (req, res) => {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      cat.desc as categoria,
      t.desc as tipo,
      inv.condicion,
      inv.fabricante,
      inv.modelo,
      inv.serie,
      inv.lbl_activo,
      e.desc as estado,
      ub.desc as ubicacion,
      inv.notas
    FROM inventario inv
    LEFT JOIN categorias cat ON inv.id_categoria = cat.id
    LEFT JOIN tipos t ON inv.id_tipo = t.id
    LEFT JOIN estados e ON inv.id_estado = e.id
    LEFT JOIN ubicaciones ub ON inv.id_ubicacion = ub.id
    ORDER BY cat.desc, inv.fabricante, inv.modelo
  `);

  const csv = stringify(stmt.all(), {
    header: true,
    columns: ['categoria', 'tipo', 'condicion', 'fabricante', 'modelo', 'serie', 'lbl_activo', 'estado', 'ubicacion', 'notas']
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=inventario.csv');
  res.send('\ufeff' + csv);
});

// GET /api/inventario/:id
router.get('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const item = db.prepare(`${BASE_SELECT} WHERE inv.id = ?`).get(req.params.id);

  if (!item) return res.status(404).json({ success: false, error: 'Item no encontrado' });

  res.json({ success: true, data: item });
});

// GET /api/inventario/:id/historial
router.get('/:id/historial', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const id = req.params.id;

  const item = db.prepare(`${BASE_SELECT} WHERE inv.id = ?`).get(id);
  if (!item) return res.status(404).json({ success: false, error: 'Item no encontrado' });

  const prestamos = db.prepare(`
    SELECT
      p.*,
      u.nombre as usuario_nombre, u.apellido as usuario_apellido, u.dni as usuario_dni,
      ar.desc as usuario_area,
      it.nombre as it_nombre, it.apellido as it_apellido
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    LEFT JOIN areas ar ON u.id_area = ar.id
    JOIN usuarios it ON p.usuario_it_id = it.id
    WHERE p.inventario_id = ?
    ORDER BY p.fecha_hora_prestamo DESC
  `).all(id).map(p => {
    const diasTranscurridos = p.estado === 'Activo' ? getDiasTranscurridos(p.fecha_hora_prestamo) : null;
    let duracionDias = null;
    if (p.fecha_hora_devolucion_real) {
      const inicio = new Date(p.fecha_hora_prestamo);
      const fin = new Date(p.fecha_hora_devolucion_real);
      duracionDias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
    }
    return {
      ...p,
      usuario_nombre_completo: `${p.usuario_nombre} ${p.usuario_apellido}`,
      it_nombre_completo: `${p.it_nombre} ${p.it_apellido}`,
      dias_transcurridos: diasTranscurridos,
      duracion_dias: duracionDias,
      estado_visual: diasTranscurridos !== null ? getEstadoVisual(diasTranscurridos) : null
    };
  });

  const devueltos = prestamos.filter(p => p.estado === 'Devuelto');
  const promedioDias = devueltos.length > 0
    ? (devueltos.reduce((sum, p) => sum + (p.duracion_dias || 0), 0) / devueltos.length).toFixed(1)
    : 0;

  res.json({
    success: true,
    data: {
      item,
      prestamos,
      estadisticas: { total_prestamos: prestamos.length, promedio_dias: parseFloat(promedioDias) }
    }
  });
});

// GET /api/inventario/:id/prestamo-activo
router.get('/:id/prestamo-activo', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const id = req.params.id;

  const prestamo = db.prepare(`
    SELECT
      p.*,
      u.nombre as usuario_nombre, u.apellido as usuario_apellido, u.dni as usuario_dni,
      ar.desc as usuario_area,
      it.nombre as it_nombre, it.apellido as it_apellido,
      cat.desc as inventario_categoria,
      inv.fabricante as inventario_fabricante,
      inv.modelo as inventario_modelo,
      inv.serie as inventario_serie
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    LEFT JOIN areas ar ON u.id_area = ar.id
    JOIN usuarios it ON p.usuario_it_id = it.id
    JOIN inventario inv ON p.inventario_id = inv.id
    LEFT JOIN categorias cat ON inv.id_categoria = cat.id
    WHERE p.inventario_id = ? AND p.estado = 'Activo'
  `).get(id);

  if (!prestamo) return res.status(404).json({ success: false, error: 'No hay préstamo activo para este item' });

  const dias = getDiasTranscurridos(prestamo.fecha_hora_prestamo);
  res.json({
    success: true,
    data: {
      ...prestamo,
      usuario_nombre_completo: `${prestamo.usuario_nombre} ${prestamo.usuario_apellido}`,
      it_nombre_completo: `${prestamo.it_nombre} ${prestamo.it_apellido}`,
      inventario_descripcion: `${prestamo.inventario_categoria} - ${prestamo.inventario_fabricante || ''} ${prestamo.inventario_modelo || ''}`.trim(),
      dias_transcurridos: dias,
      estado_visual: getEstadoVisual(dias)
    }
  });
});

// POST /api/inventario
router.post('/', inventarioValidations, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const { id_categoria, id_tipo, condicion, fabricante, modelo, serie, lbl_activo, id_ubicacion, notas } = req.body;

  // Verificar categoría existe
  const cat = db.prepare('SELECT id FROM categorias WHERE id = ? AND activo = 1').get(id_categoria);
  if (!cat) return res.status(400).json({ success: false, error: 'Categoría no encontrada o inactiva' });

  // Serie única
  if (serie) {
    const existeSerie = db.prepare('SELECT id FROM inventario WHERE serie = ?').get(serie.trim());
    if (existeSerie) return res.status(400).json({ success: false, error: 'El número de serie ya está registrado' });
  }

  const estadoDispId = getEstadoId(db, 'Disponible');

  const stmt = db.prepare(`
    INSERT INTO inventario (id_categoria, id_tipo, condicion, fabricante, modelo, serie, lbl_activo, id_estado, id_ubicacion, notas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    const result = stmt.run(
      id_categoria,
      id_tipo || null,
      condicion || 'Entregable',
      fabricante?.trim() || null,
      modelo?.trim() || null,
      serie?.trim() || null,
      lbl_activo?.trim() || null,
      estadoDispId,
      id_ubicacion || null,
      notas?.trim() || null
    );
    const item = db.prepare(`${BASE_SELECT} WHERE inv.id = ?`).get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear item: ' + err.message });
  }
});

// POST /api/inventario/import
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

      if (!reg.categoria) { errores.push({ linea, error: 'Categoría requerida', datos: reg }); continue; }

      const cat = db.prepare('SELECT id FROM categorias WHERE desc = ? AND activo = 1').get(reg.categoria);
      if (!cat) { errores.push({ linea, error: `Categoría "${reg.categoria}" no encontrada`, datos: reg }); continue; }

      if (reg.serie) {
        const existeSerie = db.prepare('SELECT id FROM inventario WHERE serie = ?').get(reg.serie);
        if (existeSerie) {
          if (modoConflicto === 'cancelar') {
            return res.status(400).json({ success: false, error: 'Importación cancelada por serie duplicada', detalle: { linea, serie: reg.serie } });
          } else if (modoConflicto === 'saltar') {
            saltados.push({ linea, motivo: 'Serie duplicada', datos: reg }); continue;
          } else if (modoConflicto === 'actualizar') {
            try {
              db.prepare('UPDATE inventario SET id_categoria = ?, fabricante = ?, modelo = ?, notas = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE serie = ?')
                .run(cat.id, reg.fabricante || null, reg.modelo || null, reg.notas || null, reg.serie);
              procesados.push({ linea, accion: 'actualizado', datos: reg }); continue;
            } catch (err) { errores.push({ linea, error: err.message, datos: reg }); continue; }
          }
        }
      }

      const estadoDispId = getEstadoId(db, 'Disponible');
      try {
        db.prepare('INSERT INTO inventario (id_categoria, condicion, fabricante, modelo, serie, lbl_activo, id_estado, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(cat.id, reg.condicion || 'Entregable', reg.fabricante || null, reg.modelo || null, reg.serie || null, reg.lbl_activo || null, estadoDispId, reg.notas || null);
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

// PUT /api/inventario/:id
router.put('/:id', [param('id').isInt(), ...inventarioValidations], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const { id_categoria, id_tipo, condicion, fabricante, modelo, serie, lbl_activo, id_estado, id_ubicacion, notas } = req.body;
  const id = req.params.id;

  const item = db.prepare('SELECT * FROM inventario WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ success: false, error: 'Item no encontrado' });

  // Verificar serie única excluyendo el actual
  if (serie) {
    const existeSerie = db.prepare('SELECT id FROM inventario WHERE serie = ? AND id != ?').get(serie.trim(), id);
    if (existeSerie) return res.status(400).json({ success: false, error: 'El número de serie ya está registrado' });
  }

  // Validar cambio de estado
  const estadoDispId = getEstadoId(db, 'Disponible');
  const estadoAsigId = getEstadoId(db, 'Asignado');

  if (id_estado) {
    if (parseInt(id_estado) === estadoDispId && item.id_estado === estadoAsigId) {
      const prestamoActivo = db.prepare("SELECT id FROM prestamos WHERE inventario_id = ? AND estado = 'Activo'").get(id);
      if (prestamoActivo) {
        return res.status(400).json({ success: false, error: 'No se puede cambiar a Disponible mientras tiene un préstamo activo. Use la función de devolución.' });
      }
    }
    if (parseInt(id_estado) === estadoAsigId && item.id_estado !== estadoAsigId) {
      return res.status(400).json({ success: false, error: 'El estado "Asignado" se gestiona automáticamente al crear préstamos' });
    }
  }

  try {
    db.prepare(`
      UPDATE inventario
      SET id_categoria = ?, id_tipo = ?, condicion = ?, fabricante = ?, modelo = ?, serie = ?,
          lbl_activo = ?, id_estado = ?, id_ubicacion = ?, notas = ?, fecha_modificacion = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      id_categoria,
      id_tipo || null,
      condicion || item.condicion,
      fabricante?.trim() || null,
      modelo?.trim() || null,
      serie?.trim() || null,
      lbl_activo?.trim() || null,
      id_estado || item.id_estado,
      id_ubicacion || null,
      notas?.trim() || null,
      id
    );
    const updated = db.prepare(`${BASE_SELECT} WHERE inv.id = ?`).get(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al actualizar: ' + err.message });
  }
});

// PUT /api/inventario/:id/estado
router.put('/:id/estado', [
  param('id').isInt(),
  body('id_estado').isInt({ min: 1 }).withMessage('Estado inválido')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const { id_estado } = req.body;
  const id = req.params.id;

  const item = db.prepare('SELECT * FROM inventario WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ success: false, error: 'Item no encontrado' });

  const estadoDispId = getEstadoId(db, 'Disponible');
  const estadoAsigId = getEstadoId(db, 'Asignado');

  if (parseInt(id_estado) === estadoDispId && item.id_estado === estadoAsigId) {
    const prestamoActivo = db.prepare("SELECT id FROM prestamos WHERE inventario_id = ? AND estado = 'Activo'").get(id);
    if (prestamoActivo) return res.status(400).json({ success: false, error: 'No se puede cambiar a Disponible mientras tiene un préstamo activo' });
  }
  if (parseInt(id_estado) === estadoAsigId) {
    return res.status(400).json({ success: false, error: 'El estado "Asignado" se gestiona automáticamente' });
  }

  db.prepare('UPDATE inventario SET id_estado = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?').run(id_estado, id);
  const updated = db.prepare(`${BASE_SELECT} WHERE inv.id = ?`).get(id);
  res.json({ success: true, data: updated });
});

// PUT /api/inventario/:id/asignar - Asignación fija (solo Asignables)
router.put('/:id/asignar', [
  param('id').isInt(),
  body('id_ubicacion').isInt({ min: 1 }).withMessage('Ubicación requerida'),
  body('id_asignado').optional({ nullable: true }).isInt({ min: 1 }),
  body('fecha_asignacion').optional().isISO8601(),
  body('fecha_devolucion_esperada').optional({ nullable: true }).isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const id = req.params.id;
  const { id_asignado, id_ubicacion, fecha_asignacion, fecha_devolucion_esperada, notas } = req.body;

  const item = db.prepare('SELECT * FROM inventario WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ success: false, error: 'Item no encontrado' });
  if (item.condicion !== 'Asignable') {
    return res.status(400).json({ success: false, error: 'Solo se pueden asignar items con condición "Asignable". Los "Entregables" se gestionan con préstamos.' });
  }

  const estadoDispId = getEstadoId(db, 'Disponible');
  if (item.id_estado !== estadoDispId) {
    return res.status(400).json({ success: false, error: 'El item no está disponible para asignación' });
  }

  // Verificar ubicación existe
  const ubicacion = db.prepare('SELECT * FROM ubicaciones WHERE id = ?').get(id_ubicacion);
  if (!ubicacion) return res.status(400).json({ success: false, error: 'Ubicación no encontrada' });

  // Verificar usuario si se proporcionó
  let usuario = null;
  if (id_asignado) {
    usuario = db.prepare('SELECT * FROM usuarios WHERE id = ? AND activo = 1').get(id_asignado);
    if (!usuario) return res.status(400).json({ success: false, error: 'Usuario no encontrado o inactivo' });
  }

  const estadoAsigId = getEstadoId(db, 'Asignado');
  const fechaAsig = fecha_asignacion || new Date().toISOString();

  db.prepare(`
    UPDATE inventario
    SET id_asignado = ?, id_ubicacion = ?, fecha_asignacion = ?, fecha_devolucion = ?, id_estado = ?,
        notas = COALESCE(?, notas), fecha_modificacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id_asignado || null, id_ubicacion, fechaAsig, fecha_devolucion_esperada || null, estadoAsigId, notas || null, id);

  const updated = db.prepare(`${BASE_SELECT} WHERE inv.id = ?`).get(id);
  const destino = usuario ? `${usuario.nombre} ${usuario.apellido}` : ubicacion.desc;
  res.json({ success: true, data: updated, message: `Item asignado a ${destino}` });
});

// PUT /api/inventario/:id/liberar - Liberar asignación fija
router.put('/:id/liberar', [
  param('id').isInt(),
  body('fecha_devolucion_real').optional().isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const id = req.params.id;
  const { fecha_devolucion_real } = req.body;

  const item = db.prepare('SELECT * FROM inventario WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ success: false, error: 'Item no encontrado' });
  if (item.condicion !== 'Asignable') {
    return res.status(400).json({ success: false, error: 'Solo aplica a items con condición "Asignable"' });
  }

  const estadoAsigId = getEstadoId(db, 'Asignado');
  if (item.id_estado !== estadoAsigId) {
    return res.status(400).json({ success: false, error: 'El item no está actualmente asignado' });
  }

  const estadoDispId = getEstadoId(db, 'Disponible');

  db.prepare(`
    UPDATE inventario
    SET id_asignado = NULL, fecha_asignacion = NULL,
        fecha_devolucion = ?, id_estado = ?, fecha_modificacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(fecha_devolucion_real || new Date().toISOString(), estadoDispId, id);

  const updated = db.prepare(`${BASE_SELECT} WHERE inv.id = ?`).get(id);
  res.json({ success: true, data: updated, message: 'Asignación liberada correctamente' });
});

// DELETE /api/inventario/:id
router.delete('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = getDb();
  const id = req.params.id;

  const item = db.prepare('SELECT * FROM inventario WHERE id = ?').get(id);
  if (!item) return res.status(404).json({ success: false, error: 'Item no encontrado' });

  const count = db.prepare('SELECT COUNT(*) as count FROM prestamos WHERE inventario_id = ?').get(id);
  if (count.count > 0) {
    return res.status(400).json({
      success: false,
      error: 'No se puede eliminar el item porque tiene préstamos asociados. Puede cambiar su estado a "Dañado" o "Extraviado".'
    });
  }

  db.prepare('DELETE FROM inventario WHERE id = ?').run(id);
  res.json({ success: true, message: 'Item eliminado correctamente' });
});

module.exports = router;
