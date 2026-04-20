/**
 * Script para poblar la base de datos con datos de ejemplo
 * Ejecutar: node seed.js
 */

const { getDb, initialize } = require('./database');

function seed() {
  const db = getDb();

  // Limpiar tablas
  db.exec('DELETE FROM prestamos');
  db.exec('DELETE FROM inventario');
  db.exec('DELETE FROM usuarios');
  db.exec('DELETE FROM categorias');
  db.exec('DELETE FROM tipos');
  db.exec('DELETE FROM estados');
  db.exec('DELETE FROM ubicaciones');
  db.exec('DELETE FROM areas');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('usuarios', 'inventario', 'prestamos', 'categorias', 'tipos', 'estados', 'ubicaciones', 'areas')");

  console.log('Tablas limpiadas...');

  // Estados
  const estadosData = ['Disponible', 'Asignado', 'En reparación', 'Dañado', 'Extraviado'];
  const insertEstado = db.prepare('INSERT INTO estados (desc) VALUES (?)');
  estadosData.forEach(d => insertEstado.run(d));

  const getEstadoId = (desc) => db.prepare('SELECT id FROM estados WHERE desc = ?').get(desc).id;
  const ESTADO_DISPONIBLE = getEstadoId('Disponible');
  const ESTADO_ASIGNADO = getEstadoId('Asignado');
  const ESTADO_REPARACION = getEstadoId('En reparación');
  const ESTADO_DANADO = getEstadoId('Dañado');

  console.log('Estados insertados...');

  // Tipos
  const tiposData = ['Activo', 'Accesorio', 'Consumible', 'Componente', 'Licencia'];
  const insertTipo = db.prepare('INSERT INTO tipos (desc) VALUES (?)');
  tiposData.forEach(d => insertTipo.run(d));

  const getTipoId = (desc) => db.prepare('SELECT id FROM tipos WHERE desc = ?').get(desc).id;
  const TIPO_ACTIVO = getTipoId('Activo');
  const TIPO_ACCESORIO = getTipoId('Accesorio');
  const TIPO_CONSUMIBLE = getTipoId('Consumible');

  console.log('Tipos insertados...');

  // Categorías
  const categoriasData = ['Notebook', 'Netbook', 'PC Escritorio', 'Proyector', 'Mouse', 'Teclado', 'Monitor', 'Cable HDMI', 'Cable VGA', 'Webcam', 'Auriculares', 'Otro'];
  const insertCategoria = db.prepare('INSERT INTO categorias (desc) VALUES (?)');
  categoriasData.forEach(d => insertCategoria.run(d));

  const getCatId = (desc) => db.prepare('SELECT id FROM categorias WHERE desc = ?').get(desc).id;

  console.log('Categorías insertadas...');

  // Áreas
  const areasData = ['Soporte IT', 'Administración', 'Pedagógico', 'Biblioteca', 'Secretaría Académica', 'Dirección', 'Extensión', 'Investigación'];
  const insertArea = db.prepare('INSERT INTO areas (desc) VALUES (?)');
  areasData.forEach(d => insertArea.run(d));

  const getAreaId = (desc) => db.prepare('SELECT id FROM areas WHERE desc = ?').get(desc).id;

  console.log('Áreas insertadas...');

  // Ubicaciones
  const ubicacionesData = [
    { desc: 'Depósito Central', piso: 'PB' },
    { desc: 'Sala de Reuniones A', piso: '1° Piso' },
    { desc: 'Aula 101', piso: '1° Piso' },
    { desc: 'Oficina Dirección', piso: '2° Piso' },
  ];
  const insertUb = db.prepare('INSERT INTO ubicaciones (desc, piso) VALUES (?, ?)');
  ubicacionesData.forEach(u => insertUb.run(u.desc, u.piso));

  console.log('Ubicaciones insertadas...');

  // Usuarios Soporte IT
  const usuariosIt = [
    { mail: 'carlos.martinez@isep.edu.ar', nombre: 'Carlos', apellido: 'Martínez', dni: '28456789', id_area: getAreaId('Soporte IT'), rol: 'soporte_it' },
    { mail: 'laura.gomez@isep.edu.ar', nombre: 'Laura', apellido: 'Gómez', dni: '31234567', id_area: getAreaId('Soporte IT'), rol: 'soporte_it' },
    { mail: 'diego.fernandez@isep.edu.ar', nombre: 'Diego', apellido: 'Fernández', dni: '29876543', id_area: getAreaId('Soporte IT'), rol: 'soporte_it' },
  ];

  // Usuarios regulares
  const usuariosRegulares = [
    { mail: 'maria.lopez@isep.edu.ar', nombre: 'María', apellido: 'López', dni: '32123456', id_area: getAreaId('Administración'), rol: 'usuario' },
    { mail: 'juan.perez@isep.edu.ar', nombre: 'Juan', apellido: 'Pérez', dni: '33456789', id_area: getAreaId('Pedagógico'), rol: 'usuario' },
    { mail: 'ana.rodriguez@isep.edu.ar', nombre: 'Ana', apellido: 'Rodríguez', dni: '34567890', id_area: getAreaId('Biblioteca'), rol: 'usuario' },
    { mail: 'pedro.sanchez@isep.edu.ar', nombre: 'Pedro', apellido: 'Sánchez', dni: '35678901', id_area: getAreaId('Secretaría Académica'), rol: 'usuario' },
    { mail: 'lucia.garcia@isep.edu.ar', nombre: 'Lucía', apellido: 'García', dni: '36789012', id_area: getAreaId('Dirección'), rol: 'usuario' },
    { mail: 'martin.torres@isep.edu.ar', nombre: 'Martín', apellido: 'Torres', dni: '37890123', id_area: getAreaId('Pedagógico'), rol: 'usuario' },
    { mail: 'sofia.diaz@isep.edu.ar', nombre: 'Sofía', apellido: 'Díaz', dni: '38901234', id_area: getAreaId('Extensión'), rol: 'usuario' },
    { mail: 'gabriel.ruiz@isep.edu.ar', nombre: 'Gabriel', apellido: 'Ruiz', dni: '39012345', id_area: getAreaId('Investigación'), rol: 'usuario' },
    { mail: 'valentina.castro@isep.edu.ar', nombre: 'Valentina', apellido: 'Castro', dni: '40123456', id_area: getAreaId('Administración'), rol: 'usuario' },
    { mail: 'nicolas.moreno@isep.edu.ar', nombre: 'Nicolás', apellido: 'Moreno', dni: '41234567', id_area: getAreaId('Pedagógico'), rol: 'usuario' },
  ];

  const insertUsuario = db.prepare('INSERT INTO usuarios (mail, nombre, apellido, dni, id_area, rol) VALUES (?, ?, ?, ?, ?, ?)');
  const todosUsuarios = [...usuariosIt, ...usuariosRegulares];
  todosUsuarios.forEach(u => insertUsuario.run(u.mail, u.nombre, u.apellido, u.dni, u.id_area, u.rol));

  console.log(`Insertados ${todosUsuarios.length} usuarios...`);

  // Inventario
  const inventarioData = [
    { id_tipo: TIPO_ACTIVO, id_categoria: getCatId('Notebook'), condicion: 'Entregable', fabricante: 'Lenovo', modelo: 'ThinkPad T14', serie: 'LNV-T14-001' },
    { id_tipo: TIPO_ACTIVO, id_categoria: getCatId('Notebook'), condicion: 'Entregable', fabricante: 'Lenovo', modelo: 'ThinkPad T14', serie: 'LNV-T14-002' },
    { id_tipo: TIPO_ACTIVO, id_categoria: getCatId('Notebook'), condicion: 'Entregable', fabricante: 'HP', modelo: 'ProBook 450', serie: 'HP-PB450-001' },
    { id_tipo: TIPO_ACTIVO, id_categoria: getCatId('Notebook'), condicion: 'Entregable', fabricante: 'Dell', modelo: 'Latitude 5420', serie: 'DELL-L5420-001' },
    { id_tipo: TIPO_ACTIVO, id_categoria: getCatId('Notebook'), condicion: 'Entregable', fabricante: 'Acer', modelo: 'TravelMate P2', serie: 'ACR-TMP2-001' },
    { id_tipo: TIPO_ACCESORIO, id_categoria: getCatId('Mouse'), condicion: 'Entregable', fabricante: 'Logitech', modelo: 'M185', serie: null },
    { id_tipo: TIPO_ACCESORIO, id_categoria: getCatId('Mouse'), condicion: 'Entregable', fabricante: 'Logitech', modelo: 'M185', serie: null },
    { id_tipo: TIPO_ACCESORIO, id_categoria: getCatId('Mouse'), condicion: 'Entregable', fabricante: 'Microsoft', modelo: 'Basic Optical', serie: null },
    { id_tipo: TIPO_ACCESORIO, id_categoria: getCatId('Teclado'), condicion: 'Entregable', fabricante: 'Logitech', modelo: 'K120', serie: null },
    { id_tipo: TIPO_ACCESORIO, id_categoria: getCatId('Teclado'), condicion: 'Entregable', fabricante: 'Microsoft', modelo: 'Wired 600', serie: null },
    { id_tipo: TIPO_ACTIVO, id_categoria: getCatId('Monitor'), condicion: 'Asignable', fabricante: 'LG', modelo: '24MK430H', serie: 'LG-24MK-001' },
    { id_tipo: TIPO_ACTIVO, id_categoria: getCatId('Monitor'), condicion: 'Asignable', fabricante: 'Samsung', modelo: 'S24F350', serie: 'SAM-S24-001' },
    { id_tipo: TIPO_ACTIVO, id_categoria: getCatId('Proyector'), condicion: 'Entregable', fabricante: 'Epson', modelo: 'PowerLite E20', serie: 'EPS-E20-001' },
    { id_tipo: TIPO_ACTIVO, id_categoria: getCatId('Proyector'), condicion: 'Entregable', fabricante: 'ViewSonic', modelo: 'PA503S', serie: 'VS-PA503-001' },
    { id_tipo: TIPO_CONSUMIBLE, id_categoria: getCatId('Cable HDMI'), condicion: 'Entregable', fabricante: null, modelo: 'Cable HDMI 3m', serie: null },
    { id_tipo: TIPO_CONSUMIBLE, id_categoria: getCatId('Cable HDMI'), condicion: 'Entregable', fabricante: null, modelo: 'Cable HDMI 5m', serie: null },
    { id_tipo: TIPO_CONSUMIBLE, id_categoria: getCatId('Cable VGA'), condicion: 'Entregable', fabricante: null, modelo: 'Cable VGA 3m', serie: null },
    { id_tipo: TIPO_ACCESORIO, id_categoria: getCatId('Webcam'), condicion: 'Entregable', fabricante: 'Logitech', modelo: 'C920', serie: 'LOG-C920-001' },
    { id_tipo: TIPO_ACCESORIO, id_categoria: getCatId('Webcam'), condicion: 'Entregable', fabricante: 'Logitech', modelo: 'C270', serie: 'LOG-C270-001' },
    { id_tipo: TIPO_ACCESORIO, id_categoria: getCatId('Auriculares'), condicion: 'Entregable', fabricante: 'Logitech', modelo: 'H390', serie: null },
  ];

  const insertInv = db.prepare(`
    INSERT INTO inventario (id_tipo, id_categoria, condicion, fabricante, modelo, serie, id_estado)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  inventarioData.forEach(i => insertInv.run(i.id_tipo, i.id_categoria, i.condicion, i.fabricante, i.modelo, i.serie, ESTADO_DISPONIBLE));

  console.log(`Insertados ${inventarioData.length} items de inventario...`);

  // Préstamos de ejemplo
  const diasAtras = (dias) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return fecha.toISOString();
  };

  const prestamosEjemplo = [
    { usuario_id: 4, inventario_id: 1, usuario_it_id: 1, fecha: diasAtras(0), estado: 'Activo' },
    { usuario_id: 5, inventario_id: 3, usuario_it_id: 2, fecha: diasAtras(1), estado: 'Activo' },
    { usuario_id: 6, inventario_id: 6, usuario_it_id: 1, fecha: diasAtras(2), estado: 'Activo' },
    { usuario_id: 7, inventario_id: 13, usuario_it_id: 3, fecha: diasAtras(3), estado: 'Activo' },
    { usuario_id: 8, inventario_id: 15, usuario_it_id: 1, fecha: diasAtras(5), estado: 'Activo' },
    { usuario_id: 9, inventario_id: 17, usuario_it_id: 2, fecha: diasAtras(0), estado: 'Activo' },
    // Devueltos
    { usuario_id: 4, inventario_id: 2, usuario_it_id: 1, fecha: diasAtras(10), estado: 'Devuelto', devolucion: diasAtras(9) },
    { usuario_id: 5, inventario_id: 4, usuario_it_id: 2, fecha: diasAtras(15), estado: 'Devuelto', devolucion: diasAtras(14) },
    { usuario_id: 6, inventario_id: 7, usuario_it_id: 3, fecha: diasAtras(20), estado: 'Devuelto', devolucion: diasAtras(20) },
    { usuario_id: 7, inventario_id: 9, usuario_it_id: 1, fecha: diasAtras(8), estado: 'Devuelto', devolucion: diasAtras(6) },
    { usuario_id: 10, inventario_id: 18, usuario_it_id: 2, fecha: diasAtras(5), estado: 'Devuelto', devolucion: diasAtras(5) },
  ];

  const insertPrestamo = db.prepare(`
    INSERT INTO prestamos (usuario_id, inventario_id, usuario_it_id, fecha_hora_prestamo, fecha_hora_devolucion_real, estado)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const updateInvEstado = db.prepare('UPDATE inventario SET id_estado = ? WHERE id = ?');

  prestamosEjemplo.forEach(p => {
    insertPrestamo.run(p.usuario_id, p.inventario_id, p.usuario_it_id, p.fecha, p.devolucion || null, p.estado);
    if (p.estado === 'Activo') updateInvEstado.run(ESTADO_ASIGNADO, p.inventario_id);
  });

  console.log(`Insertados ${prestamosEjemplo.length} préstamos...`);

  // Estados especiales
  updateInvEstado.run(ESTADO_REPARACION, 5);
  updateInvEstado.run(ESTADO_DANADO, 10);

  console.log('\n¡Base de datos poblada exitosamente!');
  console.log(`  - ${usuariosIt.length} usuarios Soporte IT`);
  console.log(`  - ${usuariosRegulares.length} usuarios regulares`);
  console.log(`  - ${inventarioData.length} items de inventario`);
  console.log(`  - ${prestamosEjemplo.length} préstamos de ejemplo`);
}

initialize();
seed();
