/**
 * Manejador de consultas y búsquedas
 */

const config = require('../config');
const menus = require('../keyboards/menus');
const { insumosApi, usuariosApi, prestamosApi } = require('../services/api');
const {
  formatInsumoDetalle,
  formatUsuarioDetalle,
  formatPrestamoDetalle,
} = require('../utils/formatters');

// Estados de consulta
const ESTADOS = {
  IDLE: 'idle',
  BUSCANDO_INSUMO: 'buscando_insumo',
  BUSCANDO_USUARIO: 'buscando_usuario',
};

// Sesiones de consulta
const consultaSessions = new Map();

/**
 * Obtiene o crea una sesión de consulta
 * @param {number} chatId
 * @returns {object}
 */
function getConsultaSession(chatId) {
  if (!consultaSessions.has(chatId)) {
    consultaSessions.set(chatId, {
      estado: ESTADOS.IDLE,
    });
  }
  return consultaSessions.get(chatId);
}

/**
 * Limpia la sesión de consulta
 * @param {number} chatId
 */
function clearConsultaSession(chatId) {
  consultaSessions.set(chatId, {
    estado: ESTADOS.IDLE,
  });
}

/**
 * Inicia búsqueda de insumo
 */
async function iniciarBusquedaInsumo(bot, chatId, isGroup = false) {
  const session = getConsultaSession(chatId);
  session.estado = ESTADOS.BUSCANDO_INSUMO;

  let mensaje = '🔍 *Buscar Insumo*\n\nEscribe el nombre, tipo o número de serie:';
  if (isGroup) {
    mensaje += '\n\n💡 _Respondé a este mensaje con tu búsqueda_';
  }

  await bot.sendMessage(
    chatId,
    mensaje,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        ...menus.botonCancelar(),
        force_reply: isGroup,
        selective: isGroup,
      },
    }
  );
}

/**
 * Inicia búsqueda de usuario
 */
async function iniciarBusquedaUsuario(bot, chatId, isGroup = false) {
  const session = getConsultaSession(chatId);
  session.estado = ESTADOS.BUSCANDO_USUARIO;

  let mensaje = '👤 *Buscar Usuario*\n\nEscribe el nombre, apellido o DNI:';
  if (isGroup) {
    mensaje += '\n\n💡 _Respondé a este mensaje con tu búsqueda_';
  }

  await bot.sendMessage(
    chatId,
    mensaje,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        ...menus.botonCancelar(),
        force_reply: isGroup,
        selective: isGroup,
      },
    }
  );
}

/**
 * Busca insumos y muestra resultados
 */
