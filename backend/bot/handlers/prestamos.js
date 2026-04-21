/**
 * Manejador del flujo de préstamos
 */

const config = require('../config');
const menus = require('../keyboards/menus');
const { insumosApi, usuariosApi, prestamosApi } = require('../services/api');
const {
  formatInsumoDetalle,
  formatUsuarioDetalle,
  formatConfirmacionPrestamo,
} = require('../utils/formatters');

// Estados del flujo de préstamo
const ESTADOS = {
  IDLE: 'idle',
  BUSCANDO_INSUMO: 'buscando_insumo',
  BUSCANDO_USUARIO: 'buscando_usuario',
  SELECCIONANDO_IT: 'seleccionando_it',
  CONFIRMANDO: 'confirmando',
};

// Almacén de sesiones de usuario (en memoria)
// En producción, considerar usar Redis
const sessions = new Map();

/**
 * Obtiene o crea una sesión para un usuario
 * @param {number} chatId
 * @returns {object}
 */
function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, {
      estado: ESTADOS.IDLE,
      insumo: null,
      usuario: null,
      responsableIt: null,
      observaciones: null,
    });
  }
  return sessions.get(chatId);
}

/**
 * Limpia la sesión de un usuario
 * @param {number} chatId
 */
function clearSession(chatId) {
  sessions.set(chatId, {
    estado: ESTADOS.IDLE,
    insumo: null,
    usuario: null,
    responsableIt: null,
    observaciones: null,
  });
}

/**
 * Inicia el flujo de préstamo
 */
