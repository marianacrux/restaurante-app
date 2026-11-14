import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../services/api.js';
import { subscribe } from '../services/socket.js';

/**
 * Carga datos de la API y los mantiene al día:
 * - `topics`: se recarga EN EL MOMENTO en que el backend avisa por Socket.IO que ese tema cambió.
 * - `interval`: respaldo por si se pierde la conexión en vivo (recarga cada N ms).
 * `fetcher` debe ser estable (función fuera del componente o envuelta en useCallback).
 *
 *   const load = useCallback(() => fetchSummary(day), [day]);
 *   const { data, error, loading, reload } = useApi(load, { topics: ['orders'], interval: 60000 });
 */
export function useApi(fetcher, { interval, topics } = {}) {
  const [state, setState] = useState({ data: null, error: '', updatedAt: null });
  const [reloadCount, setReloadCount] = useState(0);
  const topicsKey = topics?.join(',') ?? '';

  useEffect(() => {
    let ignore = false;
    let pending = null;

    function load() {
      fetcher()
        .then((data) => {
          if (!ignore) setState({ data, error: '', updatedAt: new Date() });
        })
        .catch((err) => {
          // Se conserva lo último que llegó: la pantalla no queda en blanco si falla la red.
          if (!ignore) setState((s) => ({ ...s, error: getErrorMessage(err) }));
        });
    }

    load();
    const timer = interval ? setInterval(load, interval) : null;
    // Varios avisos seguidos (p. ej. al despachar) se agrupan en una sola recarga
    const unsubscribe = topicsKey
      ? subscribe(topicsKey.split(','), () => {
          clearTimeout(pending);
          pending = setTimeout(load, 250);
        })
      : null;

    return () => {
      ignore = true;
      if (timer) clearInterval(timer);
      clearTimeout(pending);
      unsubscribe?.();
    };
  }, [fetcher, interval, topicsKey, reloadCount]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  return { ...state, loading: state.data === null && !state.error, reload };
}
