import { api } from './api.js';

/** Contenido público de una pantalla (lo usan los televisores, sin sesión). */
export async function fetchScreenDisplay(number) {
  const { data } = await api.get(`/screens/${number}/content`);
  return data;
}

// ---------- Administración (solo ADMIN)
export async function fetchScreens() {
  const { data } = await api.get('/screens');
  return data;
}

export async function fetchScreenConfig(number) {
  const { data } = await api.get(`/screens/${number}/config`);
  return data;
}

export async function saveScreenContent(number, body) {
  const { data } = await api.put(`/screens/${number}/content`, body);
  return data;
}

export async function fetchPromotions() {
  const { data } = await api.get('/promotions');
  return data;
}

export async function fetchProducts() {
  const { data } = await api.get('/products', { params: { includeInactive: true } });
  return data.filter((p) => p.active);
}
