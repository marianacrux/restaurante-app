import { useEffect, useState } from 'react';
import { completeDelivery, fetchDeliveries } from '../../services/deliveries.service.js';
import { getErrorMessage } from '../../services/api.js';
import Badge from '../../components/Badge.jsx';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../../utils/constants.js';
import { formatMoney, formatTime } from '../../utils/format.js';
import ui from '../../styles/ui.module.css';

const REFRESH_MS = 15000;

// Pantalla del domiciliario (pensada para el celular).
// El backend solo le devuelve SUS entregas, así que aquí no se filtra nada.
export default function MyDeliveriesPage() {
  const [deliveries, setDeliveries] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    function load() {
      fetchDeliveries()
        .then((data) => {
          if (ignore) return;
          setDeliveries(data);
          setError('');
        })
        .catch((err) => {
          if (!ignore) setError(getErrorMessage(err));
        });
    }

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [reloadCount]);

  async function confirm(delivery) {
    if (!window.confirm(`¿Confirmas que entregaste el pedido #${delivery.order.orderNumber}?`)) return;
    setBusyId(delivery.id);
    setMessage('');
    try {
      await completeDelivery(delivery.id);
      setMessage(`Pedido #${delivery.order.orderNumber} entregado. ¡Buen trabajo!`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
      setReloadCount((n) => n + 1);
    }
  }

  const active = deliveries?.filter((d) => d.status === 'ASIGNADO' || d.status === 'EN_CAMINO') ?? [];
  const done = deliveries?.filter((d) => d.status === 'ENTREGADO').slice(0, 10) ?? [];

  return (
    <>
      <header className={ui.header}>
        <div>
          <h1 className={ui.title}>Mis entregas</h1>
          <p className={ui.subtitle}>Se actualiza cada 15 s</p>
        </div>
      </header>

      {error && <p className={ui.alert}>{error}</p>}
      {message && <p className={ui.success}>{message}</p>}
      {!deliveries && !error && <p>Cargando…</p>}

      {deliveries && (
        <>
          <section className={ui.section}>
            <h2 className={ui.sectionTitle}>Por entregar ({active.length})</h2>
            {active.length === 0 ? (
              <p className={ui.empty}>No tienes entregas pendientes.</p>
            ) : (
              <div className={ui.grid}>
                {active.map((d) => (
                  <article key={d.id} className={ui.card}>
                    <div className={ui.row} style={{ justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '1.2rem' }}>#{d.order.orderNumber}</strong>
                      <span className={ui.muted}>Salió {formatTime(d.assignedAt)}</span>
                    </div>
                    <p style={{ margin: '10px 0 4px', fontSize: '1.05rem' }}>📍 {d.order.deliveryAddress}</p>
                    <p style={{ margin: '0 0 8px' }}>
                      {d.order.customer?.name} ·{' '}
                      <a href={`tel:${d.order.customer?.phone}`}>{d.order.customer?.phone}</a>
                    </p>
                    <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
                      {d.order.items.map((i) => (
                        <li key={i.id}>
                          {i.quantity} × {i.productName}
                          {i.notes && <em className={ui.muted}> ({i.notes})</em>}
                        </li>
                      ))}
                    </ul>
                    {d.order.notes && <p className={ui.info}>Nota: {d.order.notes}</p>}
                    <div className={ui.row} style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                      <span>
                        {d.order.paymentStatus === 'PAGADO' ? 'Ya pagado' : 'Cobrar'}: <strong>{formatMoney(d.order.total)}</strong>
                        {d.order.paymentMethod && <span className={ui.muted}> · {PAYMENT_METHOD[d.order.paymentMethod]}</span>}
                      </span>
                      <Badge info={PAYMENT_STATUS[d.order.paymentStatus]} />
                    </div>
                    <button
                      className={`${ui.button} ${ui.primary}`}
                      style={{ width: '100%', padding: 12 }}
                      disabled={busyId === d.id}
                      onClick={() => confirm(d)}
                    >
                      {busyId === d.id ? 'Confirmando…' : 'Confirmar entrega'}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          {done.length > 0 && (
            <section className={ui.section}>
              <h2 className={ui.sectionTitle}>Últimas entregadas</h2>
              <ul className={ui.card} style={{ margin: 0, paddingLeft: 32 }}>
                {done.map((d) => (
                  <li key={d.id}>
                    #{d.order.orderNumber} · {d.order.deliveryAddress} · {formatTime(d.deliveredAt)}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
