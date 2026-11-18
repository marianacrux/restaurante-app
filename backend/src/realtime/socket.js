// TIEMPO REAL con Socket.IO.
// El servidor solo avisa QUÉ cambió ("orders", "products", "screens"…), nunca envía datos
// privados: cada pantalla, al recibir el aviso, vuelve a pedir sus datos por la API REST
// (con su token y sus permisos). Así las pantallas públicas pueden escuchar sin riesgo.
import { Server } from 'socket.io';

let io = null;

export function initSocket(httpServer) {
  // En producción el frontend (Vercel) y el backend (Render) están en dominios distintos:
  // FRONTEND_URL indica qué dominios pueden conectarse (separados por comas).
  // En desarrollo no hace falta: Vite reenvía /socket.io desde el mismo origen.
  const origins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  io = new Server(httpServer, { path: '/socket.io', cors: { origin: origins.length ? origins : false } });
  io.on('connection', (socket) => {
    socket.emit('hello', { at: new Date().toISOString() });
  });
  return io;
}

/** Avisa a todos los clientes conectados que cambiaron estos temas. */
export function emitChange(topics, detail = {}) {
  if (!io || topics.length === 0) return;
  io.emit('change', { topics, ...detail, at: new Date().toISOString() });
}

// Qué temas cambian según la ruta que se modificó (POST/PUT/PATCH/DELETE exitosos).
const TOPICS_BY_PREFIX = [
  ['/api/orders', ['orders', 'dashboard', 'payments', 'deliveries']],
  ['/api/deliveries', ['deliveries', 'orders', 'couriers', 'dashboard']],
  ['/api/delivery-persons', ['couriers', 'deliveries']],
  ['/api/payments', ['payments', 'orders', 'dashboard']],
  ['/api/products', ['products', 'screens']],
  ['/api/categories', ['products', 'screens']],
  ['/api/promotions', ['promotions', 'screens']],
  ['/api/screens', ['screens']],
  ['/api/settings', ['settings', 'screens']],
  ['/api/users', ['users']],
  ['/api/reports', ['reports']],
  ['/api/whatsapp-simulator/message', ['orders', 'dashboard']],
  ['/api/whatsapp-simulator/confirm', ['orders', 'dashboard']],
];

/**
 * Middleware: cuando una petición que MODIFICA datos termina bien,
 * emite el aviso correspondiente. Un solo lugar para todos los módulos.
 */
export function realtimeNotifier(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const match = TOPICS_BY_PREFIX.find(([prefix]) => req.originalUrl.startsWith(prefix));
    if (match) emitChange(match[1], { source: req.originalUrl.split('?')[0] });
  });
  next();
}
