/**
 * Utilidades para formatear mensajes del bot
 */

const config = require('../config');

/**
 * Íconos por tipología de insumo
 */
const ICONOS_TIPOLOGIA = {
  'Notebook': '💻',
  'Mouse': '🖱️',
  'Teclado': '⌨️',
  'Monitor': '🖥️',
  'Proyector': '📽️',
  'Cable HDMI': '🔌',
  'Cable VGA': '🔌',
  'Webcam': '📷',
  'Auriculares': '🎧',
  'Otro': '📦',
};

/**
 * Obtiene el ícono para una tipología
 * @param {string} tipologia
 * @returns {string}
 */
function getIconoTipologia(tipologia) {
  return ICONOS_TIPOLOGIA[tipologia] || '📦';
}

/**
 * Formatea una fecha a string legible
 * @param {string|Date} fecha
 * @returns {string}
 */
function formatFecha(fecha) {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formatea fecha y hora
 * @param {string|Date} fecha
 * @returns {string}
 */
function formatFechaHora(fecha) {
  const d = new Date(fecha);
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calcula los días transcurridos desde una fecha
 * @param {string|Date} fecha
 * @returns {number}
 */
function getDiasTranscurridos(fecha) {
  const ahora = new Date();
  const inicio = new Date(fecha);
  const diffTime = Math.abs(ahora - inicio);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formatea un insumo para mostrar en lista
 * @param {object} insumo
 * @param {number} index - Índice en la lista (opcional)
 * @returns {string}
 */
function formatInsumoLista(insumo, index = null) {
  const cat = insumo.categoria_desc || insumo.tipologia || '';
  const icono = getIconoTipologia(cat);
  const nombre = [insumo.fabricante, insumo.modelo].filter(Boolean).join(' ') || insumo.nombre || '-';
  const serie = (insumo.serie || insumo.numero_serie) ? ` - ${insumo.serie || insumo.numero_serie}` : '';
  const prefix = index !== null ? `${index + 1}. ` : '';
  return `${prefix}${icono} ${nombre}${serie}`;
}

/**
 * Formatea un insumo para mostrar en detalle
 * @param {object} insumo
 * @returns {string}
 */
function formatInsumoDetalle(insumo) {
  const cat = insumo.categoria_desc || insumo.tipologia || '';
  const icono = getIconoTipologia(cat);
  const nombre = [insumo.fabricante, insumo.modelo].filter(Boolean).join(' ') || insumo.nombre || '-';
  const serie = insumo.serie || insumo.numero_serie;
  let text = `${icono} *${nombre}*\n`;
  text += `📁 Categoría: ${cat}\n`;
  if (insumo.lbl_activo) text += `🏷️ Etiqueta: ${insumo.lbl_activo}\n`;
  if (serie) text += `🔢 Serie: \`${serie}\`\n`;
  if (insumo.notas || insumo.descripcion) text += `📝 ${insumo.notas || insumo.descripcion}\n`;
  return text;
}

/**
 * Formatea un usuario para mostrar en lista
 * @param {object} usuario
 * @param {number} index - Índice en la lista (opcional)
 * @returns {string}
 */
function formatUsuarioLista(usuario, index = null) {
  const prefix = index !== null ? `${index + 1}. ` : '';
  return `${prefix}👤 ${usuario.apellido}, ${usuario.nombre} - DNI: ${usuario.dni} (${usuario.area_desc || usuario.area_equipo || '-'})`;
}

/**
 * Formatea un usuario para mostrar en detalle
 * @param {object} usuario
 * @returns {string}
 */
function formatUsuarioDetalle(usuario) {
  return `👤 *${usuario.nombre} ${usuario.apellido}*
📋 DNI: ${usuario.dni}
🏢 Área: ${usuario.area_desc || usuario.area_equipo || '-'}
📧 ${usuario.mail}`;
}

/**
 * Formatea un préstamo para mostrar en lista
 * @param {object} prestamo
 * @param {number} index - Índice en la lista (opcional)
 * @returns {string}
 */
function formatPrestamoLista(prestamo, index = null) {
  const cat = prestamo.inventario_categoria || prestamo.insumo_tipologia || prestamo.tipologia || '';
  const icono = getIconoTipologia(cat);
  const nombre = prestamo.inventario_descripcion
    || [prestamo.inventario_fabricante, prestamo.inventario_modelo].filter(Boolean).join(' ')
    || prestamo.insumo_nombre || prestamo.nombre || '-';
  const dias = getDiasTranscurridos(prestamo.fecha_hora_prestamo);
  const critico = dias >= config.alerts.diasCriticos ? ' ⚠️' : '';
  const prefix = index !== null ? `${index + 1}. ` : '';

  return `${prefix}${icono} ${nombre}
   👤 ${prestamo.usuario_nombre} ${prestamo.usuario_apellido} - ${dias} día(s)${critico}`;
}

/**
 * Formatea un préstamo para mostrar en detalle
 * @param {object} prestamo
 * @returns {string}
 */
function formatPrestamoDetalle(prestamo) {
  const cat = prestamo.inventario_categoria || prestamo.insumo_tipologia || prestamo.tipologia || '';
  const icono = getIconoTipologia(cat);
  const nombre = prestamo.inventario_descripcion
    || [prestamo.inventario_fabricante, prestamo.inventario_modelo].filter(Boolean).join(' ')
    || prestamo.insumo_nombre || prestamo.nombre || '-';
  const dias = getDiasTranscurridos(prestamo.fecha_hora_prestamo);
  const critico = dias >= config.alerts.diasCriticos ? ' ⚠️ CRÍTICO' : '';

  let text = `${icono} *${nombre}*${critico}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `👤 Usuario: ${prestamo.usuario_nombre} ${prestamo.usuario_apellido}\n`;
  text += `🏢 Área: ${prestamo.usuario_area || prestamo.area_equipo || '-'}\n`;
  text += `📅 Prestado: ${formatFechaHora(prestamo.fecha_hora_prestamo)}\n`;
  text += `⏱️ Duración: ${dias} día(s)\n`;

  if (prestamo.usuario_it_nombre) {
    text += `👨‍💼 Responsable IT: ${prestamo.usuario_it_nombre} ${prestamo.usuario_it_apellido}\n`;
  }

  if (prestamo.observaciones_prestamo) {
    text += `📝 Obs: ${prestamo.observaciones_prestamo}\n`;
  }

  return text;
}

/**
 * Formatea el resumen de préstamos activos
 * @param {object[]} prestamos
 * @returns {string}
 */
function formatResumenActivos(prestamos) {
  if (!prestamos || prestamos.length === 0) {
    return '✅ No hay préstamos activos actualmente.';
  }

  const criticos = prestamos.filter(p =>
    getDiasTranscurridos(p.fecha_hora_prestamo) >= config.alerts.diasCriticos
  );
  const normales = prestamos.filter(p =>
    getDiasTranscurridos(p.fecha_hora_prestamo) < config.alerts.diasCriticos
  );

  let text = `📋 *PRÉSTAMOS ACTIVOS* (${prestamos.length})\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (criticos.length > 0) {
    text += `⚠️ *CRÍTICOS* (más de ${config.alerts.diasCriticos} días):\n`;
    criticos.forEach((p, i) => {
      text += formatPrestamoLista(p, i) + '\n';
    });
    text += '\n';
  }

  if (normales.length > 0) {
    text += `📅 *NORMALES*:\n`;
    normales.forEach((p, i) => {
      text += formatPrestamoLista(p, i) + '\n';
    });
  }

  return text;
}

/**
 * Formatea el resumen del día
 * @param {object} metricas - Datos del endpoint /dashboard/metricas
 * @returns {string}
 */
function formatResumenDia(metricas) {
  const fecha = formatFecha(new Date());

  // Extraer datos de la estructura anidada de la API
  const prestamos = metricas.prestamos || {};
  const insumos = metricas.inventario || metricas.insumos || {};
  const usuarios = metricas.usuarios || {};

  let text = `📊 *RESUMEN DEL DÍA* - ${fecha}
━━━━━━━━━━━━━━━━━━━━━━━━━━

📤 *Préstamos*
   • Activos hoy: ${prestamos.activos_hoy || 0}
   • Pendientes (1+ días): ${prestamos.pendientes || 0}
   • Total activos: ${prestamos.total_activos || 0}`;

  // Desglose si hay préstamos pendientes
  if (prestamos.desglose) {
    const d = prestamos.desglose;
    if (d.dia_1 > 0 || d.dias_2_3 > 0 || d.dias_4_plus > 0) {
      text += `\n   📅 Desglose:`;
      if (d.dia_1 > 0) text += `\n      • 1 día: ${d.dia_1}`;
      if (d.dias_2_3 > 0) text += `\n      • 2-3 días: ${d.dias_2_3}`;
      if (d.dias_4_plus > 0) text += `\n      • 4+ días: ${d.dias_4_plus} ⚠️`;
    }
  }

  text += `

📦 *Inventario*
   • Disponibles: ${insumos.disponibles || 0}
   • Asignados: ${insumos.asignados || insumos.en_prestamo || 0}
   • En reparación: ${insumos.en_reparacion || insumos.en_mantenimiento || 0}
   • Total: ${insumos.total || 0}

👥 *Usuarios*
   • Activos: ${usuarios.activos || 0}
   • Soporte IT: ${usuarios.soporte_it || 0}`;

  return text;
}

/**
 * Formatea mensaje de confirmación de préstamo
 * @param {object} insumo
 * @param {object} usuario
 * @param {object} responsableIt
 * @returns {string}
 */
function formatConfirmacionPrestamo(insumo, usuario, responsableIt) {
  const cat = insumo.categoria_desc || insumo.tipologia || '';
  const icono = getIconoTipologia(cat);
  const nombre = [insumo.fabricante, insumo.modelo].filter(Boolean).join(' ') || insumo.nombre || '-';
  const serie = insumo.serie || insumo.numero_serie;
  const fecha = formatFechaHora(new Date());

  return `✅ *Confirmar Préstamo*
━━━━━━━━━━━━━━━━━━━━

${icono} *Item:* ${nombre}
🔢 *Serie:* ${serie || 'N/A'}
📁 *Categoría:* ${cat}

👤 *Usuario:* ${usuario.nombre} ${usuario.apellido}
🏢 *Área:* ${usuario.area_desc || usuario.area_equipo || '-'}

👨‍💼 *Responsable IT:* ${responsableIt.nombre} ${responsableIt.apellido}
📅 *Fecha:* ${fecha}`;
}

/**
 * Formatea mensaje de confirmación de devolución
 * @param {object} prestamo
 * @returns {string}
 */
function formatConfirmacionDevolucion(prestamo) {
  const cat = prestamo.inventario_categoria || prestamo.insumo_tipologia || prestamo.tipologia || '';
  const icono = getIconoTipologia(cat);
  const nombre = prestamo.inventario_descripcion
    || [prestamo.inventario_fabricante, prestamo.inventario_modelo].filter(Boolean).join(' ')
    || prestamo.insumo_nombre || prestamo.nombre || '-';
  const dias = getDiasTranscurridos(prestamo.fecha_hora_prestamo);

  return `📥 *Confirmar Devolución*
━━━━━━━━━━━━━━━━━━━━

${icono} *Item:* ${nombre}
👤 *Devuelve:* ${prestamo.usuario_nombre} ${prestamo.usuario_apellido}
⏱️ *Duración del préstamo:* ${dias} día(s)`;
}

/**
 * Escapa caracteres especiales de Markdown
 * @param {string} text
 * @returns {string}
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

module.exports = {
  ICONOS_TIPOLOGIA,
  getIconoTipologia,
  formatFecha,
  formatFechaHora,
  getDiasTranscurridos,
  formatInsumoLista,
  formatInsumoDetalle,
  formatUsuarioLista,
  formatUsuarioDetalle,
  formatPrestamoLista,
  formatPrestamoDetalle,
  formatResumenActivos,
  formatResumenDia,
  formatConfirmacionPrestamo,
  formatConfirmacionDevolucion,
  escapeMarkdown,
};
