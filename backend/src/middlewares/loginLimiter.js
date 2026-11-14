// Protección contra adivinar contraseñas: después de MAX_FAILS intentos fallidos
// con el mismo correo desde la misma IP, el login se bloquea BLOCK_MS.
// Se guarda en memoria (suficiente para un solo servidor; con varios se usaría Redis).
import { AppError } from '../utils/AppError.js';

const MAX_FAILS = 5;
const BLOCK_MS = 15 * 60 * 1000; // 15 minutos

const attempts = new Map(); // "ip|correo" → { fails, firstFailAt, blockedUntil }

const keyOf = (req) => `${req.ip}|${String(req.body?.email ?? '').trim().toLowerCase()}`;

/** Middleware: rechaza con 429 si esa combinación está bloqueada. */
export function loginLimiter(req, res, next) {
  const entry = attempts.get(keyOf(req));
  if (entry?.blockedUntil > Date.now()) {
    const minutes = Math.ceil((entry.blockedUntil - Date.now()) / 60000);
    throw AppError.tooManyRequests(`Demasiados intentos fallidos. Intente de nuevo en ${minutes} min.`);
  }
  next();
}

/** Registra un intento fallido. Devuelve cuántos intentos quedan antes del bloqueo. */
export function registerLoginFailure(req) {
  const key = keyOf(req);
  const now = Date.now();
  const entry = attempts.get(key);
  // Los fallos "viejos" (de hace más de BLOCK_MS) no cuentan
  const current = entry && now - entry.firstFailAt < BLOCK_MS ? entry : { fails: 0, firstFailAt: now, blockedUntil: 0 };
  current.fails += 1;
  if (current.fails >= MAX_FAILS) current.blockedUntil = now + BLOCK_MS;
  attempts.set(key, current);
  return Math.max(0, MAX_FAILS - current.fails);
}

/** Un login correcto borra el historial de fallos. */
export function clearLoginFailures(req) {
  attempts.delete(keyOf(req));
}

// Limpieza periódica para que el Map no crezca sin límite
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (entry.blockedUntil < now && now - entry.firstFailAt > BLOCK_MS) attempts.delete(key);
  }
}, BLOCK_MS).unref();
