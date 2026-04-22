/**
 * Manejador del flujo de asignaciones (items con condicion='Asignable')
 *
 * Flujo asignar: elegir item → elegir ubicación (obligatoria) → elegir persona (opcional) → confirmar
 * Flujo liberar: elegir item asignado → confirmar
 */

const config = require('../config');
const menus = require('../keyboards/menus');
const { insumosApi, usuariosApi, ubicacionesApi } = require('../services/api');
const { formatInsumoDetalle, getIconoTipologia, getDiasTranscurridos } = require('../utils/formatters');

const ESTADOS = {
  IDLE: 'idle',
  BUSCANDO_ITEM: 'buscando_item',
  SELECCIONANDO_UBICACION: 'seleccionando_ubicacion',
  BUSCANDO_PERSONA: 'buscando_persona',
  CONFIRMANDO_ASIGNACION: 'confirmando_asignacion',
  BUSCANDO_LIBERAR: 'buscando_liberar',
  CONFIRMANDO_LIBERAR: 'confirmando_liberar',
};

const sessions = new Map();

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, {
      estado: ESTADOS.IDLE,
      item: null,
      ubicacion: null,
      persona: null,
    });
  }
  return sessions.get(chatId);
}

function clearSession(chatId) {
  sessions.set(chatId, {
    estado: ESTADOS.IDLE,
    item: null,
    ubicacion: null,
    persona: null,
  });
}

// ============================================================
// FLUJO ASIGNAR
// ============================================================

async function iniciarAsignacion(bot, chatId, isGroup = false) {
  const session = getSession(chatId);
  session.estado = ESTADOS.BUSCANDO_ITEM;
  session.item = null;
  session.ubicacion = null;
  session.persona = null;
  session.isGroup = isGroup;

  try {
    const response = await insumosApi.getAsignablesDisponibles('');
    const items = response.success ? (response.data || []) : [];

    if (items.length === 0) {
      await bot.sendMessage(
        chatId,
        '📦 No hay items asignables disponibles.\n\n_Los items deben tener condición "Asignable" y estado "Disponible"._',
        { parse_mode: 'Markdown', reply_markup: menus.botonMenuPrincipal() }
      );
      clearSession(chatId);
      return;
    }

    let mensaje = `🏢 *Asignar Insumo*\n\nSelecciona un item asignable disponible (${items.length}):`;
    mensaje += '\n\n💡 _Podés escribir un texto para filtrar la lista._';
    if (isGroup) {
      mensaje += '\n_Respondé a este mensaje con tu búsqueda._';
    }

    await bot.sendMessage(chatId, mensaje, {
      parse_mode: 'Markdown',
      reply_markup: menus.listaInventarioAsignable(items, 'sel_asig_item'),
    });
  } catch (error) {
    console.error('Error iniciando asignación:', error);
    await bot.sendMessage(chatId, config.messages.error);
    clearSession(chatId);
  }
}

