import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getErrorMessage } from '../services/api.js';
import styles from './LoginPage.module.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') return <Navigate to="/inicio" replace />;

  async function handleSubmit(event) {
    event.preventDefault(); 
    
    const found = {};
    if (!EMAIL_RE.test(email.trim())) found.email = 'Ingrese un correo válido';
    if (!password) found.password = 'Ingrese la contraseña';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setServerError('');
    try {
      await login(email.trim(), password);
      navigate(location.state?.from ?? '/inicio', { replace: true }); 
    } catch (err) {
      setServerError(getErrorMessage(err)); 
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <h1 className={styles.title}>Gestión de pedidos</h1>
        <p className={styles.subtitle}>Inicie sesión para continuar</p>

        {serverError && <p className={styles.alert}>{serverError}</p>}

        <label className={styles.field}>
          Correo electrónico
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus />
          {errors.email && <span className={styles.error}>{errors.email}</span>}
        </label>

        <label className={styles.field}>
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          {errors.password && <span className={styles.error}>{errors.password}</span>}
        </label>

        <button className={styles.button} type="submit" disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}