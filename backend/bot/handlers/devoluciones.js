/**
 * Manejador del flujo de devoluciones
 */

const config = require('../config');
const menus = require('../keyboards/menus');
const { prestamosApi } = require('../services/api');
const {
  formatPrestamoDetalle,
  formatConfirmacionDevolucion,
} = require('../utils/formatters');

// Estados del flujo de devolución
const ESTADOS = {
  IDLE: 'idle',
  SELECCIONANDO_PRESTAMO: 'seleccionando_prestamo',
  INGRESANDO_OBSERVACIONES: 'ingresando_observaciones',
  CONFIRMANDO: 'confirmando',
};

// Almacén de sesiones de devolución (en memoria)
const devolucionSessions = new Map();

/**
 * Obtiene o crea una sesión de devolución
 * @param {number} chatId
 * @returns {object}
 */
function getDevolucionSession(chatId) {
  if (!devolucionSessions.has(chatId)) {
    devolucionSessions.set(chatId, {
      estado: ESTADOS.IDLE,
      prestamo: null,
      observaciones: null,
    });
  }
  return devolucionSessions.get(chatId);
}

/**
 * Limpia la sesión de devolución
 * @param {number} chatId
 */
function clearDevolucionSession(chatId) {
  devolucionSessions.set(chatId, {
    estado: ESTADOS.IDLE,
    prestamo: null,
    observaciones: null,
  });
}

/**
 * Inicia el flujo de devolución - muestra lista de préstamos activos
 */
async function iniciarDevolucion(bot, chatId) {
  const session = getDevolucionSession(chatId);
  session.estado = ESTADOS.SELECCIONANDO_PRESTAMO;
  session.prestamo = null;
  session.observaciones = null;

  try {
    const response = await prestamosApi.getActivos();

    if (!response.success || !response.data || response.data.length === 0) {
      await bot.sendMessage(
        chatId,
        '✅ No hay préstamos activos para devolver.',
        { reply_markup: menus.botonMenuPrincipal() }
      );
      clearDevolucionSession(chatId);
      return;
    }

    const prestamos = response.data;

    await bot.sendMessage(
      chatId,
      `📥 *Registrar Devolución*\n\nSelecciona el préstamo a devolver (${prestamos.length} activos):`,
      {
        parse_mode: 'Markdown',
        reply_markup: menus.listaPrestamosDevolucion(prestamos),
      }
    );
  } catch (error) {
    console.error('Error listando préstamos:', error);
    await bot.sendMessage(chatId, config.messages.error);
    clearDevolucionSession(chatId);
  }
}

/**
 * Selecciona un préstamo para devolver
 */
async function seleccionarPrestamo(bot, chatId, prestamoId) {
  const session = getDevolucionSession(chatId);

  try {
    const response = await prestamosApi.getOne(prestamoId);

    if (!response.success) {
      await bot.sendMessage(chatId, 'Préstamo no encontrado. Intenta nuevamente.');
      return;
    }

    session.prestamo = response.data;
    session.estado = ESTADOS.INGRESANDO_OBSERVACIONES;

    const prestamoInfo = formatPrestamoDetalle(session.prestamo);

    await bot.sendMessage(
      chatId,
      `📋 *Préstamo Seleccionado*\n\n${prestamoInfo}\n\n📝 *Observaciones de devolución* (opcional):\nEscribe las observaciones o presiona Omitir.`,
      {
        parse_mode: 'Markdown',
        reply_markup: menus.botonOmitir('omitir_observaciones'),
      }
    );
  } catch (error) {
    console.error('Error obteniendo préstamo:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

/**
 * Guarda las observaciones y muestra confirmación
 */
async function guardarObservaciones(bot, chatId, observaciones = null) {
  const session = getDevolucionSession(chatId);
  session.observaciones = observaciones;
  session.estado = ESTADOS.CONFIRMANDO;

  const confirmacion = formatConfirmacionDevolucion(session.prestamo);
  let mensaje = confirmacion;

  if (observaciones) {
    mensaje += `\n📝 *Observaciones:* ${observaciones}`;
  }

  await bot.sendMessage(chatId, mensaje, {
    parse_mode: 'Markdown',
    reply_markup: menus.botonesConfirmacion('confirmar_devolucion'),
  });
}

/**
 * Confirma y registra la devolución
 */
async function confirmarDevolucion(bot, chatId) {
  const session = getDevolucionSession(chatId);

  if (!session.prestamo) {
    await bot.sendMessage(chatId, 'Error: no hay préstamo seleccionado. Intenta nuevamente.');
    clearDevolucionSession(chatId);
    return;
  }

  try {
    const response = await prestamosApi.devolver(session.prestamo.id, {
      observaciones_devolucion: session.observaciones || null,
    });

    if (!response.success) {
      throw new Error(response.error || 'Error al registrar devolución');
    }

    await bot.sendMessage(
      chatId,
      `✅ *Devolución Registrada*\n\nEl insumo está nuevamente disponible para préstamo.`,
      {
        parse_mode: 'Markdown',
        reply_markup: menus.postDevolucion(),
      }
    );

    clearDevolucionSession(chatId);
  } catch (error) {
    console.error('Error registrando devolución:', error);
    await bot.sendMessage(chatId, `❌ Error al registrar la devolución: ${error.message}`, {
      reply_markup: menus.botonMenuPrincipal(),
    });
    clearDevolucionSession(chatId);
  }
}

/**
 * Maneja los mensajes de texto durante el flujo de devolución
 */
async function handleMessage(bot, msg) {
  const chatId = msg.chat.id;
  const texto = msg.text;

  // Ignorar comandos
  if (texto && texto.startsWith('/')) return false;

  const session = getDevolucionSession(chatId);

  switch (session.estado) {
    case ESTADOS.INGRESANDO_OBSERVACIONES:
      await guardarObservaciones(bot, chatId, texto);
      return true;

    default:
      return false;
  }
}

/**
 * Maneja los callbacks del flujo de devolución
 */
async function handleCallback(bot, query) {
  const chatId = query.message.chat.id;
  const data = query.data;

  // Selección de préstamo para devolver
  if (data.startsWith('devolver_')) {
    const prestamoId = parseInt(data.replace('devolver_', ''));
    await bot.answerCallbackQuery(query.id);
    await seleccionarPrestamo(bot, chatId, prestamoId);
    return true;
  }

  // Omitir observaciones
  if (data === 'omitir_observaciones') {
    await bot.answerCallbackQuery(query.id);
    await guardarObservaciones(bot, chatId, null);
    return true;
  }

  // Confirmar devolución
  if (data === 'confirmar_devolucion') {
    await bot.answerCallbackQuery(query.id, { text: 'Registrando devolución...' });
    await confirmarDevolucion(bot, chatId);
    return true;
  }

  return false;
}

module.exports = {
  ESTADOS,
  getDevolucionSession,
  clearDevolucionSession,
  iniciarDevolucion,
  seleccionarPrestamo,
  guardarObservaciones,
  confirmarDevolucion,
  handleMessage,
  handleCallback,
};
