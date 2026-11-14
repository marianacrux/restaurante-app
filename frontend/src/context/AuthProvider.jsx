import { useCallback, useEffect, useMemo, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { AuthContext } from './auth-context.js';
import { setUnauthorizedHandler, TOKEN_KEY } from '../services/api.js';
import * as authService from '../services/auth.service.js';
import { storage } from '../utils/storage.js';

/** Fecha de vencimiento (ms) que viene dentro del JWT, o null si no se puede leer. */
function tokenExpiresAt(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

const MAX_TIMER_MS = 2 ** 31 - 1; // límite de setTimeout (~24 días)

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (storage.get(TOKEN_KEY) ? 'loading' : 'anonymous'));

  /** reason: 'manual' (botón Salir) o 'expired' (token vencido o rechazado por la API). */
  const logout = useCallback((reason = 'manual') => {
    const hadSession = Boolean(storage.get(TOKEN_KEY));
    storage.remove(TOKEN_KEY);
    setUser(null);
    setStatus('anonymous');
    if (reason === 'expired' && hadSession) {
      notifications.show({
        id: 'session-expired', // evita avisos repetidos si fallan varias peticiones a la vez
        color: 'yellow',
        title: 'Tu sesión terminó',
        message: 'Por seguridad, vuelve a iniciar sesión para continuar.',
      });
    }
  }, []);

  // Si la API responde 401 en cualquier pantalla, se cierra la sesión.
  useEffect(() => {
    setUnauthorizedHandler(() => logout('expired'));
  }, [logout]);

  // Al abrir la app con un token guardado: se confirma con el backend quién es.
  useEffect(() => {
    if (status !== 'loading') return undefined;
    let ignore = false;
    authService
      .fetchMe()
      .then((me) => {
        if (ignore) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!ignore) logout('expired');
      });
    return () => {
      ignore = true;
    };
  }, [status, logout]);

  // Cierre automático cuando el token vence (aunque la persona no haga nada).
  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    const expiresAt = tokenExpiresAt(storage.get(TOKEN_KEY) ?? '');
    if (!expiresAt) return undefined;
    const timer = setTimeout(() => logout('expired'), Math.min(Math.max(0, expiresAt - Date.now()), MAX_TIMER_MS));
    return () => clearTimeout(timer);
  }, [status, logout]);

  const login = useCallback(async (email, password) => {
    const { token, user: loggedUser } = await authService.login(email, password);
    storage.set(TOKEN_KEY, token);
    setUser(loggedUser);
    setStatus('authenticated');
    return loggedUser;
  }, []);

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
