import axios from 'axios';
import { storage } from '../utils/storage.js';

export const TOKEN_KEY = 'rm_token'; 

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});


api.interceptors.request.use((config) => {
  const token = storage.get(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}


api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLogin) onUnauthorized();
    return Promise.reject(error); 
  },
);


export function getErrorMessage(error) {
  const data = error.response?.data;
  if (data?.details?.length) return data.details.map((d) => d.message).join('. '); // errores de zod
  if (data?.error) return data.error;
  if (!error.response) return 'No se pudo conectar con la API. ¿Está encendido el backend?';
  return 'Ocurrió un error inesperado';
}