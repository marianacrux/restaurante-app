import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../services/api.js';

/**
 * Carga datos de la API y, si se indica, los refresca cada `interval` ms.
 * `fetcher` debe estar envuelto en useCallback (cuando cambia, se vuelve a cargar).
 *
 *   const load = useCallback(() => fetchSummary(day), [day]);
 *   const { data, error, loading, reload } = useApi(load, { interval: 30000 });
 */
export function useApi(fetcher, { interval } = {}) {
  const [state, setState] = useState({ data: null, error: '', updatedAt: null });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let ignore = false;

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
    return () => {
      ignore = true;
      if (timer) clearInterval(timer);
    };
  }, [fetcher, interval, reloadCount]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  return { ...state, loading: state.data === null && !state.error, reload };
}
