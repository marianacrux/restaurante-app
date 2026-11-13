import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSalesByDay, fetchSummary } from '../../services/dashboard.service.js';
import { getErrorMessage } from '../../services/api.js';
import StatCard from '../../components/StatCard.jsx';
import { BarList, ColumnChart } from '../../components/Charts.jsx';
import { ORDER_SOURCE, ORDER_STATUS } from '../../utils/constants.js';
import { formatMoney, formatShortDay, formatTime, todayLocal } from '../../utils/format.js';
import styles from './DashboardPage.module.css';

const REFRESH_MS = 30000; // se actualiza solo cada 30 segundos

export default function DashboardPage() {
  const [day, setDay] = useState(todayLocal);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    function load() {
      Promise.all([fetchSummary(day), fetchSalesByDay({ to: day })])
        .then(([summary, sales]) => {
          if (ignore) return;
          setData({ summary, sales });
          setError('');
          setLastUpdated(new Date());
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
  }, [day, reloadCount]);

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            {lastUpdated ? `Actualizado ${formatTime(lastUpdated.toISOString())} · se refresca cada 30 s` : 'Cargando…'}
          </p>
        </div>
        <div className={styles.tools}>
          <input
            type="date"
            className={styles.date}
            value={day}
            max={todayLocal()}
            onChange={(e) => e.target.value && setDay(e.target.value)}
            aria-label="Día del resumen"
          />
          <button className={styles.button} onClick={() => setReloadCount((n) => n + 1)}>
            Actualizar
          </button>
        </div>
      </header>

      {error && <p className={styles.alert}>{error}</p>}
      {data && <DashboardContent summary={data.summary} sales={data.sales} />}
    </>
  );
}

function DashboardContent({ summary, sales }) {
  const { byStatus } = summary.orders;
  const valid = summary.orders.total - byStatus.CANCELADO;

  return (
    <div className={styles.grid}>
      <div className={styles.kpis}>
        <StatCard label="Ventas del día" value={formatMoney(summary.sales.total)} hint={`${valid} pedidos · sin cancelados`} />
        <StatCard label="Ventas completadas" value={formatMoney(summary.sales.delivered)} hint={`${byStatus.ENTREGADO} entregados`} />
        <StatCard label="Ticket promedio" value={formatMoney(summary.sales.averageTicket)} hint="Por pedido válido" />
        <StatCard
          label="Pagos pendientes"
          value={summary.pendingPayments.orders}
          hint={`${formatMoney(summary.pendingPayments.amount)} por cobrar`}
        />
      </div>

      <section className={`${styles.card} ${styles.full}`}>
        <h2 className={styles.cardTitle}>Pedidos por estado</h2>
        <div className={styles.pipeline}>
          {Object.entries(ORDER_STATUS).map(([status, { label, tone }]) => (
            <Link key={status} to="/pedidos" className={styles.step} data-tone={tone}>
              <span className={styles.stepCount}>{byStatus[status]}</span>
              <span className={styles.stepLabel}>{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Ventas por canal</h2>
        <BarList
          emptyText="Aún no hay ventas en este día"
          rows={summary.bySource.map((s) => ({
            key: s.source,
            label: ORDER_SOURCE[s.source],
            value: Number(s.total),
            display: formatMoney(s.total),
            hint: `${s.orders} ${s.orders === 1 ? 'pedido' : 'pedidos'}`,
          }))}
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Ventas de los últimos 7 días</h2>
        <ColumnChart
          points={sales.map((d) => ({
            key: d.day,
            label: formatShortDay(d.day),
            value: Number(d.total),
            display: `${formatMoney(d.total)} · ${d.orders} pedidos`,
          }))}
        />
      </section>
    </div>
  );
}