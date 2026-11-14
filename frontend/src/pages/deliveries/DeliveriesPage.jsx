import { useEffect, useState } from 'react';
import { fetchOrders } from '../../services/orders.service.js';
import {
  assignDelivery,
  completeDelivery,
  fetchDeliveries,
  fetchDeliveryPersons,
  setCourierAvailability,
} from '../../services/deliveries.service.js';
import { getErrorMessage } from '../../services/api.js';
import Badge from '../../components/Badge.jsx';
import { COURIER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, TRANSPORT_TYPE } from '../../utils/constants.js';
import { formatMoney, formatTime } from '../../utils/format.js';
import ui from '../../styles/ui.module.css';

const REFRESH_MS = 15000; // la cocina marca pedidos LISTOS en cualquier momento

export default function DeliveriesPage() {
  const [data, setData] = useState(null); // { ready, onTheWay, couriers }
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState({}); // { [orderId]: deliveryPersonId }
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    function load() {
      Promise.all([
        fetchOrders({ status: 'LISTO', type: 'DOMICILIO', pageSize: 50 }),
        fetchDeliveries({ status: 'ASIGNADO,EN_CAMINO' }),
        fetchDeliveryPersons(),
      ])
        .then(([orders, deliveries, couriers]) => {
          if (ignore) return;
          setData({ ready: orders.data, onTheWay: deliveries, couriers });
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

  /** Ejecuta una acción, muestra el resultado y recarga los datos. */
  async function run(action, successText) {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await action();
      setMessage(successText);
      setReloadCount((n) => n + 1);
    } catch (err) {
      setError(getErrorMessage(err));
      setReloadCount((n) => n + 1); // los datos pudieron cambiar (otro cajero, otra pestaña)
    } finally {
      setBusy(false);
    }
  }

  const available = data?.couriers.filter((c) => c.availability === 'DISPONIBLE') ?? [];

  return (
    <>
      <header className={ui.header}>
        <div>
          <h1 className={ui.title}>Domicilios</h1>
          <p className={ui.subtitle}>Despacho de pedidos listos · se actualiza cada 15 s</p>
        </div>
        <button className={ui.button} onClick={() => setReloadCount((n) => n + 1)} disabled={busy}>
          Actualizar
        </button>
      </header>

      {error && <p className={ui.alert}>{error}</p>}
      {message && <p className={ui.success}>{message}</p>}
      {!data && !error && <p>Cargando…</p>}

      {data && (
        <>
          {/* ---------------- Listos para despachar ---------------- */}
          <section className={ui.section}>
            <h2 className={ui.sectionTitle}>Listos para despachar ({data.ready.length})</h2>
            {data.ready.length === 0 ? (
              <p className={ui.empty}>No hay pedidos a domicilio listos.</p>
            ) : (
              <div className={ui.grid}>
                {data.ready.map((order) => (
                  <article key={order.id} className={ui.card}>
                    <div className={ui.row} style={{ justifyContent: 'space-between' }}>
                      <strong>#{order.orderNumber}</strong>
                      <Badge info={PAYMENT_STATUS[order.paymentStatus]} />
                    </div>
                    <p style={{ margin: '8px 0 4px' }}>
                      {order.customer?.name} · {order.customer?.phone}
                    </p>
                    <p className={ui.muted} style={{ margin: '0 0 8px' }}>📍 {order.deliveryAddress}</p>
                    <p className={ui.muted} style={{ margin: '0 0 8px' }}>
                      {order.items.map((i) => `${i.quantity} ${i.productName}`).join(', ')}
                    </p>
                    <p style={{ margin: '0 0 12px' }}>
                      <strong>{formatMoney(order.total)}</strong>
                      {order.paymentMethod && <span className={ui.muted}> · {PAYMENT_METHOD[order.paymentMethod]}</span>}
                    </p>
                    <div className={ui.row}>
                      <select
                        className={ui.input}
                        style={{ flex: 1 }}
                        value={selected[order.id] ?? ''}
                        onChange={(e) => setSelected((s) => ({ ...s, [order.id]: e.target.value }))}
                        aria-label={`Domiciliario para el pedido ${order.orderNumber}`}
                      >
                        <option value="">{available.length ? 'Elegir domiciliario…' : 'Nadie disponible'}</option>
                        {available.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({TRANSPORT_TYPE[c.transportType]})
                          </option>
                        ))}
                      </select>
                      <button
                        className={`${ui.button} ${ui.primary}`}
                        disabled={busy || !selected[order.id]}
                        onClick={() =>
                          run(
                            () => assignDelivery(order.id, Number(selected[order.id])),
                            `Pedido #${order.orderNumber} despachado`,
                          )
                        }
                      >
                        Despachar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* ---------------- En camino ---------------- */}
          <section className={ui.section}>
            <h2 className={ui.sectionTitle}>En camino ({data.onTheWay.length})</h2>
            {data.onTheWay.length === 0 ? (
              <p className={ui.empty}>No hay entregas en curso.</p>
            ) : (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Domiciliario</th>
                      <th>Salió</th>
                      <th>Dirección</th>
                      <th className={ui.num}>Total</th>
                      <th>Pago</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.onTheWay.map((d) => (
                      <tr key={d.id}>
                        <td className={ui.strong}>#{d.order.orderNumber}</td>
                        <td>{d.deliveryPerson.name}</td>
                        <td>{formatTime(d.assignedAt)}</td>
                        <td>{d.order.deliveryAddress}</td>
                        <td className={ui.num}>{formatMoney(d.order.total)}</td>
                        <td>
                          <Badge info={PAYMENT_STATUS[d.order.paymentStatus]} />
                        </td>
                        <td>
                          <button
                            className={`${ui.button} ${ui.small}`}
                            disabled={busy}
                            onClick={() => run(() => completeDelivery(d.id), `Pedido #${d.order.orderNumber} entregado`)}
                          >
                            Confirmar entrega
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ---------------- Domiciliarios ---------------- */}
          <section className={ui.section}>
            <h2 className={ui.sectionTitle}>Domiciliarios</h2>
            <div className={ui.grid}>
              {data.couriers.map((c) => (
                <article key={c.id} className={ui.card}>
                  <div className={ui.row} style={{ justifyContent: 'space-between' }}>
                    <strong>{c.name}</strong>
                    <Badge info={COURIER_STATUS[c.availability]} />
                  </div>
                  <p className={ui.muted} style={{ margin: '6px 0 10px' }}>
                    {TRANSPORT_TYPE[c.transportType]} · {c.phone} · {c.deliveredToday} entregas hoy
                    {c.activeDelivery && <> · lleva el #{c.activeDelivery.order.orderNumber}</>}
                  </p>
                  {c.availability !== 'OCUPADO' && (
                    <button
                      className={`${ui.button} ${ui.small}`}
                      disabled={busy}
                      onClick={() => {
                        const next = c.availability === 'DISPONIBLE' ? 'INACTIVO' : 'DISPONIBLE';
                        run(
                          () => setCourierAvailability(c.id, next),
                          `${c.name}: ${COURIER_STATUS[next].label.toLowerCase()}`,
                        );
                      }}
                    >
                      {c.availability === 'DISPONIBLE' ? 'Enviar a descanso' : 'Marcar disponible'}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
