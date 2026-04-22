/**
 * Definición de teclados inline para el bot
 */

const { getIconoTipologia, getDiasTranscurridos } = require('../utils/formatters');
const config = require('../config');

/**
 * Menú principal del bot
 */
function menuPrincipal() {
  return {
    inline_keyboard: [
      [
        { text: '📤 Nuevo Préstamo', callback_data: 'menu_prestar' },
        { text: '📥 Devolución', callback_data: 'menu_devolver' },
      ],
      [
        { text: '🏢 Asignar Insumo', callback_data: 'menu_asignar' },
        { text: '🔓 Liberar Asignación', callback_data: 'menu_liberar' },
      ],
      [
        { text: '📋 Préstamos Activos', callback_data: 'menu_activos' },
        { text: '🏢 Asignaciones', callback_data: 'menu_asignaciones' },
      ],
      [
        { text: '🔍 Buscar Insumo', callback_data: 'menu_buscar_insumo' },
        { text: '👤 Buscar Usuario', callback_data: 'menu_buscar_usuario' },
      ],
      [
        { text: '📊 Resumen del Día', callback_data: 'menu_resumen' },
      ],
    ],
  };
}

/**
 * Botón para volver al menú principal
 */
function botonMenuPrincipal() {
  return {
    inline_keyboard: [
      [{ text: '🏠 Menú Principal', callback_data: 'menu_principal' }],
    ],
  };
}

/**
 * Botón para cancelar operación
 */
function botonCancelar() {
  return {
    inline_keyboard: [
      [{ text: '❌ Cancelar', callback_data: 'cancelar' }],
    ],
  };
}

/**
 * Botones de confirmación
 * @param {string} confirmarCallback - Callback data para confirmar
 * @param {string} cancelarCallback - Callback data para cancelar (opcional)
 */
function botonesConfirmacion(confirmarCallback, cancelarCallback = 'cancelar') {
  return {
    inline_keyboard: [
      [
        { text: '✅ Confirmar', callback_data: confirmarCallback },
        { text: '❌ Cancelar', callback_data: cancelarCallback },
      ],
    ],
  };
}

/**
 * Teclado con lista de insumos disponibles
 * @param {object[]} insumos - Lista de insumos
 * @param {string} callbackPrefix - Prefijo para el callback_data
 */
function listaInsumos(insumos, callbackPrefix = 'insumo') {
  const keyboard = insumos.slice(0, 10).map((insumo, index) => {
    const cat = insumo.categoria_desc || insumo.tipologia || '';
    const icono = getIconoTipologia(cat);
    const nombre = [insumo.fabricante, insumo.modelo].filter(Boolean).join(' ') || insumo.nombre || '-';
    const serie = (insumo.serie || insumo.numero_serie) ? ` - ${insumo.serie || insumo.numero_serie}` : '';
    const text = `${icono} ${nombre}${serie}`.substring(0, 60);
    return [{ text, callback_data: `${callbackPrefix}_${insumo.id}` }];
  });

  // Agregar botón cancelar
  keyboard.push([{ text: '❌ Cancelar', callback_data: 'cancelar' }]);

  return { inline_keyboard: keyboard };
}

/**
 * Teclado con lista de usuarios
 * @param {object[]} usuarios - Lista de usuarios
 * @param {string} callbackPrefix - Prefijo para el callback_data
 */
function listaUsuarios(usuarios, callbackPrefix = 'usuario') {
  const keyboard = usuarios.slice(0, 10).map((usuario, index) => {
    const text = `👤 ${usuario.apellido}, ${usuario.nombre} (${usuario.area_desc || usuario.area_equipo || '-'})`.substring(0, 60);
    return [{ text, callback_data: `${callbackPrefix}_${usuario.id}` }];
  });

  // Agregar botón cancelar
  keyboard.push([{ text: '❌ Cancelar', callback_data: 'cancelar' }]);

  return { inline_keyboard: keyboard };
}

