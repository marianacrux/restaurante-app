import { useEffect, useState } from 'react';
import { fetchOrders } from '../../services/orders.service.js';
import { fetchPayments, refundPayment, registerPayment } from '../../services/payments.service.js';
import { getErrorMessage } from '../../services/api.js';
import { useAuth } from '../../hooks/useAuth.js';
import Badge from '../../components/Badge.jsx';
import { ORDER_SOURCE, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from '../../utils/constants.js';
import { formatMoney, formatTime, todayLocal } from '../../utils/format.js';
import ui from '../../styles/ui.module.css';

// Todos los estados menos CANCELADO: un pedido cancelado no se cobra.
const BILLABLE = 'PENDIENTE,CONFIRMADO,EN_PREPARACION,LISTO,EN_CAMINO,ENTREGADO';

/** Lo ya pagado (pagos vigentes) y lo que falta. El backend envía los montos como texto. */
function balanceOf(order) {
  const paid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  return { paid, balance: Number(order.total) - paid };
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [day, setDay] = useState(todayLocal);
  const [data, setData] = useState(null); // { pending, payments }
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(null); // { orderId, orderNumber, method, amount, reference }
  const [busy, setBusy] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      fetchOrders({ paymentStatus: 'PENDIENTE,PARCIAL', status: BILLABLE, pageSize: 100 }),
      fetchPayments({ from: day, to: day, pageSize: 100 }),
    ])
      .then(([orders, payments]) => {
        if (ignore) return;
        setData({ pending: orders.data, payments });
        setError('');
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, [day, reloadCount]);

  function openForm(order) {
    const { balance } = balanceOf(order);
    setMessage('');
    setForm({
      orderId: order.id,
      orderNumber: order.orderNumber,
      method: order.paymentMethod ?? 'EFECTIVO', // lo que el cliente dijo que usaría
      amount: String(balance),
      reference: '',
    });
  }

  async function submitPayment(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await registerPayment({
        orderId: form.orderId,
        method: form.method,
        amount: Number(form.amount),
        reference: form.reference || null,
      });
      setMessage(`Pago de ${formatMoney(form.amount)} registrado en el pedido #${form.orderNumber}`);
      setForm(null);
      setReloadCount((n) => n + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function refund(payment) {
    const reason = window.prompt(`Motivo del reembolso de ${formatMoney(payment.amount)} (pedido #${payment.order.orderNumber}):`);
    if (!reason) return;
    setBusy(true);
    setError('');
    try {
      await refundPayment(payment.id, reason);
      setMessage(`Pago reembolsado (pedido #${payment.order.orderNumber})`);
      setReloadCount((n) => n + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className={ui.header}>
        <div>
          <h1 className={ui.title}>Pagos</h1>
          <p className={ui.subtitle}>Un pago se registra solo cuando el dinero se recibe</p>
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
          {/* ---------------- Formulario de cobro (arriba, para que se vea al pulsar "Cobrar") ---------------- */}
          {form && (
            <section className={`${ui.card} ${ui.section}`}>
              <h2 className={ui.cardTitle}>Registrar pago · pedido #{form.orderNumber}</h2>
              <form className={ui.row} style={{ alignItems: 'flex-end' }} onSubmit={submitPayment}>
                <label className={ui.field}>
                  Método
                  <select
                    className={ui.input}
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value })}
                  >
                    {Object.entries(PAYMENT_METHOD).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={ui.field}>
                  Monto
                  <input
                    className={ui.input}
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </label>
                <label className={ui.field}>
                  Referencia (opcional)
                  <input
                    className={ui.input}
                    placeholder="N.º de transacción"
                    maxLength={100}
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  />
                </label>
                <button className={`${ui.button} ${ui.primary}`} disabled={busy}>
                  {busy ? 'Guardando…' : 'Registrar pago'}
                </button>
                <button type="button" className={ui.button} onClick={() => setForm(null)}>
                  Cancelar
                </button>
              </form>
            </section>
          )}

          {/* ---------------- Por cobrar ---------------- */}
          <section className={ui.section}>
            <h2 className={ui.sectionTitle}>Por cobrar ({data.pending.length})</h2>
            {data.pending.length === 0 ? (
              <p className={ui.empty}>No hay pedidos con saldo pendiente.</p>
            ) : (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Cliente</th>
                      <th>Canal</th>
                      <th>Estado</th>
                      <th className={ui.num}>Total</th>
                      <th className={ui.num}>Pagado</th>
                      <th className={ui.num}>Saldo</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.pending.map((order) => {
                      const { paid, balance } = balanceOf(order);
                      return (
                        <tr key={order.id}>
                          <td className={ui.strong}>#{order.orderNumber}</td>
                          <td>{order.customer?.name ?? 'Mostrador'}</td>
                          <td>{ORDER_SOURCE[order.source]}</td>
                          <td>
                            <Badge info={ORDER_STATUS[order.status]} />
                          </td>
                          <td className={ui.num}>{formatMoney(order.total)}</td>
                          <td className={ui.num}>{formatMoney(paid)}</td>
                          <td className={`${ui.num} ${ui.strong}`}>{formatMoney(balance)}</td>
                          <td>
                            <button className={`${ui.button} ${ui.small} ${ui.primary}`} onClick={() => openForm(order)}>
                              Cobrar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ---------------- Pagos del día ---------------- */}
          <section className={ui.section}>
            <div className={ui.header} style={{ marginBottom: 12 }}>
              <h2 className={ui.sectionTitle} style={{ margin: 0 }}>
                Pagos registrados · recibido {formatMoney(data.payments.summary.collected)}
              </h2>
              <input
                type="date"
                className={ui.input}
                value={day}
                max={todayLocal()}
                onChange={(e) => e.target.value && setDay(e.target.value)}
                aria-label="Día de los pagos"
              />
            </div>
            {data.payments.data.length === 0 ? (
              <p className={ui.empty}>No hay pagos registrados ese día.</p>
            ) : (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Pedido</th>
                      <th>Método</th>
                      <th>Referencia</th>
                      <th className={ui.num}>Monto</th>
                      <th>Estado</th>
                      <th>Registró</th>
                      {user.role === 'ADMIN' && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.data.map((p) => (
                      <tr key={p.id}>
                        <td>{formatTime(p.createdAt)}</td>
                        <td className={ui.strong}>#{p.order.orderNumber}</td>
                        <td>{PAYMENT_METHOD[p.method]}</td>
                        <td>{p.reference ?? '—'}</td>
                        <td className={ui.num}>{formatMoney(p.amount)}</td>
                        <td>
                          <Badge info={PAYMENT_STATUS[p.status]} />
                        </td>
                        <td>{p.recordedBy.name}</td>
                        {user.role === 'ADMIN' && (
                          <td>
                            {p.status === 'PAGADO' && (
                              <button className={`${ui.button} ${ui.small} ${ui.danger}`} disabled={busy} onClick={() => refund(p)}>
                                Reembolsar
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
