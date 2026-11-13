import { useEffect, useState } from 'react';
import { fetchOrders } from '../services/orders.service.js';
import { getErrorMessage } from '../services/api.js';
import { ORDER_SOURCE, ORDER_STATUS } from '../utils/constants.js';
import { formatMoney, formatTime } from '../utils/format.js';
import styles from './OrdersPage.module.css';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetchOrders({ pageSize: 50 })
      .then((result) => {
        if (ignore) return;
        setOrders(result.data);
        setTotal(result.pagination.total);
        setError('');
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [reloadCount]);

  function reload() {
    setLoading(true);
    setReloadCount((n) => n + 1);
  }

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Pedidos</h1>
          <p className={styles.subtitle}>{total} pedidos en total · todos los canales</p>
        </div>
        <button className={styles.button} onClick={reload} disabled={loading}>
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </header>

      {error && <p className={styles.alert}>{error}</p>}

      {!loading && !error && orders.length === 0 && <p>Todavía no hay pedidos.</p>}

      {orders.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Canal</th>
                <th>Productos</th>
                <th className={styles.num}>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className={styles.strong}>#{order.orderNumber}</td>
                  <td>{formatTime(order.createdAt)}</td>
                  <td>{order.customer?.name ?? 'Mostrador'}</td>
                  <td>{ORDER_SOURCE[order.source]}</td>
                  <td className={styles.items}>{order.items.map((i) => `${i.quantity} ${i.productName}`).join(', ')}</td>
                  <td className={styles.num}>{formatMoney(order.total)}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function StatusBadge({ status }) {
  const { label, tone } = ORDER_STATUS[status] ?? { label: status, tone: 'neutral' };
  return (
    <span className={styles.badge} data-tone={tone}>
      {label}
    </span>
  );
}