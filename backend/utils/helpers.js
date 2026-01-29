/**
 * Calcula los días transcurridos desde una fecha de préstamo
 * @param {string} fechaPrestamo - Fecha del préstamo en formato ISO
 * @returns {number} - Días transcurridos
 */
function getDiasTranscurridos(fechaPrestamo) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const prestamo = new Date(fechaPrestamo);
  prestamo.setHours(0, 0, 0, 0);
  const diffTime = hoy - prestamo;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Obtiene el estado visual según los días transcurridos
 * @param {number} diasTranscurridos - Número de días desde el préstamo
 * @returns {Object} - Objeto con color, nivel, texto e icono
 */
function getEstadoVisual(diasTranscurridos) {
  if (diasTranscurridos === 0) {
    return {
      color: 'green',
      nivel: 'normal',
      texto: 'Activo hoy',
      icono: '✓'
    };
  }
  if (diasTranscurridos === 1) {
    return {
      color: 'yellow',
      nivel: 'advertencia',
      texto: '1 día sin devolver',
      icono: '⚠️'
    };
  }
  if (diasTranscurridos <= 3) {
    return {
      color: 'orange',
      nivel: 'alerta',
      texto: `${diasTranscurridos} días sin devolver`,
      icono: '🔔'
    };
  }
  return {
    color: 'red',
    nivel: 'critico',
    texto: `${diasTranscurridos} días sin devolver`,
    icono: '🚨'
  };
}

/**
 * Formatea una fecha a formato argentino DD/MM/YYYY HH:MM
 * @param {string|Date} fecha - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
function formatearFechaArg(fecha) {
  if (!fecha) return null;
  const d = new Date(fecha);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${anio} ${hora}:${min}`;
}

/**
 * Obtiene la fecha actual en formato ISO para SQLite
 * @returns {string} - Fecha en formato ISO
 */
function getFechaActual() {
  return new Date().toISOString();
}

module.exports = {
  getDiasTranscurridos,
  getEstadoVisual,
  formatearFechaArg,
  getFechaActual
};