/**
 * Teclado con lista de usuarios de soporte IT
 * @param {object[]} usuarios - Lista de usuarios IT
 * @param {string} callbackPrefix - Prefijo para el callback_data
 */
function listaUsuariosIt(usuarios, callbackPrefix = 'it') {
  const keyboard = usuarios.map((usuario) => {
    const text = `👨‍💼 ${usuario.nombre} ${usuario.apellido}`;
    return [{ text, callback_data: `${callbackPrefix}_${usuario.id}` }];
  });

  // Agregar botón cancelar
  keyboard.push([{ text: '❌ Cancelar', callback_data: 'cancelar' }]);

  return { inline_keyboard: keyboard };
}

/**
 * Teclado con lista de préstamos activos para devolución
 * @param {object[]} prestamos - Lista de préstamos activos
 */
function listaPrestamosDevolucion(prestamos) {
  const keyboard = prestamos.slice(0, 10).map((prestamo) => {
    const cat = prestamo.inventario_categoria || prestamo.insumo_tipologia || prestamo.tipologia || '';
    const icono = getIconoTipologia(cat);
    const nombre = prestamo.inventario_descripcion
      || [prestamo.inventario_fabricante, prestamo.inventario_modelo].filter(Boolean).join(' ')
      || prestamo.insumo_nombre || '-';
    const dias = getDiasTranscurridos(prestamo.fecha_hora_prestamo);
    const critico = dias >= config.alerts.diasCriticos ? ' ⚠️' : '';
    const text = `${icono} ${nombre} - ${prestamo.usuario_nombre} (${dias}d)${critico}`.substring(0, 60);
    return [{ text, callback_data: `devolver_${prestamo.id}` }];
  });

  // Agregar botón cancelar
  keyboard.push([{ text: '❌ Cancelar', callback_data: 'cancelar' }]);

  return { inline_keyboard: keyboard };
}

/**
 * Teclado después de crear un préstamo
 */
function postPrestamo() {
  return {
    inline_keyboard: [
      [
        { text: '📤 Otro Préstamo', callback_data: 'menu_prestar' },
        { text: '📋 Ver Activos', callback_data: 'menu_activos' },
      ],
      [{ text: '🏠 Menú Principal', callback_data: 'menu_principal' }],
    ],
  };
}

/**
 * Teclado después de registrar una devolución
 */
function postDevolucion() {
  return {
    inline_keyboard: [
      [
        { text: '📥 Otra Devolución', callback_data: 'menu_devolver' },
        { text: '📋 Ver Activos', callback_data: 'menu_activos' },
      ],
      [{ text: '🏠 Menú Principal', callback_data: 'menu_principal' }],
    ],
  };
}

/**
 * Botón para omitir paso opcional
 * @param {string} callback - Callback data
 */
function botonOmitir(callback = 'omitir') {
  return {
    inline_keyboard: [
      [{ text: '⏭️ Omitir', callback_data: callback }],
      [{ text: '❌ Cancelar', callback_data: 'cancelar' }],
    ],
  };
}

/**
 * Teclado para la lista de préstamos activos con acciones
 * @param {object[]} prestamos - Lista de préstamos
 */
function listaActivosConAcciones(prestamos) {
  const keyboard = [];

  prestamos.slice(0, 8).forEach((prestamo) => {
    const cat = prestamo.inventario_categoria || prestamo.insumo_tipologia || prestamo.tipologia || '';
    const icono = getIconoTipologia(cat);
    const dias = getDiasTranscurridos(prestamo.fecha_hora_prestamo);
    const critico = dias >= config.alerts.diasCriticos ? ' ⚠️' : '';
    const nombre = (
      prestamo.inventario_descripcion ||
      [prestamo.inventario_fabricante, prestamo.inventario_modelo].filter(Boolean).join(' ') ||
      prestamo.insumo_nombre || prestamo.nombre || '-'
    ).substring(0, 25);
    const usuario = (prestamo.usuario_apellido || '').substring(0, 10);

    keyboard.push([
      { text: `${icono} ${nombre} - ${usuario} (${dias}d)${critico}`, callback_data: `ver_prestamo_${prestamo.id}` },
      { text: '📥', callback_data: `devolver_${prestamo.id}` },
    ]);
  });

  keyboard.push([
    { text: '🔄 Actualizar', callback_data: 'menu_activos' },
    { text: '🏠 Menú', callback_data: 'menu_principal' },
  ]);

  return { inline_keyboard: keyboard };
}

