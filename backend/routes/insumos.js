const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { getDb } = require('../database');
const { getDiasTranscurridos, getEstadoVisual } = require('../utils/helpers');

const upload = multer({ storage: multer.memoryStorage() });

const TIPOLOGIAS = ['Notebook', 'Mouse', 'Teclado', 'Monitor', 'Proyector', 'Cable HDMI', 'Cable VGA', 'Webcam', 'Auriculares', 'Otro'];
const ESTADOS = ['Disponible', 'En préstamo', 'En mantenimiento', 'Dado de baja'];

// Validaciones comunes
const insumoValidations = [
  body('tipologia').trim().notEmpty().withMessage('Tipología requerida'),
  body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
  body('descripcion').optional().trim(),
  body('numero_serie').optional().trim(),
  body('observaciones').optional().trim()
];

// GET /api/insumos - Listar insumos con filtros y paginación
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('busqueda').optional().trim(),
  query('tipologia').optional().trim(),
  query('estado').optional().trim(),
  query('orderBy').optional().isIn(['nombre', 'tipologia', 'estado', 'fecha_creacion']),
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
  const tipologia = req.query.tipologia || '';
  const estado = req.query.estado || '';
  const orderBy = req.query.orderBy || 'nombre';
  const order = req.query.order || 'asc';

  let whereClause = '1=1';
  const params = [];

  if (busqueda) {
    whereClause += ' AND (i.nombre LIKE ? OR i.descripcion LIKE ? OR i.numero_serie LIKE ?)';
    const searchTerm = `%${busqueda}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (tipologia) {
    whereClause += ' AND i.tipologia = ?';
    params.push(tipologia);
  }

  if (estado) {
    // Puede ser múltiples estados separados por coma
    const estados = estado.split(',').map(e => e.trim()).filter(e => ESTADOS.includes(e));
    if (estados.length > 0) {
      whereClause += ` AND i.estado IN (${estados.map(() => '?').join(',')})`;
      params.push(...estados);
    }
  }

  // Contar total
  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM insumos i WHERE ${whereClause}`);
  const { total } = countStmt.get(...params);

  // Obtener insumos con información de préstamo activo si existe
  const stmt = db.prepare(`
    SELECT
      i.*,
      p.id as prestamo_activo_id,
      p.usuario_id as prestamo_usuario_id,
      p.fecha_hora_prestamo,
      u.nombre as prestamo_usuario_nombre,
      u.apellido as prestamo_usuario_apellido
    FROM insumos i
    LEFT JOIN prestamos p ON i.id = p.insumo_id AND p.estado = 'Activo'
    LEFT JOIN usuarios u ON p.usuario_id = u.id
    WHERE ${whereClause}
    ORDER BY i.${orderBy} ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `);

  const insumos = stmt.all(...params, limit, offset).map(insumo => {
    if (insumo.prestamo_activo_id) {
      const diasTranscurridos = getDiasTranscurridos(insumo.fecha_hora_prestamo);
      const estadoVisual = getEstadoVisual(diasTranscurridos);
      return {
        ...insumo,
        prestamo_activo: {
          id: insumo.prestamo_activo_id,
          usuario_id: insumo.prestamo_usuario_id,
          usuario_nombre: `${insumo.prestamo_usuario_nombre} ${insumo.prestamo_usuario_apellido}`,
          fecha_hora_prestamo: insumo.fecha_hora_prestamo,
          dias_transcurridos: diasTranscurridos,
          estado_visual: estadoVisual
        }
      };
    }
    return {
      ...insumo,
      prestamo_activo: null
    };
  });

  // Limpiar campos temporales
  insumos.forEach(i => {
    delete i.prestamo_activo_id;
    delete i.prestamo_usuario_id;
    delete i.fecha_hora_prestamo;
    delete i.prestamo_usuario_nombre;
    delete i.prestamo_usuario_apellido;
  });

  res.json({
    success: true,
    data: insumos,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// GET /api/insumos/tipologias - Obtener lista de tipologías
router.get('/tipologias', (req, res) => {
  res.json({ success: true, data: TIPOLOGIAS });
});

// GET /api/insumos/estados - Obtener lista de estados posibles
router.get('/estados', (req, res) => {
  res.json({ success: true, data: ESTADOS });
});

// GET /api/insumos/disponibles - Obtener solo insumos disponibles (para selector de préstamo)
router.get('/disponibles', (req, res) => {
  const db = getDb();
  const busqueda = req.query.busqueda || '';

  let whereClause = "estado = 'Disponible'";
  const params = [];

  if (busqueda) {
    whereClause += ' AND (nombre LIKE ? OR tipologia LIKE ? OR numero_serie LIKE ?)';
    const searchTerm = `%${busqueda}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const stmt = db.prepare(`
    SELECT id, tipologia, nombre, numero_serie
    FROM insumos
    WHERE ${whereClause}
    ORDER BY tipologia, nombre
    LIMIT 50
  `);

  const insumos = stmt.all(...params);
  res.json({ success: true, data: insumos });
});

// GET /api/insumos/export - Exportar insumos a CSV
router.get('/export', (req, res) => {
  const db = getDb();
  const estado = req.query.estado || '';

  let whereClause = '1=1';
  const params = [];

  if (estado) {
    const estados = estado.split(',').map(e => e.trim()).filter(e => ESTADOS.includes(e));
    if (estados.length > 0) {
      whereClause += ` AND estado IN (${estados.map(() => '?').join(',')})`;
      params.push(...estados);
    }
  }

  const stmt = db.prepare(`
    SELECT tipologia, nombre, descripcion, numero_serie, estado, observaciones
    FROM insumos
    WHERE ${whereClause}
    ORDER BY tipologia, nombre
  `);
  const insumos = stmt.all(...params);

  const csv = stringify(insumos, {
    header: true,
    columns: ['tipologia', 'nombre', 'descripcion', 'numero_serie', 'estado', 'observaciones']
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=insumos.csv');
  res.send('\ufeff' + csv);
});

// GET /api/insumos/:id - Obtener un insumo
router.get('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const insumo = db.prepare('SELECT * FROM insumos WHERE id = ?').get(req.params.id);

  if (!insumo) {
    return res.status(404).json({ success: false, error: 'Insumo no encontrado' });
  }

  res.json({ success: true, data: insumo });
});

// GET /api/insumos/:id/historial - Obtener historial de préstamos de un insumo
router.get('/:id/historial', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const id = req.params.id;

  // Verificar que existe el insumo
  const insumo = db.prepare('SELECT * FROM insumos WHERE id = ?').get(id);
  if (!insumo) {
    return res.status(404).json({ success: false, error: 'Insumo no encontrado' });
  }

  // Obtener historial de préstamos
  const stmt = db.prepare(`
    SELECT
      p.*,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido,
      u.dni as usuario_dni,
      u.area_equipo as usuario_area,
      it.nombre as it_nombre,
      it.apellido as it_apellido
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    JOIN usuarios it ON p.usuario_it_id = it.id
    WHERE p.insumo_id = ?
    ORDER BY p.fecha_hora_prestamo DESC
  `);

  const prestamos = stmt.all(id).map(p => {
    const diasTranscurridos = p.estado === 'Activo'
      ? getDiasTranscurridos(p.fecha_hora_prestamo)
      : null;

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

  // Estadísticas
  const totalPrestamos = prestamos.length;
  const prestamosDevueltos = prestamos.filter(p => p.estado === 'Devuelto');
  const promedioDias = prestamosDevueltos.length > 0
    ? (prestamosDevueltos.reduce((sum, p) => sum + (p.duracion_dias || 0), 0) / prestamosDevueltos.length).toFixed(1)
    : 0;

  res.json({
    success: true,
    data: {
      insumo,
      prestamos,
      estadisticas: {
        total_prestamos: totalPrestamos,
        promedio_dias: parseFloat(promedioDias)
      }
    }
  });
});

// GET /api/insumos/:id/prestamo-activo - Obtener préstamo activo de un insumo
router.get('/:id/prestamo-activo', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const id = req.params.id;

  const stmt = db.prepare(`
    SELECT
      p.*,
      u.nombre as usuario_nombre,
      u.apellido as usuario_apellido,
      u.dni as usuario_dni,
      u.area_equipo as usuario_area,
      it.nombre as it_nombre,
      it.apellido as it_apellido,
      i.tipologia as insumo_tipologia,
      i.nombre as insumo_nombre,
      i.numero_serie as insumo_numero_serie
    FROM prestamos p
    JOIN usuarios u ON p.usuario_id = u.id
    JOIN usuarios it ON p.usuario_it_id = it.id
    JOIN insumos i ON p.insumo_id = i.id
    WHERE p.insumo_id = ? AND p.estado = 'Activo'
  `);

  const prestamo = stmt.get(id);

  if (!prestamo) {
    return res.status(404).json({ success: false, error: 'No hay préstamo activo para este insumo' });
  }

  const diasTranscurridos = getDiasTranscurridos(prestamo.fecha_hora_prestamo);
  const estadoVisual = getEstadoVisual(diasTranscurridos);

  res.json({
    success: true,
    data: {
      ...prestamo,
      usuario_nombre_completo: `${prestamo.usuario_nombre} ${prestamo.usuario_apellido}`,
      it_nombre_completo: `${prestamo.it_nombre} ${prestamo.it_apellido}`,
      insumo_descripcion: `${prestamo.insumo_tipologia} - ${prestamo.insumo_nombre}`,
      dias_transcurridos: diasTranscurridos,
      estado_visual: estadoVisual
    }
  });
});

// POST /api/insumos - Crear insumo
router.post('/', insumoValidations, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const { tipologia, nombre, descripcion, numero_serie, observaciones } = req.body;

  // Verificar número de serie único si se proporciona
  if (numero_serie) {
    const existeSerie = db.prepare('SELECT id FROM insumos WHERE numero_serie = ?').get(numero_serie);
    if (existeSerie) {
      return res.status(400).json({ success: false, error: 'El número de serie ya está registrado' });
    }
  }

  const stmt = db.prepare(`
    INSERT INTO insumos (tipologia, nombre, descripcion, numero_serie, estado, observaciones)
    VALUES (?, ?, ?, ?, 'Disponible', ?)
  `);

  try {
    const result = stmt.run(
      tipologia.trim(),
      nombre.trim(),
      descripcion?.trim() || null,
      numero_serie?.trim() || null,
      observaciones?.trim() || null
    );
    const insumo = db.prepare('SELECT * FROM insumos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: insumo });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear insumo' });
  }
});

// POST /api/insumos/import - Importar insumos desde CSV
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No se proporcionó archivo' });
  }

  const modoConflicto = req.body.modoConflicto || 'saltar';

  try {
    const contenido = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
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
      const linea = i + 2;
      const reg = registros[i];

      // Validaciones
      if (!reg.tipologia) {
        errores.push({ linea, error: 'Tipología requerida', datos: reg });
        continue;
      }
      if (!reg.nombre) {
        errores.push({ linea, error: 'Nombre requerido', datos: reg });
        continue;
      }

      // Verificar número de serie duplicado
      if (reg.numero_serie) {
        const existeSerie = db.prepare('SELECT id FROM insumos WHERE numero_serie = ?').get(reg.numero_serie);
        if (existeSerie) {
          if (modoConflicto === 'cancelar') {
            return res.status(400).json({
              success: false,
              error: 'Importación cancelada por número de serie duplicado',
              detalle: { linea, numero_serie: reg.numero_serie }
            });
          } else if (modoConflicto === 'saltar') {
            saltados.push({ linea, motivo: 'Número de serie duplicado', datos: reg });
            continue;
          } else if (modoConflicto === 'actualizar') {
            const updateStmt = db.prepare(`
              UPDATE insumos SET tipologia = ?, nombre = ?, descripcion = ?, observaciones = ?, fecha_modificacion = CURRENT_TIMESTAMP
              WHERE numero_serie = ?
            `);
            try {
              updateStmt.run(reg.tipologia, reg.nombre, reg.descripcion || null, reg.observaciones || null, reg.numero_serie);
              procesados.push({ linea, accion: 'actualizado', datos: reg });
            } catch (err) {
              errores.push({ linea, error: 'Error al actualizar: ' + err.message, datos: reg });
            }
            continue;
          }
        }
      }

      // Insertar nuevo
      const insertStmt = db.prepare(`
        INSERT INTO insumos (tipologia, nombre, descripcion, numero_serie, estado, observaciones)
        VALUES (?, ?, ?, ?, 'Disponible', ?)
      `);
      try {
        insertStmt.run(
          reg.tipologia,
          reg.nombre,
          reg.descripcion || null,
          reg.numero_serie || null,
          reg.observaciones || null
        );
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

// PUT /api/insumos/:id - Actualizar insumo
router.put('/:id', [param('id').isInt(), ...insumoValidations], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const { tipologia, nombre, descripcion, numero_serie, estado, observaciones } = req.body;
  const id = req.params.id;

  // Verificar que existe
  const insumo = db.prepare('SELECT * FROM insumos WHERE id = ?').get(id);
  if (!insumo) {
    return res.status(404).json({ success: false, error: 'Insumo no encontrado' });
  }

  // Verificar número de serie único excluyendo el actual
  if (numero_serie) {
    const existeSerie = db.prepare('SELECT id FROM insumos WHERE numero_serie = ? AND id != ?').get(numero_serie, id);
    if (existeSerie) {
      return res.status(400).json({ success: false, error: 'El número de serie ya está registrado' });
    }
  }

  // Validar cambio de estado
  if (estado) {
    // No permitir cambiar a "Disponible" si tiene préstamo activo
    if (estado === 'Disponible' && insumo.estado === 'En préstamo') {
      const prestamoActivo = db.prepare("SELECT id FROM prestamos WHERE insumo_id = ? AND estado = 'Activo'").get(id);
      if (prestamoActivo) {
        return res.status(400).json({
          success: false,
          error: 'No se puede cambiar a Disponible mientras tiene un préstamo activo. Use la función de devolución.'
        });
      }
    }
    // No permitir cambiar a "En préstamo" manualmente
    if (estado === 'En préstamo' && insumo.estado !== 'En préstamo') {
      return res.status(400).json({
        success: false,
        error: 'El estado "En préstamo" se gestiona automáticamente al crear préstamos'
      });
    }
  }

  const nuevoEstado = estado || insumo.estado;

  const stmt = db.prepare(`
    UPDATE insumos
    SET tipologia = ?, nombre = ?, descripcion = ?, numero_serie = ?, estado = ?, observaciones = ?, fecha_modificacion = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  try {
    stmt.run(
      tipologia.trim(),
      nombre.trim(),
      descripcion?.trim() || null,
      numero_serie?.trim() || null,
      nuevoEstado,
      observaciones?.trim() || null,
      id
    );
    const insumoActualizado = db.prepare('SELECT * FROM insumos WHERE id = ?').get(id);
    res.json({ success: true, data: insumoActualizado });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al actualizar insumo' });
  }
});

// PUT /api/insumos/:id/estado - Cambio rápido de estado
router.put('/:id/estado', [
  param('id').isInt(),
  body('estado').isIn(ESTADOS).withMessage('Estado inválido')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const { estado } = req.body;
  const id = req.params.id;

  const insumo = db.prepare('SELECT * FROM insumos WHERE id = ?').get(id);
  if (!insumo) {
    return res.status(404).json({ success: false, error: 'Insumo no encontrado' });
  }

  // Validaciones de cambio de estado
  if (estado === 'Disponible' && insumo.estado === 'En préstamo') {
    const prestamoActivo = db.prepare("SELECT id FROM prestamos WHERE insumo_id = ? AND estado = 'Activo'").get(id);
    if (prestamoActivo) {
      return res.status(400).json({
        success: false,
        error: 'No se puede cambiar a Disponible mientras tiene un préstamo activo'
      });
    }
  }

  if (estado === 'En préstamo') {
    return res.status(400).json({
      success: false,
      error: 'El estado "En préstamo" se gestiona automáticamente'
    });
  }

  const stmt = db.prepare('UPDATE insumos SET estado = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(estado, id);

  const insumoActualizado = db.prepare('SELECT * FROM insumos WHERE id = ?').get(id);
  res.json({ success: true, data: insumoActualizado });
});

// DELETE /api/insumos/:id - Eliminar insumo
router.delete('/:id', [param('id').isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const db = getDb();
  const id = req.params.id;

  const insumo = db.prepare('SELECT * FROM insumos WHERE id = ?').get(id);
  if (!insumo) {
    return res.status(404).json({ success: false, error: 'Insumo no encontrado' });
  }

  // Verificar si tiene préstamos asociados
  const prestamos = db.prepare('SELECT COUNT(*) as count FROM prestamos WHERE insumo_id = ?').get(id);
  if (prestamos.count > 0) {
    return res.status(400).json({
      success: false,
      error: 'No se puede eliminar el insumo porque tiene préstamos asociados. Puede cambiar su estado a "Dado de baja".',
      sugerencia: 'dado_de_baja'
    });
  }

  // Hard delete
  const stmt = db.prepare('DELETE FROM insumos WHERE id = ?');
  stmt.run(id);

  res.json({ success: true, message: 'Insumo eliminado correctamente' });
});

module.exports = router;
