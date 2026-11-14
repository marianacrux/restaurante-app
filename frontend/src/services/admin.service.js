import { api } from './api.js';

// ---------- Usuarios
export async function fetchUsers() {
  const { data } = await api.get('/users');
  return data;
}

export async function createUser(body) {
  const { data } = await api.post('/users', body);
  return data;
}

export async function updateUser(id, body) {
  const { data } = await api.put(`/users/${id}`, body);
  return data;
}

// ---------- Ajustes
export async function fetchSettings() {
  const { data } = await api.get('/settings');
  return data;
}

export async function saveSettings(body) {
  const { data } = await api.put('/settings', body);
  return data;
}

// ---------- Reportes
export async function fetchReports() {
  const { data } = await api.get('/reports');
  return data;
}

export async function runReportNow() {
  const { data } = await api.post('/reports/run');
  return data;
}

/** Descarga el Excel con el token (por eso no basta con un enlace normal). */
export async function downloadReport(fileName) {
  const { data } = await api.get('/reports/download', { responseType: 'blob', timeout: 30000 });
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

// ---------- Domiciliarios (crear / editar)
export async function createCourier(body) {
  const { data } = await api.post('/delivery-persons', body);
  return data;
}

export async function updateCourier(id, body) {
  const { data } = await api.put(`/delivery-persons/${id}`, body);
  return data;
}

// ---------- Promociones
export async function createPromotion(body) {
  const { data } = await api.post('/promotions', body);
  return data;
}

export async function updatePromotion(id, body) {
  const { data } = await api.put(`/promotions/${id}`, body);
  return data;
}

// ---------- Seguimiento público (clientes)
export async function trackOrder(orderNumber, phone) {
  const { data } = await api.get(`/public/orders/${orderNumber}`, { params: { phone } });
  return data;
}
