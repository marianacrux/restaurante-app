// Reglas del ciclo de vida de un pedido. Es el ÚNICO lugar donde se definen.
// Desde cada estado, a cuáles se puede pasar. 
export const STATUS_TRANSITIONS = Object.freeze({
  PENDIENTE: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['EN_PREPARACION', 'CANCELADO'],
  EN_PREPARACION: ['LISTO', 'CANCELADO'],
  LISTO: ['EN_CAMINO', 'ENTREGADO', 'CANCELADO'],
  EN_CAMINO: ['ENTREGADO', 'CANCELADO'],
  ENTREGADO: [],
  CANCELADO: [],
});

//A qué estados puede llevar cada rol un pedido (con PATCH /orders/:id/status)
export const ROLE_ALLOWED_TARGETS = Object.freeze({
  ADMIN: ['CONFIRMADO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO'],
  CAJERO: ['CONFIRMADO', 'ENTREGADO', 'CANCELADO'],
  COCINA: ['EN_PREPARACION', 'LISTO'],
  DOMICILIARIO: [],
});

//En pedidos a domicilio, estos estados solo se alcanzan con el módulo de domicilios. 
export const DELIVERY_ONLY_STATUSES = Object.freeze(['EN_CAMINO', 'ENTREGADO']);