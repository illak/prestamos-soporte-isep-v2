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

function initialize() {
  const database = getDb();

  // Tabla usuarios
  database.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mail TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      dni TEXT UNIQUE NOT NULL,
      area_equipo TEXT NOT NULL,
      rol TEXT NOT NULL CHECK(rol IN ('usuario', 'soporte_it')) DEFAULT 'usuario',
      activo BOOLEAN DEFAULT 1,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Índices para usuarios
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_usuarios_mail ON usuarios(mail);
    CREATE INDEX IF NOT EXISTS idx_usuarios_dni ON usuarios(dni);
    CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);
    CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
  `);

  // Tabla tipologias
  database.exec(`
    CREATE TABLE IF NOT EXISTS tipologias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      descripcion TEXT,
      activo INTEGER DEFAULT 1,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Índice para tipologias
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_tipologias_nombre ON tipologias(nombre);
    CREATE INDEX IF NOT EXISTS idx_tipologias_activo ON tipologias(activo);
  `);

  // Migrar tipologías predeterminadas si la tabla está vacía
  const countTipologias = database.prepare('SELECT COUNT(*) as count FROM tipologias').get();
  if (countTipologias.count === 0) {
    const tipologiasDefault = ['Notebook', 'Mouse', 'Teclado', 'Monitor', 'Proyector', 'Cable HDMI', 'Cable VGA', 'Webcam', 'Auriculares', 'Otro'];
    const insertTipologia = database.prepare('INSERT INTO tipologias (nombre) VALUES (?)');
    tipologiasDefault.forEach(nombre => {
      insertTipologia.run(nombre);
    });
    console.log('Tipologías predeterminadas insertadas');
  }

  // Tabla insumos
  database.exec(`
    CREATE TABLE IF NOT EXISTS insumos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipologia TEXT NOT NULL,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      numero_serie TEXT UNIQUE,
      estado TEXT NOT NULL CHECK(estado IN ('Disponible', 'En préstamo', 'En mantenimiento', 'Dado de baja')) DEFAULT 'Disponible',
      observaciones TEXT,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Índices para insumos
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_insumos_estado ON insumos(estado);
    CREATE INDEX IF NOT EXISTS idx_insumos_tipologia ON insumos(tipologia);
  `);

  // Tabla prestamos
  database.exec(`
    CREATE TABLE IF NOT EXISTS prestamos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      insumo_id INTEGER NOT NULL,
      usuario_it_id INTEGER NOT NULL,
      fecha_hora_prestamo DATETIME NOT NULL,
      fecha_hora_devolucion_real DATETIME,
      estado TEXT NOT NULL CHECK(estado IN ('Activo', 'Devuelto')) DEFAULT 'Activo',
      observaciones_prestamo TEXT,
      observaciones_devolucion TEXT,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
      FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE RESTRICT,
      FOREIGN KEY (usuario_it_id) REFERENCES usuarios(id) ON DELETE RESTRICT
    );
  `);

  // Índices para prestamos
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_prestamos_usuario ON prestamos(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_prestamos_insumo ON prestamos(insumo_id);
    CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON prestamos(estado);
    CREATE INDEX IF NOT EXISTS idx_prestamos_fecha ON prestamos(fecha_hora_prestamo);
    CREATE INDEX IF NOT EXISTS idx_prestamos_usuario_it ON prestamos(usuario_it_id);
  `);

  console.log('Base de datos inicializada correctamente');
}

module.exports = {
  getDb,
  initialize
};
