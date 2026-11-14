// Conexión única de tiempo real con el backend (Socket.IO).
// El servidor avisa qué "temas" cambiaron (orders, products, screens…);
// cada pantalla decide si le interesa y vuelve a pedir sus datos por la API.
import { io } from 'socket.io-client';

const socket = io({ path: '/socket.io', autoConnect: true, reconnection: true });

const listeners = new Set();
socket.on('change', (event) => {
  listeners.forEach(({ topics, callback }) => {
    if (event.topics.some((t) => topics.includes(t))) callback(event);
  });
});

/** Escucha cambios de ciertos temas. Devuelve la función para dejar de escuchar. */
export function subscribe(topics, callback) {
  const entry = { topics, callback };
  listeners.add(entry);
  return () => listeners.delete(entry);
}

/** Escucha si hay conexión en vivo (true/false). */
export function onConnectionChange(callback) {
  const up = () => callback(true);
  const down = () => callback(false);
  socket.on('connect', up);
  socket.on('disconnect', down);
  callback(socket.connected);
  return () => {
    socket.off('connect', up);
    socket.off('disconnect', down);
  };
}
