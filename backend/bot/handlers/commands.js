/**
 * Manejadores de comandos básicos del bot
 */

const config = require('../config');
const menus = require('../keyboards/menus');
const { dashboardApi, prestamosApi } = require('../services/api');
const { formatResumenActivos, formatResumenDia } = require('../utils/formatters');

/**
 * Comando /start - Iniciar el bot
 */
async function handleStart(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Verificar autorización
  if (!config.isAuthorized(userId)) {
    return bot.sendMessage(chatId, config.messages.unauthorized, { parse_mode: 'Markdown' });
  }

  const welcomeMessage = config.messages.welcome;

  await bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: menus.menuPrincipal(),
  });
}

/**
 * Comando /menu - Mostrar menú principal
 */
async function handleMenu(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!config.isAuthorized(userId)) {
    return bot.sendMessage(chatId, config.messages.unauthorized, { parse_mode: 'Markdown' });
  }

  await bot.sendMessage(chatId, '📦 *Menú Principal*\n\nSelecciona una opción:', {
    parse_mode: 'Markdown',
    reply_markup: menus.menuPrincipal(),
  });
}

/**
 * Comando /ayuda - Mostrar ayuda
 */
async function handleAyuda(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!config.isAuthorized(userId)) {
    return bot.sendMessage(chatId, config.messages.unauthorized, { parse_mode: 'Markdown' });
  }

  await bot.sendMessage(chatId, config.messages.help, {
    parse_mode: 'Markdown',
    reply_markup: menus.botonMenuPrincipal(),
  });
}

/**
 * Comando /activos - Mostrar préstamos activos
 */
async function handleActivos(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!config.isAuthorized(userId)) {
    return bot.sendMessage(chatId, config.messages.unauthorized, { parse_mode: 'Markdown' });
  }

  try {
    const response = await prestamosApi.getActivos();

    if (!response.success) {
      return bot.sendMessage(chatId, config.messages.error);
    }

    const prestamos = response.data || [];
    const texto = formatResumenActivos(prestamos);

    if (prestamos.length > 0) {
      await bot.sendMessage(chatId, texto, {
        parse_mode: 'Markdown',
        reply_markup: menus.listaActivosConAcciones(prestamos),
      });
    } else {
      await bot.sendMessage(chatId, texto, {
        parse_mode: 'Markdown',
        reply_markup: menus.botonMenuPrincipal(),
      });
    }
  } catch (error) {
    console.error('Error en /activos:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

/**
 * Comando /resumen - Mostrar resumen del día
 */
async function handleResumen(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!config.isAuthorized(userId)) {
    return bot.sendMessage(chatId, config.messages.unauthorized, { parse_mode: 'Markdown' });
  }

  try {
    const response = await dashboardApi.getMetricas();

    if (!response.success) {
      return bot.sendMessage(chatId, config.messages.error);
    }

    const texto = formatResumenDia(response.data);

    await bot.sendMessage(chatId, texto, {
      parse_mode: 'Markdown',
      reply_markup: menus.botonMenuPrincipal(),
    });
  } catch (error) {
    console.error('Error en /resumen:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

/**
 * Comando /chatinfo - Mostrar información del chat actual (para configuración)
 */
async function handleChatInfo(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const chat = msg.chat;

  // Solo usuarios autorizados pueden ver esta info
  if (!config.isAuthorized(userId)) {
    return bot.sendMessage(chatId, config.messages.unauthorized, { parse_mode: 'Markdown' });
  }

  const chatType = chat.type;
  const isGroup = chatType === 'group' || chatType === 'supergroup';
  const chatTitle = chat.title || 'Chat Privado';

  let texto = `ℹ️ *Información del Chat*
━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 *Tipo:* ${chatType}
🆔 *Chat ID:* \`${chatId}\`
📝 *Nombre:* ${chatTitle}`;

  if (isGroup) {
    texto += `

💡 *Para autorizar este grupo:*
Agrega este ID a \`TELEGRAM_ALLOWED_CHAT_IDS\`:
\`\`\`
TELEGRAM_ALLOWED_CHAT_IDS=${chatId}
\`\`\``;

    // Verificar si el chat ya está autorizado
    const isAuthorized = config.allowedChatIds.includes(String(chatId));
    texto += `\n\n${isAuthorized ? '✅ Este chat está autorizado' : '⚠️ Este chat NO está autorizado'}`;
  } else {
    texto += `\n\n✅ Los chats privados siempre están permitidos para usuarios autorizados.`;
  }

  // Mostrar info del usuario también
  texto += `

👤 *Tu información:*
🆔 ID: \`${userId}\`
📝 Nombre: ${msg.from.first_name || ''} ${msg.from.last_name || ''}`;

  if (msg.from.username) {
    texto += `\n🔗 Username: @${msg.from.username}`;
  }

  await bot.sendMessage(chatId, texto, {
    parse_mode: 'Markdown',
    reply_markup: menus.botonMenuPrincipal(),
  });
}

/**
 * Registra todos los comandos en el bot
 * @param {TelegramBot} bot - Instancia del bot
 */
function registerCommands(bot) {
  bot.onText(/\/start/, (msg) => handleStart(bot, msg));
  bot.onText(/\/menu/, (msg) => handleMenu(bot, msg));
  bot.onText(/\/ayuda/, (msg) => handleAyuda(bot, msg));
  bot.onText(/\/help/, (msg) => handleAyuda(bot, msg));
  bot.onText(/\/activos/, (msg) => handleActivos(bot, msg));
  bot.onText(/\/resumen/, (msg) => handleResumen(bot, msg));
  bot.onText(/\/chatinfo/, (msg) => handleChatInfo(bot, msg));
}

module.exports = {
  handleStart,
  handleMenu,
  handleAyuda,
  handleActivos,
  handleResumen,
  handleChatInfo,
  registerCommands,
};
