import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './auth-context.js';
import { setUnauthorizedHandler, TOKEN_KEY } from '../services/api.js';
import * as authService from '../services/auth.service.js';
import { storage } from '../utils/storage.js';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (storage.get(TOKEN_KEY) ? 'loading' : 'anonymous'));

  const logout = useCallback(() => {
    storage.remove(TOKEN_KEY);
    setUser(null);
    setStatus('anonymous');
  }, []);


  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);


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
        if (!ignore) logout(); 
      });
    return () => {
      ignore = true;
    };
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