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
 * `fullscreen: true` = se muestra sin menú lateral (pantalla de cocina).
 */
export const SECTIONS = [
  { path: '/inicio', label: 'Inicio', icon: 'home', roles: ALL, group: 'General' },
  { path: '/dashboard', label: 'Dashboard', icon: 'chart', roles: [ADMIN, CAJERO], group: 'General' },
  { path: '/pedidos', label: 'Pedidos', icon: 'list', roles: [ADMIN, CAJERO, COCINA], group: 'Operación' },
  { path: '/cocina', label: 'Cocina', icon: 'chef', roles: [ADMIN, CAJERO, COCINA], group: 'Operación', fullscreen: true },
  { path: '/domicilios', label: 'Domicilios', icon: 'moto', roles: [ADMIN, CAJERO], group: 'Operación' },
  { path: '/mis-entregas', label: 'Mis entregas', icon: 'moto', roles: [DOMICILIARIO], group: 'Operación' },
  { path: '/pagos', label: 'Pagos', icon: 'cash', roles: [ADMIN, CAJERO], group: 'Caja' },
  { path: '/whatsapp', label: 'Simulador WhatsApp', icon: 'chat', roles: [ADMIN, CAJERO], group: 'Canales' },
  { path: '/pantallas', label: 'Pantallas', icon: 'tv', roles: [ADMIN], group: 'Canales' },
];

/** Página a la que llega cada rol al iniciar sesión (lo que más usa). */
const HOME_BY_ROLE = {
  [ADMIN]: '/dashboard',
  [CAJERO]: '/pedidos',
  [COCINA]: '/cocina',
  [DOMICILIARIO]: '/mis-entregas',
};

export const homeFor = (role) => HOME_BY_ROLE[role] ?? '/inicio';

/** ¿El rol puede abrir esta ruta? Rutas no registradas aquí: solo usuarios con sesión. */
export function canAccessPath(role, path) {
  const section = SECTIONS.find((s) => path === s.path || path.startsWith(`${s.path}/`));
  return section ? section.roles.includes(role) : true;
}

export const sectionsFor = (role) => SECTIONS.filter((s) => s.roles.includes(role));

/**
 * Acciones puntuales dentro de una página (botones).
 * Deben coincidir con los authorize(...) del backend.
 */
const PERMISSIONS = {
  'orders.changeStatus': [ADMIN, CAJERO, COCINA],
  'deliveries.assign': [ADMIN, CAJERO],
  'couriers.setAvailability': [ADMIN, CAJERO],
  'payments.register': [ADMIN, CAJERO],
  'payments.refund': [ADMIN],
  'screens.edit': [ADMIN],
};

/** Ej.: can(user, 'payments.refund') */
export const can = (user, permission) => Boolean(user && PERMISSIONS[permission]?.includes(user.role));
