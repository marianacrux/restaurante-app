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

// ---------- Fase 10: pagos y domicilios

export const PAYMENT_METHOD = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  NEQUI: 'Nequi',
  DAVIPLATA: 'Daviplata',
  TARJETA: 'Tarjeta',
  CONTRAENTREGA_EFECTIVO: 'Contraentrega (efectivo)',
};

export const PAYMENT_STATUS = {
  PENDIENTE: { label: 'Pendiente', tone: 'warning' },
  PARCIAL: { label: 'Parcial', tone: 'info' },
  PAGADO: { label: 'Pagado', tone: 'success' },
  REEMBOLSADO: { label: 'Reembolsado', tone: 'danger' },
};

export const TRANSPORT_TYPE = {
  A_PIE: 'A pie',
  BICICLETA: 'Bicicleta',
  MOTOCICLETA: 'Moto',
};

export const COURIER_STATUS = {
  DISPONIBLE: { label: 'Disponible', tone: 'success' },
  OCUPADO: { label: 'En entrega', tone: 'accent' },
  INACTIVO: { label: 'Descanso', tone: 'neutral' },
};
