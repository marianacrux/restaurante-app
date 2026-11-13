import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useSpeechAnnouncer } from '../../hooks/useSpeechAnnouncer.js';
import { changeOrderStatus, fetchOrders } from '../../services/orders.service.js';
import { getErrorMessage } from '../../services/api.js';
import { ORDER_SOURCE } from '../../utils/constants.js';
import { formatTime } from '../../utils/format.js';
import { buildAnnouncement } from './announcement.js';
import styles from './KitchenPage.module.css';

const POLL_MS = 5000; // cada 5 segundos se consulta la API (en la etapa 2: Socket.IO)
const HIGHLIGHT_MS = 20000; // cuánto tiempo se resalta un pedido nuevo

const COLUMNS = [
  { status: 'CONFIRMADO', title: 'Por preparar', action: 'EN_PREPARACION', actionLabel: 'Iniciar preparación' },
  { status: 'EN_PREPARACION', title: 'En preparación', action: 'LISTO', actionLabel: 'Marcar listo' },
  { status: 'LISTO', title: 'Listos' },
];

export default function KitchenPage() {
  const { user, logout } = useAuth();
  const { supported, enabled, muted, speaking, announce, enable, toggleMute, repeatLast } = useSpeechAnnouncer();

  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [highlighted, setHighlighted] = useState(() => new Set());
  const [banner, setBanner] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);
  const now = useNow(30000);
  const seenRef = useRef(null); // ids de pedidos ya vistos (null = aún no hubo primera carga)

  useEffect(() => {
    let ignore = false;

    function load() {
      fetchOrders({ status: COLUMNS.map((c) => c.status).join(','), pageSize: 100 })
        .then((result) => {
          if (ignore) return;
          setOrders(result.data);
          setError('');
          setLastUpdated(new Date());

          // Primera carga: solo se registran los pedidos que ya estaban (no se anuncian)
          if (seenRef.current === null) {
            seenRef.current = new Set(result.data.map((o) => o.id));
            return;
          }
          // Cargas siguientes: cada pedido CONFIRMADO que no habíamos visto es nuevo
          const fresh = result.data.filter((o) => o.status === 'CONFIRMADO' && !seenRef.current.has(o.id));
          result.data.forEach((o) => seenRef.current.add(o.id));
          if (fresh.length === 0) return;

          fresh.sort((a, b) => a.orderNumber - b.orderNumber).forEach((o) => announce(buildAnnouncement(o)));
          const ids = fresh.map((o) => o.id);
          setHighlighted((prev) => new Set([...prev, ...ids]));
          setBanner(fresh.length === 1 ? `Nuevo pedido #${fresh[0].orderNumber}` : `${fresh.length} pedidos nuevos`);
          setTimeout(() => {
            setHighlighted((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
            setBanner('');
          }, HIGHLIGHT_MS);
        })
        .catch((err) => {
          if (!ignore) setError(getErrorMessage(err));
        });
    }

    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [reloadCount, announce]);

  async function advance(order, status) {
    setBusyId(order.id);
    try {
      await changeOrderStatus(order.id, { status });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
      setReloadCount((n) => n + 1); // recargar enseguida, sin esperar los 5 s
    }
  }

  const byStatus = (status) =>
    (orders ?? []).filter((o) => o.status === status).sort((a, b) => a.orderNumber - b.orderNumber);

  function repeat() {
    const latest = byStatus('CONFIRMADO').at(-1) ?? byStatus('EN_PREPARACION').at(-1);
    repeatLast(latest ? buildAnnouncement(latest, { isNew: false }) : 'No hay pedidos pendientes en cocina');
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Cocina</h1>
          <span className={styles.clock}>{formatTime(new Date(now).toISOString())}</span>
          <span className={error ? styles.offline : styles.online}>
            {error ? `Sin conexión · ${error}` : lastUpdated ? `En línea · ${formatTime(lastUpdated.toISOString())}` : 'Conectando…'}
          </span>
        </div>
        <div className={styles.controls}>
          {enabled && (
            <>
              <button className={styles.ctrl} onClick={toggleMute}>
                {muted ? '🔇 Silenciado' : speaking ? '🔊 Anunciando…' : '🔊 Audio activo'}
              </button>
              <button className={styles.ctrl} onClick={repeat} disabled={muted}>
                ↻ Repetir último
              </button>
            </>
          )}
          {user.role === 'COCINA' ? (
            <button className={styles.ctrl} onClick={logout}>
              Salir
            </button>
          ) : (
            <Link className={styles.ctrl} to="/pedidos">
              ← Volver
            </Link>
          )}
        </div>
      </header>

      {supported && !enabled && (
        <button className={styles.enableAudio} onClick={enable}>
          🔈 Toque aquí para activar los anuncios de voz
        </button>
      )}
      {!supported && <p className={styles.warning}>Este navegador no soporta anuncios de voz. Los avisos visuales siguen activos.</p>}

      {banner && (
        <div className={styles.banner} role="alert">
          🔔 {banner}
        </div>
      )}

      <main className={styles.board}>
        {COLUMNS.map((col) => {
          const list = byStatus(col.status);
          return (
            <section key={col.status} className={styles.column} data-status={col.status}>
              <h2 className={styles.columnTitle}>
                {col.title} <span className={styles.count}>{list.length}</span>
              </h2>
              {list.length === 0 && <p className={styles.empty}>Sin pedidos</p>}
              {list.map((order) => (
                <article key={order.id} className={highlighted.has(order.id) ? `${styles.card} ${styles.cardNew}` : styles.card}>
                  <header className={styles.cardHeader}>
                    <span className={styles.number}>#{order.orderNumber}</span>
                    <span className={styles.minutes}>{Math.max(0, Math.floor((now - new Date(order.createdAt)) / 60000))} min</span>
                  </header>
                  <div className={styles.tags}>
                    {ORDER_SOURCE[order.source]}
                    {order.type === 'DOMICILIO' && ' · Domicilio'}
                    {order.type === 'PARA_LLEVAR' && ' · Para llevar'}
                    {order.customer && ` · ${order.customer.name}`}
                  </div>
                  <ul className={styles.items}>
                    {order.items.map((item, index) => (
                      <li key={index}>
                        <strong>{item.quantity}×</strong> {item.productName}
                        {item.notes && <span className={styles.note}>⚠ {item.notes}</span>}
                      </li>
                    ))}
                  </ul>
                  {col.action && order.availableStatuses.includes(col.action) && (
                    <button className={styles.action} onClick={() => advance(order, col.action)} disabled={busyId === order.id}>
                      {busyId === order.id ? 'Guardando…' : col.actionLabel}
                    </button>
                  )}
                  {order.status === 'LISTO' && (
                    <p className={styles.waiting}>{order.type === 'DOMICILIO' ? 'Esperando domiciliario' : 'Esperando entrega'}</p>
                  )}
                </article>
              ))}
            </section>
          );
        })}
      </main>
    </div>
  );
}

/** Hora actual que se actualiza cada `interval` ms (para los minutos de espera). */
function useNow(interval) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
}