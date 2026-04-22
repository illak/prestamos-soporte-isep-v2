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
const asignaciones = require('./handlers/asignaciones');

/**
 * Verifica si un chat es un grupo
 */
function isGroupChat(chat) {
  return chat.type === 'group' || chat.type === 'supergroup';
}

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

  // ============================================
  // MANEJADOR DE MENSAJES DE TEXTO (PRINCIPAL)
  // ============================================
  bot.on('text', async (msg) => {
    const chatId = msg.chat.id;
    const texto = msg.text;
    const isGroup = isGroupChat(msg.chat);

    console.log(`📨 Mensaje recibido de ${msg.from.id} en ${isGroup ? 'grupo' : 'privado'}: "${texto}"`);

    // Verificar autorización completa (usuario + chat)
    const auth = config.checkFullAuthorization(msg.from.id, chatId, msg.chat.type);
    if (!auth.authorized) {
      config.logUnauthorizedAccess(msg.from, `comando "${texto}"`, auth.reason, msg.chat);
      if (texto.startsWith('/')) {
        const message = auth.reason === 'chat'
          ? config.messages.unauthorizedChat
          : config.messages.unauthorized;
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      }
      return;
    }

    // Procesar comandos
    if (texto.startsWith('/')) {
      const command = texto.split(' ')[0].toLowerCase().split('@')[0]; // Remover @bot_name si existe
      console.log(`🔧 Comando: ${command}`);

      switch (command) {
        case '/start':
          await commands.handleStart(bot, msg);
          break;
        case '/menu':
          await commands.handleMenu(bot, msg);
          break;
        case '/ayuda':
        case '/help':
          await commands.handleAyuda(bot, msg);
          break;
        case '/activos':
          await commands.handleActivos(bot, msg);
          break;
        case '/resumen':
          await commands.handleResumen(bot, msg);
          break;
        case '/prestar':
          await prestamos.iniciarPrestamo(bot, chatId, isGroup);
          break;
        case '/devolver':
          await devoluciones.iniciarDevolucion(bot, chatId);
          break;
        case '/buscar':
          await bot.sendMessage(chatId, '🔍 *¿Qué deseas buscar?*', {
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
          break;
        case '/chatinfo':
          await commands.handleChatInfo(bot, msg);
          break;
        default:
          // Comando no reconocido
          break;
      }
      return;
    }

    // Procesar mensajes de texto (no comandos)
    try {
      console.log(`📝 Procesando texto: "${texto}"`);

      // Intentar procesar con cada handler en orden
      const handledByPrestamos = await prestamos.handleMessage(bot, msg);
      if (handledByPrestamos) {
        console.log('✅ Manejado por prestamos');
        return;
      }

      const handledByAsignaciones = await asignaciones.handleMessage(bot, msg);
      if (handledByAsignaciones) {
        console.log('✅ Manejado por asignaciones');
        return;
      }

      const handledByDevoluciones = await devoluciones.handleMessage(bot, msg);
      if (handledByDevoluciones) {
        console.log('✅ Manejado por devoluciones');
        return;
      }

      const handledByConsultas = await consultas.handleMessage(bot, msg);
      if (handledByConsultas) {
        console.log('✅ Manejado por consultas');
        return;
      }

      // Si no hay flujo activo y es un mensaje privado, mostrar sugerencia
      // En grupos no mostramos esto para evitar spam
      if (!isGroup) {
        console.log('ℹ️ Mensaje no procesado - sin flujo activo');
        await bot.sendMessage(chatId, '💡 No hay una operación activa. Usa /menu para ver las opciones disponibles.', {
          reply_markup: menus.botonMenuPrincipal(),
        });
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje:', error);
      await bot.sendMessage(chatId, config.messages.error);
    }
  });

  // ============================================
  // MANEJADOR DE CALLBACKS (BOTONES INLINE)
  // ============================================
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const isGroup = isGroupChat(query.message.chat);

    console.log(`🔘 Callback recibido de ${query.from.id}: "${data}"`);

    // Verificar autorización completa (usuario + chat)
    const auth = config.checkFullAuthorization(query.from.id, chatId, query.message.chat.type);
    if (!auth.authorized) {
      config.logUnauthorizedAccess(query.from, `callback "${data}"`, auth.reason, query.message.chat);
      const alertText = auth.reason === 'chat' ? 'Chat no autorizado' : 'No autorizado';
      await bot.answerCallbackQuery(query.id, { text: alertText, show_alert: true });
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
        asignaciones.clearSession(chatId);
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
        asignaciones.clearSession(chatId);
        return;
      }

      // Opciones del menú principal
      if (data === 'menu_prestar') {
        await bot.answerCallbackQuery(query.id);
        await prestamos.iniciarPrestamo(bot, chatId, isGroup);
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
        await consultas.iniciarBusquedaInsumo(bot, chatId, isGroup);
        return;
      }

      if (data === 'menu_buscar_usuario') {
        await bot.answerCallbackQuery(query.id);
        await consultas.iniciarBusquedaUsuario(bot, chatId, isGroup);
        return;
      }

      if (data === 'menu_asignar') {
        await bot.answerCallbackQuery(query.id);
        await asignaciones.iniciarAsignacion(bot, chatId, isGroup);
        return;
      }

      if (data === 'menu_liberar') {
        await bot.answerCallbackQuery(query.id);
        await asignaciones.iniciarLiberacion(bot, chatId);
        return;
      }

      if (data === 'menu_asignaciones') {
        await bot.answerCallbackQuery(query.id);
        await asignaciones.listarAsignaciones(bot, chatId);
        return;
      }

      // Delegar a handlers específicos
      if (await prestamos.handleCallback(bot, query)) {
        console.log('✅ Callback manejado por prestamos');
        return;
      }
      if (await asignaciones.handleCallback(bot, query)) {
        console.log('✅ Callback manejado por asignaciones');
        return;
      }
      if (await devoluciones.handleCallback(bot, query)) {
        console.log('✅ Callback manejado por devoluciones');
        return;
      }
      if (await consultas.handleCallback(bot, query)) {
        console.log('✅ Callback manejado por consultas');
        return;
      }

      // Callback no manejado
      console.log('⚠️ Callback no manejado:', data);
      await bot.answerCallbackQuery(query.id);
    } catch (error) {
      console.error('❌ Error en callback:', error);
      await bot.answerCallbackQuery(query.id, { text: 'Error al procesar', show_alert: true });
    }
  });

  // ============================================
  // MANEJADOR DE ERRORES
  // ============================================
  bot.on('polling_error', (error) => {
    console.error('❌ Error de polling:', error.code, error.message);
  });

  bot.on('error', (error) => {
    console.error('❌ Error del bot:', error.message);
  });

  // ============================================
  // CONFIGURAR COMANDOS EN TELEGRAM
  // ============================================
  bot.setMyCommands([
    { command: 'start', description: 'Iniciar el bot' },
    { command: 'menu', description: 'Mostrar menú principal' },
    { command: 'prestar', description: 'Registrar nuevo préstamo' },
    { command: 'devolver', description: 'Registrar devolución' },
    { command: 'activos', description: 'Ver préstamos activos' },
    { command: 'resumen', description: 'Resumen del día' },
    { command: 'buscar', description: 'Buscar insumo o usuario' },
    { command: 'chatinfo', description: 'Info del chat (para config)' },
    { command: 'ayuda', description: 'Mostrar ayuda' },
  ]).then(() => {
    console.log('✅ Comandos del bot configurados');
  }).catch((err) => {
    console.error('Error configurando comandos:', err);
  });

  console.log('✅ Bot de Telegram iniciado correctamente');
  console.log(`📋 Usuarios autorizados: ${config.allowedUserIds.length > 0 ? config.allowedUserIds.join(', ') : 'TODOS (modo desarrollo)'}`);
  console.log(`🏠 Chats autorizados: ${config.allowedChatIds.length > 0 ? config.allowedChatIds.join(', ') : 'TODOS + privados'}`);

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
