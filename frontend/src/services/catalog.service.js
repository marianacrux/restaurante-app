import { api } from './api.js';

// ---------- Productos
export async function fetchProducts(params = {}) {
  const { data } = await api.get('/products', { params });
  return data;
}

export async function createProduct(body) {
  const { data } = await api.post('/products', body);
  return data;
}

export async function updateProduct(id, body) {
  const { data } = await api.put(`/products/${id}`, body);
  return data;
}

/** Lo retira del menú (no se borra: los pedidos antiguos lo conservan). */
export async function deactivateProduct(id) {
  const { data } = await api.delete(`/products/${id}`);
  return data;
}

export async function setProductAvailability(id, available) {
  const { data } = await api.patch(`/products/${id}/availability`, { available });
  return data;
}

// ---------- Categorías
export async function fetchCategories(params = {}) {
  const { data } = await api.get('/categories', { params });
  return data;
}

export async function createCategory(body) {
  const { data } = await api.post('/categories', body);
  return data;
}

export async function updateCategory(id, body) {
  const { data } = await api.put(`/categories/${id}`, body);
  return data;
}

// ---------- Imágenes
/** Sube una imagen y devuelve su URL (/uploads/…). */
export async function uploadImage(file) {
  const form = new FormData();
  form.append('image', file);
  const { data } = await api.post('/uploads', form);
  return data.url;
}
