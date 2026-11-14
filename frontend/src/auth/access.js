// LÓGICA DE ACCESOS: el ÚNICO lugar del frontend donde se decide quién ve qué.
// El menú, las rutas protegidas y los botones leen de aquí.
// (El backend vuelve a validar todo: esto es para la experiencia, no la seguridad.)

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  CAJERO: 'CAJERO',
  COCINA: 'COCINA',
  DOMICILIARIO: 'DOMICILIARIO',
});

const { ADMIN, CAJERO, COCINA, DOMICILIARIO } = ROLES;
const ALL = [ADMIN, CAJERO, COCINA, DOMICILIARIO];

/**
 * Secciones de la aplicación. `group` agrupa el menú lateral.
 * `hidden: true` = ruta protegida que no aparece en el menú (se llega con un botón).
 */
export const SECTIONS = [
  { path: '/inicio', label: 'Inicio', icon: 'home', roles: ALL, group: 'General' },
  { path: '/dashboard', label: 'Dashboard', icon: 'chart', roles: [ADMIN, CAJERO], group: 'General' },

  { path: '/pedidos/nuevo', label: 'Nuevo pedido', icon: 'plus', roles: [ADMIN, CAJERO], group: 'Operación' },
  { path: '/pedidos', label: 'Pedidos', icon: 'list', roles: [ADMIN, CAJERO, COCINA], group: 'Operación' },
  { path: '/cocina', label: 'Cocina', icon: 'chef', roles: [ADMIN, CAJERO, COCINA], group: 'Operación' },
  { path: '/domicilios', label: 'Domicilios', icon: 'moto', roles: [ADMIN, CAJERO], group: 'Operación' },
  { path: '/mis-entregas', label: 'Mis entregas', icon: 'moto', roles: [DOMICILIARIO], group: 'Operación' },

  { path: '/pagos', label: 'Pagos', icon: 'cash', roles: [ADMIN, CAJERO], group: 'Caja' },

  { path: '/productos', label: 'Productos y menú', icon: 'menu', roles: [ADMIN, CAJERO, COCINA], group: 'Catálogo' },
  { path: '/promociones', label: 'Promociones', icon: 'discount', roles: [ADMIN], group: 'Catálogo' },

  { path: '/whatsapp', label: 'Simulador WhatsApp', icon: 'chat', roles: [ADMIN, CAJERO], group: 'Canales' },
  { path: '/pantallas', label: 'Pantallas', icon: 'tv', roles: [ADMIN], group: 'Canales' },

  { path: '/reportes', label: 'Reportes Excel', icon: 'excel', roles: [ADMIN], group: 'Administración' },
  { path: '/usuarios', label: 'Usuarios', icon: 'users', roles: [ADMIN], group: 'Administración' },
  { path: '/ajustes', label: 'Ajustes', icon: 'settings', roles: [ADMIN], group: 'Administración' },
];

/** Página a la que llega cada rol al iniciar sesión (lo que más usa). */
const HOME_BY_ROLE = {
  [ADMIN]: '/dashboard',
  [CAJERO]: '/pedidos/nuevo',
  [COCINA]: '/cocina',
  [DOMICILIARIO]: '/mis-entregas',
};

export const homeFor = (role) => HOME_BY_ROLE[role] ?? '/inicio';

/** ¿El rol puede abrir esta ruta? Se usa la sección más específica (p. ej. /pedidos/nuevo antes que /pedidos). */
export function canAccessPath(role, path) {
  const section = SECTIONS.filter((s) => path === s.path || path.startsWith(`${s.path}/`)).sort((a, b) => b.path.length - a.path.length)[0];
  return section ? section.roles.includes(role) : true;
}

export const sectionsFor = (role) => SECTIONS.filter((s) => s.roles.includes(role) && !s.hidden);

/**
 * Acciones puntuales dentro de una página (botones).
 * Deben coincidir con los authorize(...) del backend.
 */
const PERMISSIONS = {
  'orders.create': [ADMIN, CAJERO],
  'orders.edit': [ADMIN, CAJERO],
  'orders.changeStatus': [ADMIN, CAJERO, COCINA],
  'deliveries.assign': [ADMIN, CAJERO],
  'couriers.setAvailability': [ADMIN, CAJERO],
  'couriers.manage': [ADMIN],
  'payments.register': [ADMIN, CAJERO],
  'payments.refund': [ADMIN],
  'products.manage': [ADMIN],
  'products.setAvailability': [ADMIN, CAJERO, COCINA],
  'screens.edit': [ADMIN],
};

/** Ej.: can(user, 'payments.refund') */
export const can = (user, permission) => Boolean(user && PERMISSIONS[permission]?.includes(user.role));