async function buscarItemsAsignables(bot, chatId, busqueda) {
  try {
    const response = await insumosApi.getAsignablesDisponibles(busqueda);
    const items = response.success ? (response.data || []) : [];

    if (items.length === 0) {
      await bot.sendMessage(chatId, `${config.messages.noResults}\n\nIntentá con otro término:`, {
        reply_markup: menus.botonCancelar(),
      });
      return;
    }

    await bot.sendMessage(
      chatId,
      `📦 *Items asignables encontrados* (${items.length})\n\nSelecciona uno:`,
      {
        parse_mode: 'Markdown',
        reply_markup: menus.listaInventarioAsignable(items, 'sel_asig_item'),
      }
    );
  } catch (error) {
    console.error('Error buscando items asignables:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

async function seleccionarItem(bot, chatId, itemId) {
  const session = getSession(chatId);
  try {
    const response = await insumosApi.getOne(itemId);
    if (!response.success) {
      await bot.sendMessage(chatId, 'Item no encontrado. Intentá nuevamente.');
      return;
    }
    session.item = response.data;
    session.estado = ESTADOS.SELECCIONANDO_UBICACION;

    const ubicacionesRes = await ubicacionesApi.getAll();
    const ubicaciones = ubicacionesRes.success ? (ubicacionesRes.data || []) : [];

    if (ubicaciones.length === 0) {
      await bot.sendMessage(
        chatId,
        '⚠️ No hay ubicaciones registradas. Cargá una desde la web antes de asignar.',
        { reply_markup: menus.botonMenuPrincipal() }
      );
      clearSession(chatId);
      return;
    }

    const info = formatInsumoDetalle(session.item);
    await bot.sendMessage(
      chatId,
      `✅ *Item seleccionado*\n\n${info}\n\n📍 *Elegí la ubicación* (obligatoria):`,
      {
        parse_mode: 'Markdown',
        reply_markup: menus.listaUbicaciones(ubicaciones, 'sel_asig_ubi'),
      }
    );
  } catch (error) {
    console.error('Error seleccionando item asignable:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

async function seleccionarUbicacion(bot, chatId, ubicacionId) {
  const session = getSession(chatId);
  try {
    const response = await ubicacionesApi.getOne(ubicacionId);
    if (!response.success) {
      await bot.sendMessage(chatId, 'Ubicación no encontrada. Intentá nuevamente.');
      return;
    }
    session.ubicacion = response.data;
    session.estado = ESTADOS.BUSCANDO_PERSONA;

    const isGroup = session.isGroup || false;
    let mensaje = `📍 *Ubicación:* ${session.ubicacion.desc}\n\n`;
    mensaje += '👤 *Persona responsable* (opcional)\n';
    mensaje += 'Escribí nombre, apellido o DNI para buscar, o usá "Omitir".';
    if (isGroup) {
      mensaje += '\n\n💡 _Respondé a este mensaje con tu búsqueda._';
    }

    await bot.sendMessage(chatId, mensaje, {
      parse_mode: 'Markdown',
      reply_markup: {
        ...menus.botonOmitirPersona(),
        force_reply: isGroup,
        selective: isGroup,
      },
    });
  } catch (error) {
    console.error('Error seleccionando ubicación:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

async function buscarPersonas(bot, chatId, busqueda) {
  try {
    const response = await usuariosApi.buscar(busqueda, 10);
    const usuarios = response.success ? (response.data || []) : [];

    if (usuarios.length === 0) {
      await bot.sendMessage(chatId, `${config.messages.noResults}\n\nIntentá con otro término o usá "Omitir":`, {
        reply_markup: menus.botonOmitirPersona(),
      });
      return;
    }

    await bot.sendMessage(
      chatId,
      `👥 *Usuarios encontrados* (${usuarios.length})\n\nSelecciona:`,
      {
        parse_mode: 'Markdown',
        reply_markup: menus.listaUsuarios(usuarios, 'sel_asig_persona'),
      }
    );
  } catch (error) {
    console.error('Error buscando personas:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

async function seleccionarPersona(bot, chatId, usuarioId) {
  const session = getSession(chatId);
  try {
    const response = await usuariosApi.getOne(usuarioId);
    if (!response.success) {
      await bot.sendMessage(chatId, 'Usuario no encontrado. Intentá nuevamente.');
      return;
    }
    session.persona = response.data;
    await mostrarConfirmacionAsignacion(bot, chatId);
  } catch (error) {
    console.error('Error seleccionando persona:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

async function omitirPersona(bot, chatId) {
  const session = getSession(chatId);
  session.persona = null;
  await mostrarConfirmacionAsignacion(bot, chatId);
}

async function mostrarConfirmacionAsignacion(bot, chatId) {
  const session = getSession(chatId);
  session.estado = ESTADOS.CONFIRMANDO_ASIGNACION;

  const item = session.item;
  const cat = item.categoria_desc || '';
  const icono = getIconoTipologia(cat);
  const nombre = [item.fabricante, item.modelo].filter(Boolean).join(' ') || '-';
  const serie = item.serie ? `\nSerie: \`${item.serie}\`` : '';
  const persona = session.persona
    ? `\n👤 *Persona:* ${session.persona.nombre} ${session.persona.apellido}`
    : '\n👤 *Persona:* _(sin asignar)_';

  const texto = `🏢 *Confirmar Asignación*\n\n` +
    `${icono} *${nombre}*${serie}\n` +
    `📍 *Ubicación:* ${session.ubicacion.desc}${session.ubicacion.piso ? ` (${session.ubicacion.piso})` : ''}` +
    persona +
    `\n\n¿Confirmar asignación?`;

  await bot.sendMessage(chatId, texto, {
    parse_mode: 'Markdown',
    reply_markup: menus.botonesConfirmacion('confirmar_asignacion'),
  });
}

async function confirmarAsignacion(bot, chatId) {
  const session = getSession(chatId);
  if (!session.item || !session.ubicacion) {
    await bot.sendMessage(chatId, 'Error: datos incompletos. Intentá nuevamente.');
    clearSession(chatId);
    return;
  }

  try {
    const response = await insumosApi.asignar(session.item.id, {
      id_ubicacion: session.ubicacion.id,
      id_asignado: session.persona ? session.persona.id : null,
      fecha_asignacion: new Date().toISOString(),
    });

    if (!response.success) {
      throw new Error(response.error || 'Error al asignar');
    }

    const destino = session.persona
      ? `${session.persona.nombre} ${session.persona.apellido} @ ${session.ubicacion.desc}`
      : session.ubicacion.desc;

    await bot.sendMessage(
      chatId,
      `✅ *Asignación registrada*\n\nEl item fue asignado a *${destino}* y marcado como "Asignado".`,
      {
        parse_mode: 'Markdown',
        reply_markup: menus.postAsignacion(),
      }
    );
    clearSession(chatId);
  } catch (error) {
    console.error('Error confirmando asignación:', error);
    await bot.sendMessage(chatId, `❌ Error al asignar: ${error.message}`, {
      reply_markup: menus.botonMenuPrincipal(),
    });
    clearSession(chatId);
  }
}

// ============================================================
// FLUJO LIBERAR
// ============================================================

async function iniciarLiberacion(bot, chatId) {
  const session = getSession(chatId);
  session.estado = ESTADOS.BUSCANDO_LIBERAR;
  session.item = null;

  try {
    const response = await insumosApi.getAsignados('');
    const items = response.success ? (response.data || []) : [];

    if (items.length === 0) {
      await bot.sendMessage(
        chatId,
        '📦 No hay items asignados actualmente.',
        { reply_markup: menus.botonMenuPrincipal() }
      );
      clearSession(chatId);
      return;
    }

    await bot.sendMessage(
      chatId,
      `🔓 *Liberar Asignación*\n\nSelecciona el item a liberar (${items.length}):`,
      {
        parse_mode: 'Markdown',
        reply_markup: menus.listaAsignacionesLiberar(items, 'sel_liberar'),
      }
    );
  } catch (error) {
    console.error('Error iniciando liberación:', error);
    await bot.sendMessage(chatId, config.messages.error);
    clearSession(chatId);
  }
}

async function seleccionarItemLiberar(bot, chatId, itemId) {
  const session = getSession(chatId);
  try {
    const response = await insumosApi.getOne(itemId);
    if (!response.success) {
      await bot.sendMessage(chatId, 'Item no encontrado.');
      return;
    }
    session.item = response.data;
    session.estado = ESTADOS.CONFIRMANDO_LIBERAR;

    const cat = session.item.categoria_desc || '';
    const icono = getIconoTipologia(cat);
    const nombre = [session.item.fabricante, session.item.modelo].filter(Boolean).join(' ') || '-';
    const ubi = session.item.ubicacion_desc ? `\n📍 *Ubicación actual:* ${session.item.ubicacion_desc}` : '';
    const asignado = session.item.asignado_nombre
      ? `\n👤 *Asignado a:* ${session.item.asignado_nombre}`
      : '';

    await bot.sendMessage(
      chatId,
      `🔓 *Confirmar Liberación*\n\n${icono} *${nombre}*${ubi}${asignado}\n\nAl liberar, el item volverá a "Disponible" y se removerá la persona asignada.`,
      {
        parse_mode: 'Markdown',
        reply_markup: menus.botonesConfirmacion('confirmar_liberacion'),
      }
    );
  } catch (error) {
    console.error('Error seleccionando item para liberar:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

async function confirmarLiberacion(bot, chatId) {
  const session = getSession(chatId);
  if (!session.item) {
    await bot.sendMessage(chatId, 'Error: datos incompletos.');
    clearSession(chatId);
    return;
  }

  try {
    const response = await insumosApi.liberar(session.item.id, {
      fecha_devolucion_real: new Date().toISOString(),
    });
    if (!response.success) throw new Error(response.error || 'Error al liberar');

    await bot.sendMessage(
      chatId,
      `✅ *Item liberado*\n\nEl item volvió a estado "Disponible".`,
      {
        parse_mode: 'Markdown',
        reply_markup: menus.postAsignacion(),
      }
    );
    clearSession(chatId);
  } catch (error) {
    console.error('Error confirmando liberación:', error);
    await bot.sendMessage(chatId, `❌ Error al liberar: ${error.message}`, {
      reply_markup: menus.botonMenuPrincipal(),
    });
    clearSession(chatId);
  }
}

// ============================================================
// LISTAR ASIGNACIONES ACTIVAS
// ============================================================

async function listarAsignaciones(bot, chatId) {
  try {
    const response = await insumosApi.getAsignados('');
    const items = response.success ? (response.data || []) : [];

    if (items.length === 0) {
      await bot.sendMessage(chatId, '📋 *Asignaciones Activas*\n\nNo hay items asignados actualmente.', {
        parse_mode: 'Markdown',
        reply_markup: menus.botonMenuPrincipal(),
      });
      return;
    }

    let texto = `🏢 *Asignaciones Activas* (${items.length})\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    items.slice(0, 20).forEach((item) => {
      const cat = item.categoria_desc || '';
      const icono = getIconoTipologia(cat);
      const nombre = [item.fabricante, item.modelo].filter(Boolean).join(' ') || '-';
      const ubi = item.ubicacion_desc || '—';
      const persona = item.asignado_nombre || '_(sin persona)_';
      const dias = item.fecha_asignacion ? getDiasTranscurridos(item.fecha_asignacion) : null;
      const diasTxt = dias !== null ? ` · ${dias}d` : '';
      texto += `\n${icono} *${nombre}*\n`;
      texto += `   📍 ${ubi} · 👤 ${persona}${diasTxt}\n`;
    });

    if (items.length > 20) {
      texto += `\n_... y ${items.length - 20} más._`;
    }

    await bot.sendMessage(chatId, texto, {
      parse_mode: 'Markdown',
      reply_markup: menus.botonMenuPrincipal(),
    });
  } catch (error) {
    console.error('Error listando asignaciones:', error);
    await bot.sendMessage(chatId, config.messages.error);
  }
}

// ============================================================
// ROUTERS
// ============================================================

async function handleMessage(bot, msg) {
  const chatId = msg.chat.id;
  const texto = msg.text;
  if (texto && texto.startsWith('/')) return false;

  const session = getSession(chatId);
  switch (session.estado) {
    case ESTADOS.BUSCANDO_ITEM:
      await buscarItemsAsignables(bot, chatId, texto);
      return true;
    case ESTADOS.BUSCANDO_PERSONA:
      await buscarPersonas(bot, chatId, texto);
      return true;
    default:
      return false;
  }
}

async function handleCallback(bot, query) {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith('sel_asig_item_')) {
    const id = parseInt(data.replace('sel_asig_item_', ''));
    await bot.answerCallbackQuery(query.id);
    await seleccionarItem(bot, chatId, id);
    return true;
  }
  if (data.startsWith('sel_asig_ubi_')) {
    const id = parseInt(data.replace('sel_asig_ubi_', ''));
    await bot.answerCallbackQuery(query.id);
    await seleccionarUbicacion(bot, chatId, id);
    return true;
  }
  if (data.startsWith('sel_asig_persona_')) {
    const id = parseInt(data.replace('sel_asig_persona_', ''));
    await bot.answerCallbackQuery(query.id);
    await seleccionarPersona(bot, chatId, id);
    return true;
  }
  if (data === 'omitir_persona') {
    await bot.answerCallbackQuery(query.id);
    await omitirPersona(bot, chatId);
    return true;
  }
  if (data === 'confirmar_asignacion') {
    await bot.answerCallbackQuery(query.id, { text: 'Asignando...' });
    await confirmarAsignacion(bot, chatId);
    return true;
  }
  if (data.startsWith('sel_liberar_')) {
    const id = parseInt(data.replace('sel_liberar_', ''));
    await bot.answerCallbackQuery(query.id);
    await seleccionarItemLiberar(bot, chatId, id);
    return true;
  }
  if (data === 'confirmar_liberacion') {
    await bot.answerCallbackQuery(query.id, { text: 'Liberando...' });
    await confirmarLiberacion(bot, chatId);
    return true;
  }

  return false;
}

module.exports = {
  ESTADOS,
  getSession,
  clearSession,
  iniciarAsignacion,
  iniciarLiberacion,
  listarAsignaciones,
  handleMessage,
  handleCallback,
};
