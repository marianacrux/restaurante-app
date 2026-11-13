import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../services/api.js';

export default function StatusPage() {
  // Estado: datos que, al cambiar, hacen que React vuelva a dibujar el componente
  const [health, setHealth] = useState(null);   // la respuesta de la API
  const [error, setError] = useState('');        // mensaje de error, si lo hay
  const [loading, setLoading] = useState(true);  // ¿está cargando?

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/health');
      setHealth(data);
    } catch (err) {
      setHealth(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Efecto: código que se ejecuta DESPUÉS de dibujar. Con [] se ejecuta solo al aparecer la página.
  useEffect(() => {
    load();
  }, []);

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

      <button onClick={load} disabled={loading}>
        {loading ? 'Comprobando…' : 'Volver a comprobar'}
      </button>
    </main>
  );
}