export const ROLE_LABEL = {
  ADMIN: 'Administrador',
  CAJERO: 'Cajero',
  COCINA: 'Cocina',
  DOMICILIARIO: 'Domiciliario',
};

export const ORDER_STATUS = {
  PENDIENTE: { label: 'Pendiente', tone: 'neutral' },
  CONFIRMADO: { label: 'Confirmado', tone: 'info' },
  EN_PREPARACION: { label: 'En preparación', tone: 'warning' },
  LISTO: { label: 'Listo', tone: 'success' },
  EN_CAMINO: { label: 'En camino', tone: 'accent' },
  ENTREGADO: { label: 'Entregado', tone: 'done' },
  CANCELADO: { label: 'Cancelado', tone: 'danger' },
};

export const ORDER_SOURCE = {
  WHATSAPP: 'WhatsApp',
  VITRINA: 'Vitrina',
  PUNTO_DE_VENTA: 'Punto de venta',
  DOMICILIO: 'Domicilio',
};