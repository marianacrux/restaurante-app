import { api } from './api.js';

/** Domiciliarios activos con su entrega en curso. */
export async function fetchDeliveryPersons(params = {}) {
  const { data } = await api.get('/delivery-persons', { params });
  return data;
}

/** DISPONIBLE o INACTIVO (OCUPADO lo pone el sistema). */
export async function setCourierAvailability(id, availability) {
  const { data } = await api.patch(`/delivery-persons/${id}/availability`, { availability });
  return data;
}

/** Entregas. Ej.: { status: 'ASIGNADO,EN_CAMINO' }. El domiciliario recibe solo las suyas. */
export async function fetchDeliveries(params = {}) {
  const { data } = await api.get('/deliveries', { params });
  return data;
}

export async function assignDelivery(orderId, deliveryPersonId) {
  const { data } = await api.post('/deliveries/assign', { orderId, deliveryPersonId });
  return data;
}

export async function completeDelivery(id) {
  const { data } = await api.patch(`/deliveries/${id}/status`, { status: 'ENTREGADO' });
  return data;
}
