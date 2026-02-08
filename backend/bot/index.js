/**
 * Bot de Telegram para Sistema de Préstamos ISEP
 *
 * Punto de entrada principal del bot
 */

const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const menus = require('./keyboards/menus');

// Handlers
const commands = require('./handlers/commands');
const prestamos = require('./handlers/prestamos');
const devoluciones = require('./handlers/devoluciones');
const consultas = require('./handlers/consultas');

/**
 * Inicializa y configura el bot
 */
function createBot() {
  // Validar configuración
  const validation = config.validate();
  if (!validation.valid) {
    console.error('❌ Error de configuración del bot:');
    validation.errors.forEach((err) => console.error(`   - ${err}`));
    process.exit(1);
  }

  // Crear instancia del bot
  const bot = new TelegramBot(config.token, { polling: true });

  console.log('🤖 Bot de Telegram iniciando...');

  // Registrar comandos
  commands.registerCommands(bot);

  // Registrar comandos adicionales
  bot.onText(/\/prestar/, async (msg) => {
    if (!config.isAuthorized(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, config.messages.unauthorized, { parse_mode: 'Markdown' });
    }
    await prestamos.iniciarPrestamo(bot, msg.chat.id);
  });

  bot.onText(/\/devolver/, async (msg) => {
    if (!config.isAuthorized(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, config.messages.unauthorized, { parse_mode: 'Markdown' });
    }
    await devoluciones.iniciarDevolucion(bot, msg.chat.id);
  });

  bot.onText(/\/buscar/, async (msg) => {
    if (!config.isAuthorized(msg.from.id)) {
      return bot.sendMessage(msg.chat.id, config.messages.unauthorized, { parse_mode: 'Markdown' });
    }
    // Mostrar opciones de búsqueda
    await bot.sendMessage(msg.chat.id, '🔍 *¿Qué deseas buscar?*', {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📦 Buscar Insumo', callback_data: 'menu_buscar_insumo' },
            { text: '👤 Buscar Usuario', callback_data: 'menu_buscar_usuario' },
          ],
          [{ text: '❌ Cancelar', callback_data: 'menu_principal' }],
        ],
      },
    });
  });

  // Manejador de callbacks (botones inline)
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    // Verificar autorización
    if (!config.isAuthorized(query.from.id)) {
      await bot.answerCallbackQuery(query.id, { text: 'No autorizado', show_alert: true });
      return;
    }

    try {
      // Menú principal
      if (data === 'menu_principal') {
        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(chatId, '📦 *Menú Principal*\n\nSelecciona una opción:', {
          parse_mode: 'Markdown',
          reply_markup: menus.menuPrincipal(),
        });
        // Limpiar sesiones
        prestamos.clearSession(chatId);
        devoluciones.clearDevolucionSession(chatId);
        consultas.clearConsultaSession(chatId);
        return;
      }

      // Cancelar operación
      if (data === 'cancelar') {
        await bot.answerCallbackQuery(query.id, { text: 'Operación cancelada' });
        await bot.sendMessage(chatId, config.messages.cancelled, {
          reply_markup: menus.botonMenuPrincipal(),
        });
        // Limpiar sesiones
        prestamos.clearSession(chatId);
        devoluciones.clearDevolucionSession(chatId);
        consultas.clearConsultaSession(chatId);
        return;
      }

      // Opciones del menú principal
      if (data === 'menu_prestar') {
        await bot.answerCallbackQuery(query.id);
        await prestamos.iniciarPrestamo(bot, chatId);
        return;
      }

      if (data === 'menu_devolver') {
        await bot.answerCallbackQuery(query.id);
        await devoluciones.iniciarDevolucion(bot, chatId);
        return;
      }

      if (data === 'menu_activos') {
        await bot.answerCallbackQuery(query.id);
        await commands.handleActivos(bot, { chat: { id: chatId }, from: query.from });
        return;
      }

      if (data === 'menu_resumen') {
        await bot.answerCallbackQuery(query.id);
        await commands.handleResumen(bot, { chat: { id: chatId }, from: query.from });
        return;
      }

      if (data === 'menu_buscar_insumo') {
        await bot.answerCallbackQuery(query.id);
        await consultas.iniciarBusquedaInsumo(bot, chatId);
        return;
      }

      if (data === 'menu_buscar_usuario') {
        await bot.answerCallbackQuery(query.id);
        await consultas.iniciarBusquedaUsuario(bot, chatId);
        return;
      }

      // Delegar a handlers específicos
      if (await prestamos.handleCallback(bot, query)) return;
      if (await devoluciones.handleCallback(bot, query)) return;
      if (await consultas.handleCallback(bot, query)) return;

      // Callback no manejado
      await bot.answerCallbackQuery(query.id);
    } catch (error) {
      console.error('Error en callback:', error);
      await bot.answerCallbackQuery(query.id, { text: 'Error al procesar', show_alert: true });
    }
  });

  // Manejador de mensajes de texto
  bot.on('message', async (msg) => {
    // Ignorar si no es texto o es un comando
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;

    // Verificar autorización
    if (!config.isAuthorized(msg.from.id)) {
      return;
    }

    try {
      // Intentar procesar con cada handler
      if (await prestamos.handleMessage(bot, msg)) return;
      if (await devoluciones.handleMessage(bot, msg)) return;
      if (await consultas.handleMessage(bot, msg)) return;

      // Si no hay flujo activo, mostrar ayuda
      // (Comentado para evitar spam - descomentar si se desea)
      // await bot.sendMessage(chatId, 'Usa /menu para ver las opciones disponibles.');
    } catch (error) {
      console.error('Error procesando mensaje:', error);
    }
  });

  // Manejador de errores de polling
  bot.on('polling_error', (error) => {
    console.error('Error de polling:', error.code, error.message);
  });

  // Configurar comandos del bot en Telegram
  bot.setMyCommands([
    { command: 'start', description: 'Iniciar el bot' },
    { command: 'menu', description: 'Mostrar menú principal' },
    { command: 'prestar', description: 'Registrar nuevo préstamo' },
    { command: 'devolver', description: 'Registrar devolución' },
    { command: 'activos', description: 'Ver préstamos activos' },
    { command: 'resumen', description: 'Resumen del día' },
    { command: 'buscar', description: 'Buscar insumo o usuario' },
    { command: 'ayuda', description: 'Mostrar ayuda' },
  ]).then(() => {
    console.log('✅ Comandos del bot configurados');
  }).catch((err) => {
    console.error('Error configurando comandos:', err);
  });

  console.log('✅ Bot de Telegram iniciado correctamente');
  console.log(`📋 Usuarios autorizados: ${config.allowedUserIds.length > 0 ? config.allowedUserIds.join(', ') : 'TODOS (modo desarrollo)'}`);

  return bot;
}

// Ejecutar si es el script principal
if (require.main === module) {
  // Cargar variables de entorno si existe .env
  try {
    require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
  } catch (e) {
    // dotenv no está instalado o no hay .env
  }

  createBot();
}

module.exports = { createBot };
