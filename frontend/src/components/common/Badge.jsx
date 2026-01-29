export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
    // Estados de insumos
    disponible: 'bg-green-100 text-green-800',
    'en-prestamo': 'bg-yellow-100 text-yellow-800',
    'en-mantenimiento': 'bg-orange-100 text-orange-800',
    'dado-de-baja': 'bg-red-100 text-red-800',
    // Roles
    usuario: 'bg-gray-100 text-gray-700',
    soporte_it: 'bg-blue-100 text-blue-700',
  };

  return (
    <span className={`badge ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
}

// Badge para estado de insumo
export function EstadoInsumoBadge({ estado }) {
  const config = {
    'Disponible': { variant: 'disponible', icon: '✓' },
    'En préstamo': { variant: 'en-prestamo', icon: '📤' },
    'En mantenimiento': { variant: 'en-mantenimiento', icon: '🔧' },
    'Dado de baja': { variant: 'dado-de-baja', icon: '✖️' },
  };

  const { variant, icon } = config[estado] || { variant: 'default', icon: '' };

  return (
    <Badge variant={variant}>
      <span className="mr-1">{icon}</span>
      {estado}
    </Badge>
  );
}

// Badge para rol de usuario
export function RolBadge({ rol }) {
  const config = {
    usuario: { label: 'Usuario', variant: 'usuario' },
    soporte_it: { label: 'Soporte IT', variant: 'soporte_it', icon: '🔧' },
  };

  const { label, variant, icon } = config[rol] || { label: rol, variant: 'default' };

  return (
    <Badge variant={variant}>
      {icon && <span className="mr-1">{icon}</span>}
      {label}
    </Badge>
  );
}

// Badge para estado de préstamo con días
export function EstadoPrestamoBadge({ diasTranscurridos, animate = false }) {
  let variant = 'success';
  let texto = 'Activo hoy';
  let icon = '✓';

  if (diasTranscurridos === 1) {
    variant = 'warning';
    texto = '1 día sin devolver';
    icon = '⚠️';
  } else if (diasTranscurridos >= 2 && diasTranscurridos <= 3) {
    variant = 'orange';
    texto = `${diasTranscurridos} días sin devolver`;
    icon = '🔔';
  } else if (diasTranscurridos >= 4) {
    variant = 'danger';
    texto = `${diasTranscurridos} días sin devolver`;
    icon = '🚨';
  }

  return (
    <Badge variant={variant} className={animate && diasTranscurridos >= 4 ? 'animate-pulse-alert' : ''}>
      <span className="mr-1">{icon}</span>
      {texto}
    </Badge>
  );
}
