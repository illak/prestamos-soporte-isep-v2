/**
 * Manejador del flujo de registro de nuevos insumos desde Telegram
 *
 * Flujo: elegir categoría → elegir condición → fabricante (texto) → modelo (texto) → serie (opcional) → confirmar → POST /inventario
 */

const config = require('../config');
const menus = require('../keyboards/menus');
const { insumosApi, categoriasApi } = require('../services/api');
const { getIconoTipologia } = require('../utils/formatters');

const ESTADOS = {
  IDLE: 'idle',
  SELECCIONANDO_CATEGORIA: 'seleccionando_categoria',
  SELECCIONANDO_CONDICION: 'seleccionando_condicion',
  INGRESANDO_FABRICANTE: 'ingresando_fabricante',
  INGRESANDO_MODELO: 'ingresando_modelo',
  INGRESANDO_SERIE: 'ingresando_serie',
  CONFIRMANDO: 'confirmando',
};

const sessions = new Map();

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, {
      estado: ESTADOS.IDLE,
      id_categoria: null,
      categoria_desc: null,
      condicion: null,
      fabricante: null,
      modelo: null,
      serie: null,
    });
  }
  return sessions.get(chatId);
}

function clearSession(chatId) {
  sessions.set(chatId, {
    estado: ESTADOS.IDLE,
    id_categoria: null,
    categoria_desc: null,
    condicion: null,
    fabricante: null,
    modelo: null,
    serie: null,
  });
}

function resumenInsumo(session) {
  const icono = getIconoTipologia(session.categoria_desc || '');
  const condIcon = session.condicion === 'Asignable' ? '🏢' : '📤';
  const nombre = [session.fabricante, session.modelo].filter(Boolean).join(' ') || '(sin nombre)';
  const serie = session.serie ? `\n📎 *Serie:* ${session.serie}` : '';
  return `${icono} *${nombre}*\n📂 *Categoría:* ${session.categoria_desc}\n${condIcon} *Condición:* ${session.condicion}${serie}`;
}

// ============================================================
// INICIO DEL FLUJO
// ============================================================

async function iniciarRegistro(bot, chatId) {
  clearSession(chatId);
  const session = getSession(chatId);
  session.estado = ESTADOS.SELECCIONANDO_CATEGORIA;

  try {
    const response = await categoriasApi.getAll();
    const categorias = response.success ? (response.data || []) : [];

    if (categorias.length === 0) {
      await bot.sendMessage(chatId, '⚠️ No hay categorías activas. Creá una desde el panel web primero.', {
        reply_markup: menus.botonMenuPrincipal(),
      });
      clearSession(chatId);
      return;
    }

    await bot.sendMessage(chatId, '➕ *Registrar Nuevo Insumo*\n\nPaso 1/4 — Seleccioná la categoría:', {
      parse_mode: 'Markdown',
      reply_markup: menus.listaCategorias(categorias, 'reg_cat'),
    });
  } catch (error) {
    console.error('Error iniciando registro de insumo:', error);
    await bot.sendMessage(chatId, config.messages.error);
    clearSession(chatId);
  }
}

// ============================================================
// SELECCIÓN DE CONDICIÓN
// ============================================================

async function seleccionarCategoria(bot, chatId, categoriaId, categoriaDesc) {
  const session = getSession(chatId);
  session.id_categoria = categoriaId;
  session.categoria_desc = categoriaDesc;
  session.estado = ESTADOS.SELECCIONANDO_CONDICION;

  await bot.sendMessage(
    chatId,
    `➕ *Registrar Nuevo Insumo*\n\nPaso 2/4 — ¿Cómo se usa este insumo?\n\n📂 Categoría: *${categoriaDesc}*`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📤 Entregable (préstamo a persona)', callback_data: 'reg_cond_Entregable' },
          ],
          [
            { text: '🏢 Asignable (ubicación fija)', callback_data: 'reg_cond_Asignable' },
          ],
          [{ text: '❌ Cancelar', callback_data: 'cancelar' }],
        ],
      },
    }
  );
}

// ============================================================
// INGRESO DE DATOS DE TEXTO
// ============================================================

async function seleccionarCondicion(bot, chatId, condicion) {
  const session = getSession(chatId);
  session.condicion = condicion;
  session.estado = ESTADOS.INGRESANDO_FABRICANTE;

  await bot.sendMessage(
    chatId,
    `➕ *Registrar Nuevo Insumo*\n\nPaso 3/4 — Escribí el *fabricante* del insumo:\n_(Ej: Dell, HP, Epson — o escribí "omitir" para saltearlo)_`,
    {
      parse_mode: 'Markdown',
      reply_markup: menus.botonCancelar(),
    }
  );
}

