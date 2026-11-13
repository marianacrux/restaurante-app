import { useAuth } from '../hooks/useAuth.js';
import { ROLE_LABEL } from '../utils/constants.js';

export default function HomePage() {
  const { user } = useAuth();
  return (
    <>
      <h1>Hola, {user.name}</h1>
      <p>
        Iniciaste sesión como <strong>{ROLE_LABEL[user.role]}</strong>. Usa el menú de la izquierda para moverte por el
        sistema.
      </p>
    </>
  );
}