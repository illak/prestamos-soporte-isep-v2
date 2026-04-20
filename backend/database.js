const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'prestamos.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function createSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      desc TEXT NOT NULL UNIQUE,
      activo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS tipos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      desc TEXT NOT NULL UNIQUE,
      activo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS estados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      desc TEXT NOT NULL UNIQUE,
      activo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS ubicaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      desc TEXT NOT NULL,
      piso TEXT,
      activo INTEGER DEFAULT 1,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      desc TEXT NOT NULL UNIQUE,
      activo INTEGER DEFAULT 1,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mail TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      dni TEXT UNIQUE NOT NULL,
      id_area INTEGER REFERENCES areas(id),
      rol TEXT NOT NULL CHECK(rol IN ('usuario', 'soporte_it')) DEFAULT 'usuario',
      activo BOOLEAN DEFAULT 1,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_tipo INTEGER REFERENCES tipos(id),
      id_categoria INTEGER NOT NULL REFERENCES categorias(id),
      condicion TEXT NOT NULL CHECK(condicion IN ('Entregable', 'Asignable')) DEFAULT 'Entregable',
      fabricante TEXT,
      modelo TEXT,
      serie TEXT UNIQUE,
      lbl_activo TEXT,
      id_estado INTEGER NOT NULL REFERENCES estados(id),
      id_ubicacion INTEGER REFERENCES ubicaciones(id),
      id_asignado INTEGER REFERENCES usuarios(id),
      fecha_asignacion DATE,
      fecha_devolucion DATE,
      notas TEXT,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prestamos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      inventario_id INTEGER NOT NULL,
      usuario_it_id INTEGER NOT NULL,
      fecha_hora_prestamo DATETIME NOT NULL,
      fecha_hora_devolucion_real DATETIME,
      estado TEXT NOT NULL CHECK(estado IN ('Activo', 'Devuelto')) DEFAULT 'Activo',
      observaciones_prestamo TEXT,
      observaciones_devolucion TEXT,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
      FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE RESTRICT,
      FOREIGN KEY (usuario_it_id) REFERENCES usuarios(id) ON DELETE RESTRICT
    );
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_usuarios_mail ON usuarios(mail);
    CREATE INDEX IF NOT EXISTS idx_usuarios_dni ON usuarios(dni);
    CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);
    CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
    CREATE INDEX IF NOT EXISTS idx_inventario_estado ON inventario(id_estado);
    CREATE INDEX IF NOT EXISTS idx_inventario_categoria ON inventario(id_categoria);
    CREATE INDEX IF NOT EXISTS idx_inventario_condicion ON inventario(condicion);
    CREATE INDEX IF NOT EXISTS idx_prestamos_usuario ON prestamos(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_prestamos_inventario ON prestamos(inventario_id);
    CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON prestamos(estado);
    CREATE INDEX IF NOT EXISTS idx_prestamos_fecha ON prestamos(fecha_hora_prestamo);
    CREATE INDEX IF NOT EXISTS idx_prestamos_usuario_it ON prestamos(usuario_it_id);
  `);
}

function insertDefaults(database) {
  const countEstados = database.prepare('SELECT COUNT(*) as count FROM estados').get();
  if (countEstados.count === 0) {
    const estadosDefault = ['Disponible', 'Asignado', 'En reparación', 'Dañado', 'Extraviado'];
    const insertEstado = database.prepare('INSERT INTO estados (desc) VALUES (?)');
    estadosDefault.forEach(d => insertEstado.run(d));
  }

  const countTipos = database.prepare('SELECT COUNT(*) as count FROM tipos').get();
  if (countTipos.count === 0) {
    const tiposDefault = ['Activo', 'Accesorio', 'Consumible', 'Componente', 'Licencia'];
    const insertTipo = database.prepare('INSERT INTO tipos (desc) VALUES (?)');
    tiposDefault.forEach(d => insertTipo.run(d));
  }

  const countCategorias = database.prepare('SELECT COUNT(*) as count FROM categorias').get();
  if (countCategorias.count === 0) {
    const categoriasDefault = [
      'Notebook', 'Netbook', 'PC Escritorio', 'Proyector',
      'Mouse', 'Teclado', 'Monitor', 'Cable HDMI', 'Cable VGA',
      'Webcam', 'Auriculares', 'Otro'
    ];
    const insertCategoria = database.prepare('INSERT INTO categorias (desc) VALUES (?)');
    categoriasDefault.forEach(d => insertCategoria.run(d));
    console.log('Categorías predeterminadas insertadas');
  }
}

function runMigration(database) {
  console.log('Iniciando migración al nuevo esquema...');
  database.pragma('foreign_keys = OFF');

  const migration = database.transaction(() => {
    // Crear tablas de lookup nuevas
    database.exec(`
      CREATE TABLE IF NOT EXISTS areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        desc TEXT NOT NULL UNIQUE,
        activo INTEGER DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS tipos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        desc TEXT NOT NULL UNIQUE,
        activo INTEGER DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS estados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        desc TEXT NOT NULL UNIQUE,
        activo INTEGER DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS ubicaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        desc TEXT NOT NULL,
        piso TEXT,
        activo INTEGER DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insertar valores por defecto
    const estadosDefault = ['Disponible', 'Asignado', 'En reparación', 'Dañado', 'Extraviado'];
    const insertEstado = database.prepare('INSERT OR IGNORE INTO estados (desc) VALUES (?)');
    estadosDefault.forEach(d => insertEstado.run(d));

    const tiposDefault = ['Activo', 'Accesorio', 'Consumible', 'Componente', 'Licencia'];
    const insertTipo = database.prepare('INSERT OR IGNORE INTO tipos (desc) VALUES (?)');
    tiposDefault.forEach(d => insertTipo.run(d));

    // Crear categorias desde tipologias
    database.exec(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        desc TEXT NOT NULL UNIQUE,
        activo INTEGER DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const tipologiasExist = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tipologias'").get();
    if (tipologiasExist) {
      const tipologias = database.prepare('SELECT * FROM tipologias').all();
      const insertCategoria = database.prepare('INSERT OR IGNORE INTO categorias (id, desc, activo, fecha_creacion, fecha_modificacion) VALUES (?, ?, ?, ?, ?)');
      tipologias.forEach(t => {
        insertCategoria.run(t.id, t.nombre, t.activo, t.fecha_creacion, t.fecha_modificacion);
      });
    } else {
      const categoriasDefault = ['Notebook', 'Netbook', 'PC Escritorio', 'Proyector', 'Mouse', 'Teclado', 'Monitor', 'Cable HDMI', 'Cable VGA', 'Webcam', 'Auriculares', 'Otro'];
      const insertCategoria = database.prepare('INSERT OR IGNORE INTO categorias (desc) VALUES (?)');
      categoriasDefault.forEach(d => insertCategoria.run(d));
    }

    // Crear areas desde area_equipo de usuarios
    const areasExist = database.prepare("SELECT name FROM sqlite_master WHERE type='column' AND tbl_name='usuarios' AND name='area_equipo'").get();
    // SQLite pragma approach
    const usuariosCols = database.pragma('table_info(usuarios)');
    const hasAreaEquipo = usuariosCols.some(c => c.name === 'area_equipo');
    if (hasAreaEquipo) {
      const areasDistinct = database.prepare("SELECT DISTINCT area_equipo FROM usuarios WHERE area_equipo IS NOT NULL AND area_equipo != ''").all();
      const insertArea = database.prepare('INSERT OR IGNORE INTO areas (desc) VALUES (?)');
      areasDistinct.forEach(a => insertArea.run(a.area_equipo));
    }

    // Crear tabla usuarios nueva con id_area
    const hasIdArea = database.pragma('table_info(usuarios)').some(c => c.name === 'id_area');
    if (!hasIdArea) {
      database.exec('ALTER TABLE usuarios ADD COLUMN id_area INTEGER REFERENCES areas(id)');
      if (hasAreaEquipo) {
        database.exec('UPDATE usuarios SET id_area = (SELECT id FROM areas WHERE desc = area_equipo) WHERE area_equipo IS NOT NULL');
      }
    }

    // Crear tabla inventario
    database.exec(`
      CREATE TABLE IF NOT EXISTS inventario (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_tipo INTEGER REFERENCES tipos(id),
        id_categoria INTEGER NOT NULL REFERENCES categorias(id),
        condicion TEXT NOT NULL CHECK(condicion IN ('Entregable', 'Asignable')) DEFAULT 'Entregable',
        fabricante TEXT,
        modelo TEXT,
        serie TEXT UNIQUE,
        lbl_activo TEXT,
        id_estado INTEGER NOT NULL REFERENCES estados(id),
        id_ubicacion INTEGER REFERENCES ubicaciones(id),
        id_asignado INTEGER REFERENCES usuarios(id),
        fecha_asignacion DATE,
        fecha_devolucion DATE,
        notas TEXT,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const insumosExist = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='insumos'").get();
    if (insumosExist) {
      const categoriaMap = {};
      database.prepare('SELECT id, desc FROM categorias').all().forEach(c => { categoriaMap[c.desc] = c.id; });

      const estadoMapQ = database.prepare('SELECT id, desc FROM estados').all();
      const estadoMap = {};
      estadoMapQ.forEach(e => { estadoMap[e.desc] = e.id; });

      const oldEstadoToNew = {
        'Disponible': estadoMap['Disponible'],
        'En préstamo': estadoMap['Asignado'],
        'En mantenimiento': estadoMap['En reparación'],
        'Dado de baja': estadoMap['Dañado'],
      };

      const insumos = database.prepare('SELECT * FROM insumos').all();
      const insertInv = database.prepare(`
        INSERT OR IGNORE INTO inventario
          (id, id_categoria, condicion, modelo, serie, id_estado, notas, fecha_creacion, fecha_modificacion)
        VALUES (?, ?, 'Entregable', ?, ?, ?, ?, ?, ?)
      `);

      insumos.forEach(i => {
        const catId = categoriaMap[i.tipologia] || null;
        const estId = oldEstadoToNew[i.estado] || estadoMap['Disponible'];
        const notas = [i.descripcion, i.observaciones].filter(Boolean).join(' | ') || null;
        insertInv.run(i.id, catId, i.nombre, i.numero_serie, estId, notas, i.fecha_creacion, i.fecha_modificacion);
      });
    }

    // Reconstruir prestamos con inventario_id
    const prestamosExist = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='prestamos'").get();
    const prestamosHasInsumoId = prestamosExist && database.pragma('table_info(prestamos)').some(c => c.name === 'insumo_id');

    if (prestamosHasInsumoId) {
      database.exec(`
        CREATE TABLE prestamos_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER NOT NULL,
          inventario_id INTEGER NOT NULL,
          usuario_it_id INTEGER NOT NULL,
          fecha_hora_prestamo DATETIME NOT NULL,
          fecha_hora_devolucion_real DATETIME,
          estado TEXT NOT NULL CHECK(estado IN ('Activo', 'Devuelto')) DEFAULT 'Activo',
          observaciones_prestamo TEXT,
          observaciones_devolucion TEXT,
          fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
          FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE RESTRICT,
          FOREIGN KEY (usuario_it_id) REFERENCES usuarios(id) ON DELETE RESTRICT
        );
        INSERT INTO prestamos_new
          SELECT id, usuario_id, insumo_id, usuario_it_id, fecha_hora_prestamo,
            fecha_hora_devolucion_real, estado, observaciones_prestamo, observaciones_devolucion,
            fecha_creacion, fecha_modificacion
          FROM prestamos;
        DROP TABLE prestamos;
        ALTER TABLE prestamos_new RENAME TO prestamos;
      `);
    }

    // Crear índices
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_usuarios_mail ON usuarios(mail);
      CREATE INDEX IF NOT EXISTS idx_usuarios_dni ON usuarios(dni);
      CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);
      CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
      CREATE INDEX IF NOT EXISTS idx_inventario_estado ON inventario(id_estado);
      CREATE INDEX IF NOT EXISTS idx_inventario_categoria ON inventario(id_categoria);
      CREATE INDEX IF NOT EXISTS idx_inventario_condicion ON inventario(condicion);
      CREATE INDEX IF NOT EXISTS idx_prestamos_usuario ON prestamos(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_prestamos_inventario ON prestamos(inventario_id);
      CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON prestamos(estado);
      CREATE INDEX IF NOT EXISTS idx_prestamos_fecha ON prestamos(fecha_hora_prestamo);
      CREATE INDEX IF NOT EXISTS idx_prestamos_usuario_it ON prestamos(usuario_it_id);
    `);

    // Eliminar tablas viejas
    if (insumosExist) database.exec('DROP TABLE IF EXISTS insumos');
    if (tipologiasExist) database.exec('DROP TABLE IF EXISTS tipologias');

    console.log('Migración completada exitosamente');
  });

  migration();
  database.pragma('foreign_keys = ON');
}

function initialize() {
  const database = getDb();

  const hasInventario = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='inventario'").get();
  const hasInsumos = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='insumos'").get();

  if (hasInventario) {
    insertDefaults(database);
    console.log('Base de datos inicializada (esquema nuevo)');
  } else if (hasInsumos) {
    runMigration(database);
    insertDefaults(database);
  } else {
    createSchema(database);
    insertDefaults(database);
    console.log('Base de datos inicializada correctamente');
  }
}

module.exports = { getDb, initialize };