/**
 * Teclado con lista de ubicaciones
 */
function listaUbicaciones(ubicaciones, callbackPrefix = 'ubi') {
  const keyboard = ubicaciones.slice(0, 20).map((u) => {
    const piso = u.piso ? ` (${u.piso})` : '';
    const text = `📍 ${u.desc}${piso}`.substring(0, 60);
    return [{ text, callback_data: `${callbackPrefix}_${u.id}` }];
  });
  keyboard.push([{ text: '❌ Cancelar', callback_data: 'cancelar' }]);
  return { inline_keyboard: keyboard };
}

/**
 * Teclado con lista de items asignables disponibles
 */
function listaInventarioAsignable(items, callbackPrefix = 'sel_asig_item') {
  const keyboard = items.slice(0, 10).map((item) => {
    const cat = item.categoria_desc || '';
    const icono = getIconoTipologia(cat);
    const nombre = [item.fabricante, item.modelo].filter(Boolean).join(' ') || '-';
    const serie = item.serie ? ` - ${item.serie}` : '';
    const text = `${icono} ${nombre}${serie}`.substring(0, 60);
    return [{ text, callback_data: `${callbackPrefix}_${item.id}` }];
  });
  keyboard.push([{ text: '❌ Cancelar', callback_data: 'cancelar' }]);
  return { inline_keyboard: keyboard };
}

/**
 * Teclado con lista de items asignados (para liberar)
 */
function listaAsignacionesLiberar(items, callbackPrefix = 'sel_liberar') {
  const keyboard = items.slice(0, 10).map((item) => {
    const cat = item.categoria_desc || '';
    const icono = getIconoTipologia(cat);
    const nombre = [item.fabricante, item.modelo].filter(Boolean).join(' ') || '-';
    const ubi = item.ubicacion_desc ? ` @ ${item.ubicacion_desc}` : '';
    const text = `${icono} ${nombre}${ubi}`.substring(0, 60);
    return [{ text, callback_data: `${callbackPrefix}_${item.id}` }];
  });
  keyboard.push([{ text: '❌ Cancelar', callback_data: 'cancelar' }]);
  return { inline_keyboard: keyboard };
}

/**
 * Teclado con botón "Omitir persona" + cancelar (para asignaciones)
 */
function botonOmitirPersona() {
  return {
    inline_keyboard: [
      [{ text: '⏭️ Omitir (sin persona)', callback_data: 'omitir_persona' }],
      [{ text: '❌ Cancelar', callback_data: 'cancelar' }],
    ],
  };
}

/**
 * Teclado después de asignar/liberar
 */
function postAsignacion() {
  return {
    inline_keyboard: [
      [
        { text: '🏢 Otra Asignación', callback_data: 'menu_asignar' },
        { text: '📋 Ver Asignaciones', callback_data: 'menu_asignaciones' },
      ],
      [{ text: '🏠 Menú Principal', callback_data: 'menu_principal' }],
    ],
  };
}

module.exports = {
  menuPrincipal,
  botonMenuPrincipal,
  botonCancelar,
  botonesConfirmacion,
  listaInsumos,
  listaUsuarios,
  listaUsuariosIt,
  listaPrestamosDevolucion,
  postPrestamo,
  postDevolucion,
  botonOmitir,
  listaActivosConAcciones,
  listaUbicaciones,
  listaInventarioAsignable,
  listaAsignacionesLiberar,
  botonOmitirPersona,
  postAsignacion,
};
