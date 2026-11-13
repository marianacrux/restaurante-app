import { api } from './api.js';


export async function fetchOrders(params = {}) {
  const { data } = await api.get('/orders', { params });
  return data; 
}

export async function changeOrderStatus(id, body) {
  const { data } = await api.patch(`/orders/${id}/status`, body);
  return data;
}