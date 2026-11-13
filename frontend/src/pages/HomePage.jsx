import { useAuth } from '../hooks/useAuth.js';

const ROLE_LABEL = { ADMIN: 'Administrador', CAJERO: 'Cajero', COCINA: 'Cocina', DOMICILIARIO: 'Domiciliario' };

export default function HomePage() {
  const { user, logout } = useAuth();
  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 520, margin: '40px auto', padding: 16 }}>
      <h1>Hola, {user.name}</h1>
      <p>
        Iniciaste sesión como <strong>{ROLE_LABEL[user.role]}</strong> ({user.email}).
      </p>
      <button onClick={logout}>Cerrar sesión</button>
    </main>
  );
}