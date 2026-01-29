import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea una fecha a formato argentino DD/MM/YYYY HH:MM
 */
export function formatearFechaArg(fecha) {
  if (!fecha) return '-';
  try {
    const date = typeof fecha === 'string' ? parseISO(fecha) : fecha;
    return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
  } catch {
    return '-';
  }
}

/**
 * Formatea una fecha a formato corto DD/MM/YYYY
 */
export function formatearFechaCorta(fecha) {
  if (!fecha) return '-';
  try {
    const date = typeof fecha === 'string' ? parseISO(fecha) : fecha;
    return format(date, 'dd/MM/yyyy', { locale: es });
  } catch {
    return '-';
  }
}

/**
 * Convierte una fecha a ISO string para el backend
 */
export function toISOString(date) {
  if (!date) return null;
  return date.toISOString();
}

/**
 * Obtiene los colores para el badge según los días transcurridos
 */
export function getColorClasses(diasTranscurridos) {
  if (diasTranscurridos === 0) {
    return {
      badge: 'bg-green-100 text-green-800',
      text: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
    };
  }
  if (diasTranscurridos === 1) {
    return {
      badge: 'bg-yellow-100 text-yellow-800',
      text: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
    };
  }
  if (diasTranscurridos <= 3) {
    return {
      badge: 'bg-orange-100 text-orange-800',
      text: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
    };
  }
  return {
    badge: 'bg-red-100 text-red-800',
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    animate: 'animate-pulse-alert',
  };
}

/**
 * Obtiene el texto del estado visual según los días transcurridos
 */
export function getEstadoTexto(diasTranscurridos) {
  if (diasTranscurridos === 0) return 'Activo hoy';
  if (diasTranscurridos === 1) return '1 día sin devolver';
  return `${diasTranscurridos} días sin devolver`;
}

/**
 * Obtiene el icono según los días transcurridos
 */
export function getEstadoIcono(diasTranscurridos) {
  if (diasTranscurridos === 0) return '✓';
  if (diasTranscurridos === 1) return '⚠️';
  if (diasTranscurridos <= 3) return '🔔';
  return '🚨';
}
