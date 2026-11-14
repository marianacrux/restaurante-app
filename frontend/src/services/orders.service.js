import { api } from './api.js';

export async function fetchOrders(params = {}) {
  const { data } = await api.get('/orders', { params });
  return data;
}

export async function fetchOrder(id) {
  const { data } = await api.get(`/orders/${id}`);
  return data;
}

/** Crea un pedido manual. El backend calcula precios y totales. */
export async function createOrder(body) {
  const { data } = await api.post('/orders', body);
  return data;
}

export async function changeOrderStatus(id, body) {
  const { data } = await api.patch(`/orders/${id}/status`, body);
  return data;
}

export async function addOrderItems(id, items) {
  const { data } = await api.post(`/orders/${id}/items`, { items });
  return data;
}

export async function updateOrder(id, body) {
  const { data } = await api.patch(`/orders/${id}`, body);
  return data;
}
