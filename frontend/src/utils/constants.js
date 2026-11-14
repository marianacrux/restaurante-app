// Textos y colores de los valores que envía el backend.
// `color` es un color de Mantine (gray, blue, yellow, green, violet, teal, red, orange…).

export const ROLE_LABEL = {
  ADMIN: 'Administrador',
  CAJERO: 'Cajero',
  COCINA: 'Cocina',
  DOMICILIARIO: 'Domiciliario',
};

export const ROLE_COLOR = {
  ADMIN: 'brand',
  CAJERO: 'blue',
  COCINA: 'yellow',
  DOMICILIARIO: 'violet',
};

export const ORDER_STATUS = {
  PENDIENTE: { label: 'Pendiente', color: 'gray' },
  CONFIRMADO: { label: 'Confirmado', color: 'blue' },
  EN_PREPARACION: { label: 'En preparación', color: 'yellow' },
  LISTO: { label: 'Listo', color: 'green' },
  EN_CAMINO: { label: 'En camino', color: 'violet' },
  ENTREGADO: { label: 'Entregado', color: 'teal' },
  CANCELADO: { label: 'Cancelado', color: 'red' },
};

/** Texto del botón para llevar un pedido a cada estado. */
export const STATUS_ACTION_LABEL = {
  CONFIRMADO: 'Confirmar',
  EN_PREPARACION: 'Iniciar preparación',
  LISTO: 'Marcar listo',
  ENTREGADO: 'Marcar entregado',
  CANCELADO: 'Cancelar pedido',
};

export const ORDER_SOURCE = {
  WHATSAPP: 'WhatsApp',
  VITRINA: 'Vitrina',
  PUNTO_DE_VENTA: 'Punto de venta',
  DOMICILIO: 'Domicilio',
};

export const ORDER_TYPE = {
  EN_LOCAL: 'En el local',
  PARA_LLEVAR: 'Para llevar',
  DOMICILIO: 'Domicilio',
};

export const PAYMENT_METHOD = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  NEQUI: 'Nequi',
  DAVIPLATA: 'Daviplata',
  TARJETA: 'Tarjeta',
  CONTRAENTREGA_EFECTIVO: 'Contraentrega (efectivo)',
};

export const PAYMENT_STATUS = {
  PENDIENTE: { label: 'Pendiente', color: 'yellow' },
  PARCIAL: { label: 'Parcial', color: 'blue' },
  PAGADO: { label: 'Pagado', color: 'green' },
  REEMBOLSADO: { label: 'Reembolsado', color: 'red' },
};

export const TRANSPORT_TYPE = {
  A_PIE: 'A pie',
  BICICLETA: 'Bicicleta',
  MOTOCICLETA: 'Moto',
};

export const COURIER_STATUS = {
  DISPONIBLE: { label: 'Disponible', color: 'green' },
  OCUPADO: { label: 'En entrega', color: 'violet' },
  INACTIVO: { label: 'Descanso', color: 'gray' },
};

/** Lista para <Select data={...}>: [{ value, label }] */
export const toOptions = (dict) =>
  Object.entries(dict).map(([value, v]) => ({ value, label: typeof v === 'string' ? v : v.label }));
