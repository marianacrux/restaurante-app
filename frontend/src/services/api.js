import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',  
  timeout: 10000,  
});

export function getErrorMessage(error) {
  if (error.response?.data?.error) return error.response.data.error; 
  if (!error.response) return 'No se pudo conectar con la API. ¿Está encendido el backend?';
  return 'Ocurrió un error inesperado';
}