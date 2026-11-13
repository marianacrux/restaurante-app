import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../services/api.js';

export default function StatusPage() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // Cada vez que este número cambia, el efecto vuelve a consultar la API
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let ignore = false; // si el componente desaparece antes de la respuesta, ignorarla

    api
      .get('/health')
      .then(({ data }) => {
        if (ignore) return;
        setHealth(data);
        setError('');
      })
      .catch((err) => {
        if (ignore) return;
        setHealth(null);
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    // Función de limpieza: React la ejecuta antes de repetir el efecto o al quitar el componente
    return () => {
      ignore = true;
    };
  }, [reloadCount]); // el efecto se repite cuando reloadCount cambia

  function reload() {
    setLoading(true);                  // en un clic sí se puede cambiar el estado directamente
    setReloadCount((n) => n + 1);      // y esto vuelve a disparar el efecto
  }

  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 520, margin: '40px auto', padding: 16 }}>
      <h1>Estado del sistema</h1>

      {loading && <p>Comprobando…</p>}

      {!loading && error && <p style={{ color: '#b91c1c' }}>❌ {error}</p>}

      {!loading && health && (
        <ul>
          <li>✅ API: respondiendo</li>
          <li>✅ Base de datos: {health.database} (usuario {health.user})</li>
          <li>Hora del servidor: {new Date(health.timestamp).toLocaleTimeString('es-CO')}</li>
        </ul>
      )}

      <button onClick={reload} disabled={loading}>
        {loading ? 'Comprobando…' : 'Volver a comprobar'}
      </button>
    </main>
  );
}