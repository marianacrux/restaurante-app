import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { ROLE_LABEL } from '../utils/constants.js';
import styles from './AppLayout.module.css';

const NAV_ITEMS = [
  { to: '/inicio', label: 'Inicio', roles: ['ADMIN', 'CAJERO', 'COCINA', 'DOMICILIARIO'] },
  { to: '/dashboard', label: 'Dashboard', roles: ['ADMIN', 'CAJERO'] },
  { to: '/pedidos', label: 'Pedidos', roles: ['ADMIN', 'CAJERO', 'COCINA'] },
  { to: '/cocina', label: 'Cocina', roles: ['ADMIN', 'CAJERO', 'COCINA'] },
  { to: '/domicilios', label: 'Domicilios', roles: ['ADMIN', 'CAJERO'] },
  { to: '/pagos', label: 'Pagos', roles: ['ADMIN', 'CAJERO'] },
  { to: '/mis-entregas', label: 'Mis entregas', roles: ['DOMICILIARIO'] },
  { to: '/whatsapp', label: 'Simulador WhatsApp', roles: ['ADMIN', 'CAJERO'] },
  { to: '/pantallas', label: 'Pantallas', roles: ['ADMIN'] },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Restaurante</div>

        <nav className={styles.nav}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.user}>
          <div>
            <div className={styles.userName}>{user.name}</div>
            <div className={styles.userRole}>{ROLE_LABEL[user.role]}</div>
          </div>
          <button className={styles.logout} onClick={logout}>
            Salir
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}