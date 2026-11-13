import { api } from './api.js';


export async function fetchOrders(params = {}) {
  const { data } = await api.get('/orders', { params });
  return data; 
}