async function procesarFabricante(bot, chatId, texto) {
  const session = getSession(chatId);
  session.fabricante = texto.toLowerCase() === 'omitir' ? null : texto.trim();
  session.estado = ESTADOS.INGRESANDO_MODELO;

  await bot.sendMessage(
    chatId,
    `➕ *Registrar Nuevo Insumo*\n\nPaso 3/4 — Ahora el *modelo*:\n_(Ej: Latitude 5420, OfficeJet 3833 — o escribí "omitir")_`,
    {
      parse_mode: 'Markdown',
      reply_markup: menus.botonCancelar(),
    }
  );
}

async function procesarModelo(bot, chatId, texto) {
  const session = getSession(chatId);
  session.modelo = texto.toLowerCase() === 'omitir' ? null : texto.trim();
  session.estado = ESTADOS.INGRESANDO_SERIE;

  await bot.sendMessage(
    chatId,
    `➕ *Registrar Nuevo Insumo*\n\nPaso 4/4 — ¿Tiene número de serie?\n_(Escribilo o escribí "omitir" para saltear)_`,
    {
      parse_mode: 'Markdown',
      reply_markup: menus.botonCancelar(),
    }
  );
}

async function procesarSerie(bot, chatId, texto) {
  const session = getSession(chatId);
  session.serie = texto.toLowerCase() === 'omitir' ? null : texto.trim();
  session.estado = ESTADOS.CONFIRMANDO;

  const resumen = resumenInsumo(session);
  await bot.sendMessage(
    chatId,
    `➕ *Registrar Nuevo Insumo*\n\n*Confirmá los datos:*\n\n${resumen}\n\n¿Todo correcto?`,
    {
      parse_mode: 'Markdown',
      reply_markup: menus.botonesConfirmacion('reg_confirmar'),
    }
  );
}

// ============================================================
// CONFIRMACIÓN Y POST AL BACKEND
// ============================================================

async function confirmarRegistro(bot, chatId) {
  const session = getSession(chatId);

  try {
    const response = await insumosApi.crear({
      id_categoria: session.id_categoria,
      condicion: session.condicion,
      fabricante: session.fabricante || undefined,
      modelo: session.modelo || undefined,
      serie: session.serie || undefined,
    });

    if (!response.success) throw new Error(response.error || 'Error al registrar');

    const icono = getIconoTipologia(session.categoria_desc || '');
    const nombre = [session.fabricante, session.modelo].filter(Boolean).join(' ') || 'Insumo';

    await bot.sendMessage(
      chatId,
      `✅ *Insumo registrado*\n\n${icono} *${nombre}* fue agregado al inventario con estado *Disponible*.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '➕ Registrar otro', callback_data: 'menu_registrar_insumo' },
              { text: '🏠 Menú Principal', callback_data: 'menu_principal' },
            ],
          ],
        },
      }
    );
    clearSession(chatId);
  } catch (error) {
    console.error('Error confirmando registro de insumo:', error);
    await bot.sendMessage(chatId, `❌ Error al registrar: ${error.message}`, {
      reply_markup: menus.botonMenuPrincipal(),
    });
    clearSession(chatId);
  }
}

// ============================================================
// ROUTERS
// ============================================================

async function handleMessage(bot, msg) {
  const chatId = msg.chat.id;
  const texto = msg.text;
  if (!texto || texto.startsWith('/')) return false;

  const session = getSession(chatId);
  switch (session.estado) {
    case ESTADOS.INGRESANDO_FABRICANTE:
      await procesarFabricante(bot, chatId, texto);
      return true;
    case ESTADOS.INGRESANDO_MODELO:
      await procesarModelo(bot, chatId, texto);
      return true;
    case ESTADOS.INGRESANDO_SERIE:
      await procesarSerie(bot, chatId, texto);
      return true;
    default:
      return false;
  }
}

async function handleCallback(bot, query) {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith('reg_cat_')) {
    const id = parseInt(data.replace('reg_cat_', ''));
    // Recuperar desc del texto del botón presionado (evita un round-trip al backend)
    const desc = query.message.reply_markup?.inline_keyboard
      ?.flat()
      ?.find((b) => b.callback_data === data)?.text
      ?.replace(/^[\u{1F300}-\u{1FFFF}\u{2600}-\u{27FF}]\s*/u, '') // strip emoji prefix
      || `Categoría ${id}`;
    await bot.answerCallbackQuery(query.id);
    await seleccionarCategoria(bot, chatId, id, desc.trim());
    return true;
  }

  if (data.startsWith('reg_cond_')) {
    const condicion = data.replace('reg_cond_', '');
    await bot.answerCallbackQuery(query.id);
    await seleccionarCondicion(bot, chatId, condicion);
    return true;
  }

  if (data === 'reg_confirmar') {
    await bot.answerCallbackQuery(query.id, { text: 'Registrando...' });
    await confirmarRegistro(bot, chatId);
    return true;
  }

  return false;
}

module.exports = {
  ESTADOS,
  getSession,
  clearSession,
  iniciarRegistro,
  handleMessage,
  handleCallback,
};
