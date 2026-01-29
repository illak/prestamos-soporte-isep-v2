/**
 * Script para poblar la base de datos con datos de ejemplo
 * Ejecutar: node seed.js
 */

const { getDb, initialize } = require('./database');

function seed() {
  const db = getDb();

  // Limpiar tablas existentes
  db.exec('DELETE FROM prestamos');
  db.exec('DELETE FROM insumos');
  db.exec('DELETE FROM usuarios');

  // Resetear autoincrement
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('usuarios', 'insumos', 'prestamos')");

  console.log('Tablas limpiadas...');

  // Insertar usuarios de Soporte IT
  const usuariosIt = [
    { mail: 'carlos.martinez@isep.edu.ar', nombre: 'Carlos', apellido: 'Martínez', dni: '28456789', area: 'Soporte IT', rol: 'soporte_it' },
    { mail: 'laura.gomez@isep.edu.ar', nombre: 'Laura', apellido: 'Gómez', dni: '31234567', area: 'Soporte IT', rol: 'soporte_it' },
    { mail: 'diego.fernandez@isep.edu.ar', nombre: 'Diego', apellido: 'Fernández', dni: '29876543', area: 'Soporte IT', rol: 'soporte_it' },
  ];

  // Insertar usuarios regulares
  const usuariosRegulares = [
    { mail: 'maria.lopez@isep.edu.ar', nombre: 'María', apellido: 'López', dni: '32123456', area: 'Administración', rol: 'usuario' },
    { mail: 'juan.perez@isep.edu.ar', nombre: 'Juan', apellido: 'Pérez', dni: '33456789', area: 'Pedagógico', rol: 'usuario' },
    { mail: 'ana.rodriguez@isep.edu.ar', nombre: 'Ana', apellido: 'Rodríguez', dni: '34567890', area: 'Biblioteca', rol: 'usuario' },
    { mail: 'pedro.sanchez@isep.edu.ar', nombre: 'Pedro', apellido: 'Sánchez', dni: '35678901', area: 'Secretaría Académica', rol: 'usuario' },
    { mail: 'lucia.garcia@isep.edu.ar', nombre: 'Lucía', apellido: 'García', dni: '36789012', area: 'Dirección', rol: 'usuario' },
    { mail: 'martin.torres@isep.edu.ar', nombre: 'Martín', apellido: 'Torres', dni: '37890123', area: 'Pedagógico', rol: 'usuario' },
    { mail: 'sofia.diaz@isep.edu.ar', nombre: 'Sofía', apellido: 'Díaz', dni: '38901234', area: 'Extensión', rol: 'usuario' },
    { mail: 'gabriel.ruiz@isep.edu.ar', nombre: 'Gabriel', apellido: 'Ruiz', dni: '39012345', area: 'Investigación', rol: 'usuario' },
    { mail: 'valentina.castro@isep.edu.ar', nombre: 'Valentina', apellido: 'Castro', dni: '40123456', area: 'Administración', rol: 'usuario' },
    { mail: 'nicolas.moreno@isep.edu.ar', nombre: 'Nicolás', apellido: 'Moreno', dni: '41234567', area: 'Pedagógico', rol: 'usuario' },
  ];

  const insertUsuario = db.prepare(`
    INSERT INTO usuarios (mail, nombre, apellido, dni, area_equipo, rol)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const todosUsuarios = [...usuariosIt, ...usuariosRegulares];
  todosUsuarios.forEach(u => {
    insertUsuario.run(u.mail, u.nombre, u.apellido, u.dni, u.area, u.rol);
  });

  console.log(`Insertados ${todosUsuarios.length} usuarios...`);

  // Insertar insumos
  const insumos = [
    { tipologia: 'Notebook', nombre: 'Lenovo ThinkPad T14', descripcion: 'Intel i5, 8GB RAM, 256GB SSD', numero_serie: 'LNV-T14-001' },
    { tipologia: 'Notebook', nombre: 'Lenovo ThinkPad T14', descripcion: 'Intel i5, 8GB RAM, 256GB SSD', numero_serie: 'LNV-T14-002' },
    { tipologia: 'Notebook', nombre: 'HP ProBook 450', descripcion: 'Intel i5, 16GB RAM, 512GB SSD', numero_serie: 'HP-PB450-001' },
    { tipologia: 'Notebook', nombre: 'Dell Latitude 5420', descripcion: 'Intel i7, 16GB RAM, 256GB SSD', numero_serie: 'DELL-L5420-001' },
    { tipologia: 'Notebook', nombre: 'Acer TravelMate P2', descripcion: 'Intel i3, 8GB RAM, 256GB SSD', numero_serie: 'ACR-TMP2-001' },
    { tipologia: 'Mouse', nombre: 'Logitech M185', descripcion: 'Mouse inalámbrico', numero_serie: null },
    { tipologia: 'Mouse', nombre: 'Logitech M185', descripcion: 'Mouse inalámbrico', numero_serie: null },
    { tipologia: 'Mouse', nombre: 'Microsoft Basic', descripcion: 'Mouse USB con cable', numero_serie: null },
    { tipologia: 'Teclado', nombre: 'Logitech K120', descripcion: 'Teclado USB español', numero_serie: null },
    { tipologia: 'Teclado', nombre: 'Microsoft Wired 600', descripcion: 'Teclado USB español', numero_serie: null },
    { tipologia: 'Monitor', nombre: 'LG 24MK430H', descripcion: 'Monitor 24 pulgadas Full HD', numero_serie: 'LG-24MK-001' },
    { tipologia: 'Monitor', nombre: 'Samsung S24F350', descripcion: 'Monitor 24 pulgadas Full HD', numero_serie: 'SAM-S24-001' },
    { tipologia: 'Proyector', nombre: 'Epson PowerLite E20', descripcion: 'Proyector 3400 lúmenes XGA', numero_serie: 'EPS-E20-001' },
    { tipologia: 'Proyector', nombre: 'ViewSonic PA503S', descripcion: 'Proyector 3600 lúmenes SVGA', numero_serie: 'VS-PA503-001' },
    { tipologia: 'Cable HDMI', nombre: 'Cable HDMI 3m', descripcion: 'Cable HDMI 2.0 macho-macho', numero_serie: null },
    { tipologia: 'Cable HDMI', nombre: 'Cable HDMI 5m', descripcion: 'Cable HDMI 2.0 macho-macho', numero_serie: null },
    { tipologia: 'Cable VGA', nombre: 'Cable VGA 3m', descripcion: 'Cable VGA macho-macho', numero_serie: null },
    { tipologia: 'Webcam', nombre: 'Logitech C920', descripcion: 'Webcam Full HD 1080p', numero_serie: 'LOG-C920-001' },
    { tipologia: 'Webcam', nombre: 'Logitech C270', descripcion: 'Webcam HD 720p', numero_serie: 'LOG-C270-001' },
    { tipologia: 'Auriculares', nombre: 'Logitech H390', descripcion: 'Auriculares USB con micrófono', numero_serie: null },
  ];

  const insertInsumo = db.prepare(`
    INSERT INTO insumos (tipologia, nombre, descripcion, numero_serie, estado)
    VALUES (?, ?, ?, ?, 'Disponible')
  `);

  insumos.forEach(i => {
    insertInsumo.run(i.tipologia, i.nombre, i.descripcion, i.numero_serie);
  });

  console.log(`Insertados ${insumos.length} insumos...`);

  // Crear algunos préstamos de ejemplo

  // Función para crear fechas relativas
  const diasAtras = (dias) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return fecha.toISOString();
  };

  const prestamosEjemplo = [
    // Préstamos activos con diferentes días
    { usuario_id: 4, insumo_id: 1, usuario_it_id: 1, fecha: diasAtras(0), estado: 'Activo' }, // Hoy
    { usuario_id: 5, insumo_id: 3, usuario_it_id: 2, fecha: diasAtras(1), estado: 'Activo' }, // 1 día
    { usuario_id: 6, insumo_id: 6, usuario_it_id: 1, fecha: diasAtras(2), estado: 'Activo' }, // 2 días
    { usuario_id: 7, insumo_id: 11, usuario_it_id: 3, fecha: diasAtras(3), estado: 'Activo' }, // 3 días
    { usuario_id: 8, insumo_id: 13, usuario_it_id: 1, fecha: diasAtras(5), estado: 'Activo' }, // 5 días (crítico)
    { usuario_id: 9, insumo_id: 15, usuario_it_id: 2, fecha: diasAtras(0), estado: 'Activo' }, // Hoy

    // Préstamos devueltos (históricos)
    { usuario_id: 4, insumo_id: 2, usuario_it_id: 1, fecha: diasAtras(10), estado: 'Devuelto', devolucion: diasAtras(9) },
    { usuario_id: 5, insumo_id: 4, usuario_it_id: 2, fecha: diasAtras(15), estado: 'Devuelto', devolucion: diasAtras(14) },
    { usuario_id: 6, insumo_id: 7, usuario_it_id: 3, fecha: diasAtras(20), estado: 'Devuelto', devolucion: diasAtras(20) }, // Mismo día
    { usuario_id: 7, insumo_id: 9, usuario_it_id: 1, fecha: diasAtras(8), estado: 'Devuelto', devolucion: diasAtras(6) },
    { usuario_id: 10, insumo_id: 18, usuario_it_id: 2, fecha: diasAtras(5), estado: 'Devuelto', devolucion: diasAtras(5) }, // Mismo día
  ];

  const insertPrestamo = db.prepare(`
    INSERT INTO prestamos (usuario_id, insumo_id, usuario_it_id, fecha_hora_prestamo, fecha_hora_devolucion_real, estado)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const updateInsumoEstado = db.prepare(`UPDATE insumos SET estado = ? WHERE id = ?`);

  prestamosEjemplo.forEach(p => {
    insertPrestamo.run(
      p.usuario_id,
      p.insumo_id,
      p.usuario_it_id,
      p.fecha,
      p.devolucion || null,
      p.estado
    );

    if (p.estado === 'Activo') {
      updateInsumoEstado.run('En préstamo', p.insumo_id);
    }
  });

  console.log(`Insertados ${prestamosEjemplo.length} préstamos...`);

  // Poner algunos insumos en otros estados
  updateInsumoEstado.run('En mantenimiento', 5);
  updateInsumoEstado.run('Dado de baja', 10);

  console.log('Estados de insumos actualizados...');
  console.log('\\n¡Base de datos poblada exitosamente!');
  console.log('\\nResumen:');
  console.log(`  - ${usuariosIt.length} usuarios Soporte IT`);
  console.log(`  - ${usuariosRegulares.length} usuarios regulares`);
  console.log(`  - ${insumos.length} insumos`);
  console.log(`  - ${prestamosEjemplo.length} préstamos de ejemplo`);
}

// Inicializar y ejecutar
initialize();
seed();