async function buscarInsumos(bot, chatId, busqueda) {
  try {
    const response = await insumosApi.getAll({
      busqueda,
      limit: 10,
    });

    if (!response.success || !response.data || response.data.length === 0) {
      await bot.sendMessage(chatId, config.messages.noResults, {
        reply_markup: menus.botonMenuPrincipal(),
      });
      clearConsultaSession(chatId);
      return;
    }

    const insumos = response.data;

    await bot.sendMessage(
      chatId,
      `📦 *Insumos Encontrados* (${insumos.length})\n\nSelecciona uno para ver detalles:`,
      {
        parse_mode: 'Markdown',
        reply_markup: menus.listaInsumos(insumos, 'ver_insumo'),
      }
    );
  } catch (error) {
    console.error('Error buscando insumos:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

/**
 * Busca usuarios y muestra resultados
 */
async function buscarUsuarios(bot, chatId, busqueda) {
  try {
    const response = await usuariosApi.buscar(busqueda, 10);

    if (!response.success || !response.data || response.data.length === 0) {
      await bot.sendMessage(chatId, config.messages.noResults, {
        reply_markup: menus.botonMenuPrincipal(),
      });
      clearConsultaSession(chatId);
      return;
    }

    const usuarios = response.data;

    await bot.sendMessage(
      chatId,
      `👥 *Usuarios Encontrados* (${usuarios.length})\n\nSelecciona uno para ver detalles:`,
      {
        parse_mode: 'Markdown',
        reply_markup: menus.listaUsuarios(usuarios, 'ver_usuario'),
      }
    );
  } catch (error) {
    console.error('Error buscando usuarios:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

/**
 * Muestra detalles de un insumo
 */
async function verDetalleInsumo(bot, chatId, insumoId) {
  try {
    const response = await insumosApi.getOne(insumoId);

    if (!response.success) {
      await bot.sendMessage(chatId, 'Insumo no encontrado.');
      return;
    }

    const insumo = response.data;
    let mensaje = formatInsumoDetalle(insumo);
    mensaje += `\n📊 *Estado:* ${insumo.estado}`;

    if (insumo.observaciones) {
      mensaje += `\n📝 *Observaciones:* ${insumo.observaciones}`;
    }

    // Si está en préstamo, mostrar info del préstamo activo
    if (insumo.estado === 'En préstamo') {
      try {
        const prestamoRes = await insumosApi.getOne(insumoId);
        // Nota: Aquí podrías agregar un endpoint para obtener el préstamo activo del insumo
      } catch (e) {
        // Ignorar
      }
    }

    const keyboard = {
      inline_keyboard: [],
    };

    if (insumo.estado === 'Disponible') {
      keyboard.inline_keyboard.push([
        { text: '📤 Prestar este insumo', callback_data: `sel_insumo_${insumo.id}` },
      ]);
    }

    keyboard.inline_keyboard.push([
      { text: '🔍 Buscar otro', callback_data: 'menu_buscar_insumo' },
      { text: '🏠 Menú', callback_data: 'menu_principal' },
    ]);

    await bot.sendMessage(chatId, mensaje, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });

    clearConsultaSession(chatId);
  } catch (error) {
    console.error('Error obteniendo insumo:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

/**
 * Muestra detalles de un usuario
 */
async function verDetalleUsuario(bot, chatId, usuarioId) {
  try {
    const response = await usuariosApi.getOne(usuarioId);

    if (!response.success) {
      await bot.sendMessage(chatId, 'Usuario no encontrado.');
      return;
    }

    const usuario = response.data;
    let mensaje = formatUsuarioDetalle(usuario);
    mensaje += `\n\n📊 *Estado:* ${usuario.activo ? 'Activo' : 'Inactivo'}`;
    mensaje += `\n👤 *Rol:* ${usuario.rol === 'soporte_it' ? 'Soporte IT' : 'Usuario'}`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔍 Buscar otro', callback_data: 'menu_buscar_usuario' },
          { text: '🏠 Menú', callback_data: 'menu_principal' },
        ],
      ],
    };

    await bot.sendMessage(chatId, mensaje, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });

    clearConsultaSession(chatId);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

/**
 * Muestra detalles de un préstamo
 */
async function verDetallePrestamo(bot, chatId, prestamoId) {
  try {
    const response = await prestamosApi.getOne(prestamoId);

    if (!response.success) {
      await bot.sendMessage(chatId, 'Préstamo no encontrado.');
      return;
    }

    const prestamo = response.data;
    const mensaje = formatPrestamoDetalle(prestamo);

    const keyboard = {
      inline_keyboard: [],
    };

    if (prestamo.estado === 'Activo') {
      keyboard.inline_keyboard.push([
        { text: '📥 Registrar Devolución', callback_data: `devolver_${prestamo.id}` },
      ]);
    }

    keyboard.inline_keyboard.push([
      { text: '📋 Ver Activos', callback_data: 'menu_activos' },
      { text: '🏠 Menú', callback_data: 'menu_principal' },
    ]);

    await bot.sendMessage(chatId, mensaje, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error('Error obteniendo préstamo:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

/**
 * Maneja los mensajes de texto durante consultas
 */
async function handleMessage(bot, msg) {
  const chatId = msg.chat.id;
  const texto = msg.text;

  // Ignorar comandos
  if (texto && texto.startsWith('/')) return false;

  const session = getConsultaSession(chatId);

  switch (session.estado) {
    case ESTADOS.BUSCANDO_INSUMO:
      await buscarInsumos(bot, chatId, texto);
      return true;

    case ESTADOS.BUSCANDO_USUARIO:
      await buscarUsuarios(bot, chatId, texto);
      return true;

    default:
      return false;
  }
}

/**
 * Maneja los callbacks de consultas
 */
async function handleCallback(bot, query) {
  const chatId = query.message.chat.id;
  const data = query.data;

  // Ver detalle de insumo
  if (data.startsWith('ver_insumo_')) {
    const insumoId = parseInt(data.replace('ver_insumo_', ''));
    await bot.answerCallbackQuery(query.id);
    await verDetalleInsumo(bot, chatId, insumoId);
    return true;
  }

  // Ver detalle de usuario
  if (data.startsWith('ver_usuario_')) {
    const usuarioId = parseInt(data.replace('ver_usuario_', ''));
    await bot.answerCallbackQuery(query.id);
    await verDetalleUsuario(bot, chatId, usuarioId);
    return true;
  }

  // Ver detalle de préstamo
  if (data.startsWith('ver_prestamo_')) {
    const prestamoId = parseInt(data.replace('ver_prestamo_', ''));
    await bot.answerCallbackQuery(query.id);
    await verDetallePrestamo(bot, chatId, prestamoId);
    return true;
  }

  return false;
}

module.exports = {
  ESTADOS,
  getConsultaSession,
  clearConsultaSession,
  iniciarBusquedaInsumo,
  iniciarBusquedaUsuario,
  buscarInsumos,
  buscarUsuarios,
  verDetalleInsumo,
  verDetalleUsuario,
  verDetallePrestamo,
  handleMessage,
  handleCallback,
};
