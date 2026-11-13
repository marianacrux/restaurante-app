import { api } from './api.js';

/** Resumen de un día ('AAAA-MM-DD'); sin fecha = hoy. */
export async function fetchSummary(date) {
  const { data } = await api.get('/dashboard/summary', { params: { date } });
  return data;
}

/** Ventas por día. Con { to } trae los 7 días que terminan en esa fecha. */
export async function fetchSalesByDay(params = {}) {
  const { data } = await api.get('/dashboard/sales', { params });
  return data;
}