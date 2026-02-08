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
config.isAuthorized = (telegramId) => {
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

/**
 * Registra un intento de acceso no autorizado
 * @param {object} user - Objeto de usuario de Telegram
 * @param {string} action - Acción intentada
 */
config.logUnauthorizedAccess = (user, action = 'acceso') => {
  const username = user.username ? `@${user.username}` : 'sin username';
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'desconocido';
  console.warn(`🚫 Acceso no autorizado: ${action} por ID ${user.id} (${name}, ${username})`);
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
