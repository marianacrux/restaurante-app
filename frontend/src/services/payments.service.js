import { api } from './api.js';

export async function fetchPayments(params = {}) {
  const { data } = await api.get('/payments', { params });
  return data;
}

export async function registerPayment(body) {
  const { data } = await api.post('/payments', body);
  return data;
}

/** Solo administrador. */
export async function refundPayment(id, notes) {
  const { data } = await api.patch(`/payments/${id}`, { status: 'REEMBOLSADO', notes });
  return data;
}
