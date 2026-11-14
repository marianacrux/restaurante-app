import { useCallback, useState } from 'react';
import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconCash, IconClockDollar, IconReceiptRefund, IconRefresh } from '@tabler/icons-react';
import { fetchOrders } from '../../services/orders.service.js';
import { fetchPayments, refundPayment, registerPayment } from '../../services/payments.service.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.js';
import { can } from '../../auth/access.js';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { notifyError, notifySuccess } from '../../utils/notify.js';
import { ORDER_SOURCE, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, toOptions } from '../../utils/constants.js';
import { formatMoney, formatTime, todayLocal } from '../../utils/format.js';

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
  const load = useCallback(
    () =>
      Promise.all([
        fetchOrders({ paymentStatus: 'PENDIENTE,PARCIAL', status: BILLABLE, pageSize: 100 }),
        fetchPayments({ from: day, to: day, pageSize: 100 }),
      ]).then(([orders, payments]) => ({ pending: orders.data, payments })),
    [day],
  );
  const { data, error, loading, reload } = useApi(load, { interval: 30000 });

  const [form, setForm] = useState(null); // cobro en curso (abre la ventana)
  const [refunding, setRefunding] = useState(null); // pago a reembolsar
  const [refundReason, setRefundReason] = useState('');
  const [busy, setBusy] = useState(false);

  function openForm(order) {
    const { balance } = balanceOf(order);
    setForm({ order, balance, method: order.paymentMethod ?? 'EFECTIVO', amount: balance, reference: '' });
  }

  async function submitPayment(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await registerPayment({ orderId: form.order.id, method: form.method, amount: Number(form.amount), reference: form.reference || null });
      notifySuccess(`${formatMoney(form.amount)} registrados en el pedido #${form.order.orderNumber}`, 'Pago registrado');
      setForm(null);
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(false);
      reload();
    }
  }

  async function submitRefund() {
    setBusy(true);
    try {
      await refundPayment(refunding.id, refundReason.trim());
      notifySuccess(`Pago del pedido #${refunding.order.orderNumber} reembolsado`);
      setRefunding(null);
      setRefundReason('');
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(false);
      reload();
    }
  }

  const pendingTotal = data?.pending.reduce((sum, o) => sum + balanceOf(o).balance, 0) ?? 0;

  return (
    <>
      <PageHeader title="Pagos" subtitle="Un pago se registra solo cuando el dinero se recibe">
        <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={reload}>
          Actualizar
        </Button>
      </PageHeader>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={18} />} mb="md">
          {error}
        </Alert>
      )}
      {loading && <Skeleton h={300} radius="lg" />}

      {data && (
        <Stack gap="xl">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <StatCard label="Por cobrar" value={formatMoney(pendingTotal)} hint={`${data.pending.length} pedidos con saldo`} icon={IconClockDollar} color="yellow" />
            <StatCard
              label={day === todayLocal() ? 'Recibido hoy' : `Recibido el ${day}`}
              value={formatMoney(data.payments.summary.collected)}
              hint={`${data.payments.summary.payments} pagos vigentes`}
              icon={IconCash}
              color="green"
            />
          </SimpleGrid>

          {/* ---------------- Por cobrar ---------------- */}
          <div>
            <Title order={4} mb="sm">
              Pedidos por cobrar
            </Title>
            {data.pending.length === 0 ? (
              <EmptyState title="No hay pedidos con saldo pendiente" icon={IconCash} />
            ) : (
              <Paper withBorder>
                <Table.ScrollContainer minWidth={820}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Pedido</Table.Th>
                        <Table.Th>Cliente</Table.Th>
                        <Table.Th>Canal</Table.Th>
                        <Table.Th>Estado</Table.Th>
                        <Table.Th ta="right">Total</Table.Th>
                        <Table.Th ta="right">Pagado</Table.Th>
                        <Table.Th ta="right">Saldo</Table.Th>
                        <Table.Th />
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {data.pending.map((order) => {
                        const { paid, balance } = balanceOf(order);
                        return (
                          <Table.Tr key={order.id}>
                            <Table.Td fw={700}>#{order.orderNumber}</Table.Td>
                            <Table.Td>{order.customer?.name ?? 'Mostrador'}</Table.Td>
                            <Table.Td>{ORDER_SOURCE[order.source]}</Table.Td>
                            <Table.Td>
                              <Badge info={ORDER_STATUS[order.status]} size="sm" />
                            </Table.Td>
                            <Table.Td ta="right" className="tabular">
                              {formatMoney(order.total)}
                            </Table.Td>
                            <Table.Td ta="right" className="tabular" c="dimmed">
                              {formatMoney(paid)}
                            </Table.Td>
                            <Table.Td ta="right" className="tabular" fw={700}>
                              {formatMoney(balance)}
                            </Table.Td>
                            <Table.Td>
                              {can(user, 'payments.register') && (
                                <Button size="xs" onClick={() => openForm(order)}>
                                  Cobrar
                                </Button>
                              )}
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Paper>
            )}
          </div>

          {/* ---------------- Pagos del día ---------------- */}
          <div>
            <Group justify="space-between" mb="sm">
              <Title order={4}>Pagos registrados</Title>
              <TextInput
                type="date"
                value={day}
                max={todayLocal()}
                onChange={(e) => e.currentTarget.value && setDay(e.currentTarget.value)}
                aria-label="Día de los pagos"
              />
            </Group>
            {data.payments.data.length === 0 ? (
              <EmptyState title="No hay pagos registrados ese día" />
            ) : (
              <Paper withBorder>
                <Table.ScrollContainer minWidth={820}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Hora</Table.Th>
                        <Table.Th>Pedido</Table.Th>
                        <Table.Th>Método</Table.Th>
                        <Table.Th>Referencia</Table.Th>
                        <Table.Th ta="right">Monto</Table.Th>
                        <Table.Th>Estado</Table.Th>
                        <Table.Th>Registró</Table.Th>
                        <Table.Th />
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {data.payments.data.map((p) => (
                        <Table.Tr key={p.id}>
                          <Table.Td>{formatTime(p.createdAt)}</Table.Td>
                          <Table.Td fw={700}>#{p.order.orderNumber}</Table.Td>
                          <Table.Td>{PAYMENT_METHOD[p.method]}</Table.Td>
                          <Table.Td c="dimmed">{p.reference ?? '—'}</Table.Td>
                          <Table.Td ta="right" className="tabular" fw={600}>
                            {formatMoney(p.amount)}
                          </Table.Td>
                          <Table.Td>
                            <Badge info={PAYMENT_STATUS[p.status]} size="sm" />
                          </Table.Td>
                          <Table.Td>{p.recordedBy.name}</Table.Td>
                          <Table.Td>
                            {can(user, 'payments.refund') && p.status === 'PAGADO' && (
                              <Button size="xs" variant="subtle" color="red" leftSection={<IconReceiptRefund size={14} />} onClick={() => setRefunding(p)}>
                                Reembolsar
                              </Button>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Paper>
            )}
          </div>
        </Stack>
      )}

      {/* ---------------- Ventana: registrar pago ---------------- */}
      <Modal opened={Boolean(form)} onClose={() => setForm(null)} title={`Cobrar pedido #${form?.order.orderNumber ?? ''}`}>
        {form && (
          <form onSubmit={submitPayment}>
            <Stack>
              <Paper bg="var(--mantine-color-gray-light)" p="sm">
                <Group justify="space-between">
                  <Text c="dimmed">Saldo pendiente</Text>
                  <Text fw={800} fz="lg" className="tabular">
                    {formatMoney(form.balance)}
                  </Text>
                </Group>
              </Paper>
              <Select
                label="Método de pago"
                data={toOptions(PAYMENT_METHOD)}
                value={form.method}
                onChange={(v) => setForm({ ...form, method: v })}
                allowDeselect={false}
              />
              <NumberInput
                label="Monto recibido"
                value={form.amount}
                onChange={(v) => setForm({ ...form, amount: v })}
                min={1}
                max={form.balance}
                thousandSeparator="."
                decimalSeparator=","
                prefix="$ "
                allowNegative={false}
                description="Puede ser un abono parcial"
                required
              />
              <TextInput
                label="Referencia (opcional)"
                placeholder="N.º de transacción de Nequi, Daviplata…"
                maxLength={100}
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.currentTarget.value })}
              />
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={busy} disabled={!form.amount || form.amount > form.balance}>
                  Registrar pago
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>

      {/* ---------------- Ventana: reembolso (solo ADMIN) ---------------- */}
      <Modal opened={Boolean(refunding)} onClose={() => setRefunding(null)} title="Reembolsar pago">
        {refunding && (
          <Stack>
            <Text size="sm">
              Se marcará como reembolsado el pago de <strong>{formatMoney(refunding.amount)}</strong> del pedido #{refunding.order.orderNumber}. El
              registro se conserva para auditoría.
            </Text>
            <Textarea
              label="Motivo"
              placeholder="Ej.: cobro duplicado"
              value={refundReason}
              onChange={(e) => setRefundReason(e.currentTarget.value)}
              autosize
              minRows={2}
              data-autofocus
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setRefunding(null)}>
                Volver
              </Button>
              <Button color="red" loading={busy} disabled={refundReason.trim().length < 3} onClick={submitRefund}>
                Reembolsar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
