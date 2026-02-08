/**
 * Configuración del Bot de Telegram
 */

const config = {
  // Token del bot (obtener de @BotFather)
  token: process.env.TELEGRAM_BOT_TOKEN || '',

  // IDs de Telegram autorizados para usar el bot (separados por coma)
  // Obtener el ID enviando un mensaje a @userinfobot
  allowedUserIds: (process.env.TELEGRAM_ALLOWED_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(id => id),

  // IDs de chats/grupos autorizados (separados por coma)
  // Si está configurado, solo permite uso en estos grupos + chat privado con el bot
  // Obtener el ID del grupo usando /chatinfo en el grupo
  allowedChatIds: (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(id => id),

  // Modo estricto: si es true, REQUIERE TELEGRAM_ALLOWED_IDS configurado
  // En producción siempre debería ser true
  strictMode: process.env.TELEGRAM_STRICT_MODE !== 'false',

  // ID del canal/grupo para notificaciones (opcional)
  alertChannelId: process.env.TELEGRAM_ALERT_CHANNEL_ID || '',

  // URL base de la API
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',

  // Configuración de alertas
  alerts: {
    // Días para considerar un préstamo como crítico
    diasCriticos: parseInt(process.env.DIAS_CRITICOS) || 3,
    // Hora para enviar resumen diario (formato 24h)
    horaResumenDiario: process.env.HORA_RESUMEN_DIARIO || '08:00',
    // Habilitar notificaciones automáticas
    notificacionesActivas: process.env.NOTIFICACIONES_ACTIVAS === 'true',
  },

  // Mensajes del bot
  messages: {
    welcome: `
🏫 *ISEP - Sistema de Préstamos*
━━━━━━━━━━━━━━━━━━━━━━━━━━

Bienvenido al bot de gestión de préstamos de equipamiento.

Usa el menú de abajo o escribe /ayuda para ver los comandos disponibles.
    `.trim(),

    unauthorized: `
⛔ *Acceso Denegado*

No tienes autorización para usar este bot.
Contacta al administrador del sistema.
    `.trim(),

    unauthorizedChat: `
⛔ *Chat No Autorizado*

Este bot solo puede ser utilizado en el grupo oficial de ISEP Soporte IT o en chat privado con el bot.
    `.trim(),

    help: `
📖 *Comandos Disponibles*
━━━━━━━━━━━━━━━━━━━━━━━━━━

/menu - Mostrar menú principal
/prestar - Registrar nuevo préstamo
/devolver - Registrar devolución
/activos - Ver préstamos activos
/buscar - Buscar insumo o usuario
/resumen - Resumen del día
/ayuda - Mostrar esta ayuda
    `.trim(),

    error: '❌ Ocurrió un error. Intenta nuevamente.',

    cancelled: '❌ Operación cancelada.',

    noResults: '🔍 No se encontraron resultados.',
  },
};

/**
 * Verifica si un usuario está autorizado
 * @param {string|number} telegramId - ID de Telegram del usuario
 * @returns {boolean}
 */
config.isUserAuthorized = (telegramId) => {
  // Si no hay IDs configurados
  if (config.allowedUserIds.length === 0) {
    // En modo estricto, denegar acceso
    if (config.strictMode) {
      console.error('🔒 TELEGRAM_ALLOWED_IDS no configurado - acceso denegado (modo estricto)');
      return false;
    }
    // En modo desarrollo, permitir a todos (con advertencia)
    console.warn('⚠️ TELEGRAM_ALLOWED_IDS no configurado - permitiendo acceso (modo desarrollo)');
    return true;
  }
  return config.allowedUserIds.includes(String(telegramId));
};

// Alias para compatibilidad
config.isAuthorized = config.isUserAuthorized;

/**
 * Verifica si un chat está autorizado
 * Implementa Opción B: Permite grupo autorizado O chat privado con el bot
 * @param {string|number} chatId - ID del chat
 * @param {string|number} userId - ID del usuario (para verificar chat privado)
 * @param {string} chatType - Tipo de chat ('private', 'group', 'supergroup')
 * @returns {boolean}
 */
config.isChatAuthorized = (chatId, userId, chatType) => {
  // Si no hay chats configurados, permitir cualquier chat (comportamiento anterior)
  if (config.allowedChatIds.length === 0) {
    return true;
  }

  // Chat privado: siempre permitido si el usuario está autorizado
  // (En chat privado, chatId === userId)
  if (chatType === 'private') {
    return true;
  }

  // Grupos: verificar si el chatId está en la lista de permitidos
  return config.allowedChatIds.includes(String(chatId));
};

/**
 * Verifica autorización completa (usuario + chat)
 * @param {string|number} userId - ID del usuario
 * @param {string|number} chatId - ID del chat
 * @param {string} chatType - Tipo de chat
 * @returns {{ authorized: boolean, reason: string|null }}
 */
config.checkFullAuthorization = (userId, chatId, chatType) => {
  // Primero verificar usuario
  if (!config.isUserAuthorized(userId)) {
    return { authorized: false, reason: 'user' };
  }

  // Luego verificar chat
  if (!config.isChatAuthorized(chatId, userId, chatType)) {
    return { authorized: false, reason: 'chat' };
  }

  return { authorized: true, reason: null };
};

/**
 * Registra un intento de acceso no autorizado
 * @param {object} user - Objeto de usuario de Telegram
 * @param {string} action - Acción intentada
 * @param {string} reason - Razón del rechazo ('user' o 'chat')
 * @param {object} chat - Objeto de chat (opcional)
 */
config.logUnauthorizedAccess = (user, action = 'acceso', reason = 'user', chat = null) => {
  const username = user.username ? `@${user.username}` : 'sin username';
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'desconocido';

  if (reason === 'chat' && chat) {
    const chatName = chat.title || 'chat privado';
    console.warn(`🚫 Chat no autorizado: ${action} por ID ${user.id} (${name}, ${username}) en chat "${chatName}" (ID: ${chat.id})`);
  } else {
    console.warn(`🚫 Usuario no autorizado: ${action} por ID ${user.id} (${name}, ${username})`);
  }
};

/**
 * Valida la configuración del bot
 * @returns {{ valid: boolean, errors: string[] }}
 */
config.validate = () => {
  const errors = [];

  if (!config.token) {
    errors.push('TELEGRAM_BOT_TOKEN no está configurado');
  }

  if (config.allowedUserIds.length === 0) {
    if (config.strictMode) {
      errors.push('TELEGRAM_ALLOWED_IDS no está configurado (requerido en modo estricto)');
      errors.push('Para desarrollo, configura TELEGRAM_STRICT_MODE=false');
    } else {
      console.warn('⚠️ TELEGRAM_ALLOWED_IDS no configurado - el bot permitirá acceso a cualquier usuario');
      console.warn('⚠️ Esto NO es seguro para producción. Configura TELEGRAM_ALLOWED_IDS con los IDs autorizados.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = config;