async function iniciarPrestamo(bot, chatId, isGroup = false) {
  const session = getSession(chatId);
  session.estado = ESTADOS.BUSCANDO_INSUMO;
  session.insumo = null;
  session.usuario = null;
  session.responsableIt = null;
  session.isGroup = isGroup;

  let mensaje = '🔍 *Buscar Insumo Disponible*\n\nEscribe el nombre, tipo o número de serie del insumo:';
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
 * Busca insumos disponibles
 */
async function buscarInsumos(bot, chatId, busqueda) {
  try {
    const response = await insumosApi.getDisponibles(busqueda);

    if (!response.success || !response.data || response.data.length === 0) {
      await bot.sendMessage(chatId, `${config.messages.noResults}\n\nIntenta con otro término de búsqueda:`, {
        reply_markup: menus.botonCancelar(),
      });
      return;
    }

    const insumos = response.data;

    await bot.sendMessage(
      chatId,
      `📦 *Insumos Disponibles* (${insumos.length})\n\nSelecciona el insumo a prestar:`,
      {
        parse_mode: 'Markdown',
        reply_markup: menus.listaInsumos(insumos, 'sel_insumo'),
      }
    );
  } catch (error) {
    console.error('Error buscando insumos:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

/**
 * Selecciona un insumo para el préstamo
 */
async function seleccionarInsumo(bot, chatId, insumoId) {
  const session = getSession(chatId);

  try {
    const response = await insumosApi.getOne(insumoId);

    if (!response.success) {
      await bot.sendMessage(chatId, 'Insumo no encontrado. Intenta nuevamente.');
      return;
    }

    session.insumo = response.data;
    session.estado = ESTADOS.BUSCANDO_USUARIO;

    const insumoInfo = formatInsumoDetalle(session.insumo);
    const isGroup = session.isGroup || false;

    let mensaje = `✅ *Insumo Seleccionado*\n\n${insumoInfo}\n\n👤 *Buscar Usuario*\nEscribe el nombre, apellido o DNI del usuario que recibirá el préstamo:`;
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
  } catch (error) {
    console.error('Error seleccionando insumo:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

/**
 * Busca usuarios
 */
async function buscarUsuarios(bot, chatId, busqueda) {
  try {
    const response = await usuariosApi.buscar(busqueda, 10);

    if (!response.success || !response.data || response.data.length === 0) {
      await bot.sendMessage(chatId, `${config.messages.noResults}\n\nIntenta con otro término de búsqueda:`, {
        reply_markup: menus.botonCancelar(),
      });
      return;
    }

    const usuarios = response.data;

    await bot.sendMessage(
      chatId,
      `👥 *Usuarios Encontrados* (${usuarios.length})\n\nSelecciona el usuario:`,
      {
        parse_mode: 'Markdown',
        reply_markup: menus.listaUsuarios(usuarios, 'sel_usuario'),
      }
    );
  } catch (error) {
    console.error('Error buscando usuarios:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

/**
 * Selecciona un usuario para el préstamo
 */
async function seleccionarUsuario(bot, chatId, usuarioId) {
  const session = getSession(chatId);

  try {
    const response = await usuariosApi.getOne(usuarioId);

    if (!response.success) {
      await bot.sendMessage(chatId, 'Usuario no encontrado. Intenta nuevamente.');
      return;
    }

    session.usuario = response.data;
    session.estado = ESTADOS.SELECCIONANDO_IT;

    const usuarioInfo = formatUsuarioDetalle(session.usuario);

    // Obtener usuarios IT
    const itResponse = await usuariosApi.getSoporteIt();
    const usuariosIt = itResponse.success ? itResponse.data : [];

    await bot.sendMessage(
      chatId,
      `✅ *Usuario Seleccionado*\n\n${usuarioInfo}\n\n👨‍💼 *Selecciona el Responsable IT* que registra el préstamo:`,
      {
        parse_mode: 'Markdown',
        reply_markup: menus.listaUsuariosIt(usuariosIt, 'sel_it'),
      }
    );
  } catch (error) {
    console.error('Error seleccionando usuario:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

/**
 * Selecciona el responsable IT
 */
async function seleccionarResponsableIt(bot, chatId, itId) {
  const session = getSession(chatId);

  try {
    const response = await usuariosApi.getOne(itId);

    if (!response.success) {
      await bot.sendMessage(chatId, 'Usuario IT no encontrado. Intenta nuevamente.');
      return;
    }

    session.responsableIt = response.data;
    session.estado = ESTADOS.CONFIRMANDO;

    // Mostrar confirmación
    const confirmacion = formatConfirmacionPrestamo(
      session.insumo,
      session.usuario,
      session.responsableIt
    );

    await bot.sendMessage(chatId, confirmacion, {
      parse_mode: 'Markdown',
      reply_markup: menus.botonesConfirmacion('confirmar_prestamo'),
    });
  } catch (error) {
    console.error('Error seleccionando responsable IT:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

/**
 * Confirma y crea el préstamo
 */
async function confirmarPrestamo(bot, chatId) {
  const session = getSession(chatId);

  if (!session.insumo || !session.usuario || !session.responsableIt) {
    await bot.sendMessage(chatId, 'Error: datos incompletos. Intenta nuevamente.');
    clearSession(chatId);
    return;
  }

  try {
    const response = await prestamosApi.crear({
      inventario_id: session.insumo.id,
      usuario_id: session.usuario.id,
      usuario_it_id: session.responsableIt.id,
      fecha_hora_prestamo: new Date().toISOString(),
      observaciones_prestamo: session.observaciones || null,
    });

    if (!response.success) {
      throw new Error(response.error || 'Error al crear préstamo');
    }

    const prestamo = response.data;

    await bot.sendMessage(
      chatId,
      `✅ *Préstamo Registrado Correctamente*\n\n📋 ID: #${prestamo.id}\n\nEl item ha sido marcado como "Asignado".`,
      {
        parse_mode: 'Markdown',
        reply_markup: menus.postPrestamo(),
      }
    );

    clearSession(chatId);
  } catch (error) {
    console.error('Error creando préstamo:', error);
    await bot.sendMessage(chatId, `❌ Error al registrar el préstamo: ${error.message}`, {
      reply_markup: menus.botonMenuPrincipal(),
    });
    clearSession(chatId);
  }
}

/**
 * Maneja los mensajes de texto durante el flujo de préstamo
 */
async function handleMessage(bot, msg) {
  const chatId = msg.chat.id;
  const texto = msg.text;

  // Ignorar comandos
  if (texto && texto.startsWith('/')) return false;

  const session = getSession(chatId);

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
 * Maneja los callbacks del flujo de préstamo
 */
async function handleCallback(bot, query) {
  const chatId = query.message.chat.id;
  const data = query.data;

  // Selección de insumo
  if (data.startsWith('sel_insumo_')) {
    const insumoId = parseInt(data.replace('sel_insumo_', ''));
    await bot.answerCallbackQuery(query.id);
    await seleccionarInsumo(bot, chatId, insumoId);
    return true;
  }

  // Selección de usuario
  if (data.startsWith('sel_usuario_')) {
    const usuarioId = parseInt(data.replace('sel_usuario_', ''));
    await bot.answerCallbackQuery(query.id);
    await seleccionarUsuario(bot, chatId, usuarioId);
    return true;
  }

  // Selección de responsable IT
  if (data.startsWith('sel_it_')) {
    const itId = parseInt(data.replace('sel_it_', ''));
    await bot.answerCallbackQuery(query.id);
    await seleccionarResponsableIt(bot, chatId, itId);
    return true;
  }

  // Confirmar préstamo
  if (data === 'confirmar_prestamo') {
    await bot.answerCallbackQuery(query.id, { text: 'Registrando préstamo...' });
    await confirmarPrestamo(bot, chatId);
    return true;
  }

  return false;
}

module.exports = {
  ESTADOS,
  getSession,
  clearSession,
  iniciarPrestamo,
  buscarInsumos,
  seleccionarInsumo,
  buscarUsuarios,
  seleccionarUsuario,
  seleccionarResponsableIt,
  confirmarPrestamo,
  handleMessage,
  handleCallback,
};
