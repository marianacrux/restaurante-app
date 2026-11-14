import { useCallback, useState } from 'react';
import {
  Alert,
  Button,
  Divider,
  Drawer,
  Group,
  NumberInput,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Timeline,
  Title,
} from '@mantine/core';
import { IconCircleCheck, IconEdit, IconPlus } from '@tabler/icons-react';
import { addOrderItems, fetchOrder, updateOrder } from '../services/orders.service.js';
import { fetchProducts } from '../services/catalog.service.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { can } from '../auth/access.js';
import Badge from './Badge.jsx';
import { notifyError, notifySuccess } from '../utils/notify.js';
import { ORDER_SOURCE, ORDER_STATUS, ORDER_TYPE, PAYMENT_METHOD, PAYMENT_STATUS, toOptions } from '../utils/constants.js';
import { formatMoney, formatTime } from '../utils/format.js';

const CAN_ADD_ITEMS = ['PENDIENTE', 'CONFIRMADO'];
const CLOSED = ['ENTREGADO', 'CANCELADO'];

/** Detalle completo de un pedido: productos, totales, historial, pagos y entrega. */
export default function OrderDrawer({ orderId, onClose }) {
  return (
    <Drawer opened={Boolean(orderId)} onClose={onClose} position="right" size="lg" title={<Title order={4}>Detalle del pedido</Title>}>
      {orderId && <OrderDetail key={orderId} orderId={orderId} />}
    </Drawer>
  );
}

function OrderDetail({ orderId }) {
  const { user } = useAuth();
  const load = useCallback(() => fetchOrder(orderId), [orderId]);
  const { data: order, error, reload } = useApi(load, { topics: ['orders', 'payments', 'deliveries'] });
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  if (error) return <Alert color="red">{error}</Alert>;
  if (!order) return <Skeleton h={400} />;

  const paid = order.payments.filter((p) => p.status === 'PAGADO').reduce((s, p) => s + Number(p.amount), 0);
  const editable = can(user, 'orders.edit') && !CLOSED.includes(order.status);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>#{order.orderNumber}</Title>
        <Group gap="xs">
          <Badge info={ORDER_STATUS[order.status]} size="lg" />
          <Badge info={PAYMENT_STATUS[order.paymentStatus]} size="lg" />
        </Group>
      </Group>
      <Text c="dimmed" size="sm">
        {ORDER_SOURCE[order.source]} · {ORDER_TYPE[order.type]} · {new Date(order.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
        {order.createdBy ? ` · registró ${order.createdBy.name}` : ' · creado por el bot'}
      </Text>

      {/* ---------------- Cliente y datos ---------------- */}
      <Paper withBorder p="sm">
        <Group justify="space-between" mb={4}>
          <Text fw={600}>Cliente y entrega</Text>
          {editable && !editing && (
            <Button size="xs" variant="subtle" leftSection={<IconEdit size={14} />} onClick={() => setEditing(true)}>
              Editar
            </Button>
          )}
        </Group>
        {editing ? (
          <EditInfoForm order={order} onDone={() => setEditing(false)} onSaved={reload} />
        ) : (
          <Stack gap={2}>
            <Text size="sm">{order.customer ? `${order.customer.name} · ${order.customer.phone}` : 'Cliente de mostrador'}</Text>
            {order.deliveryAddress && <Text size="sm">📍 {order.deliveryAddress}</Text>}
            <Text size="sm" c="dimmed">
              Pagará con: {order.paymentMethod ? PAYMENT_METHOD[order.paymentMethod] : 'sin definir'}
            </Text>
            {order.notes && <Text size="sm">📝 {order.notes}</Text>}
            {order.cancelReason && (
              <Text size="sm" c="red">
                Motivo de cancelación: {order.cancelReason}
              </Text>
            )}
          </Stack>
        )}
      </Paper>

      {/* ---------------- Productos ---------------- */}
      <div>
        <Group justify="space-between" mb={4}>
          <Text fw={600}>Productos</Text>
          {editable && CAN_ADD_ITEMS.includes(order.status) && !adding && (
            <Button size="xs" variant="subtle" leftSection={<IconPlus size={14} />} onClick={() => setAdding(true)}>
              Agregar productos
            </Button>
          )}
        </Group>
        <Table withRowBorders={false} verticalSpacing={4}>
          <Table.Tbody>
            {order.items.map((i) => (
              <Table.Tr key={i.id}>
                <Table.Td>
                  {i.quantity} × {i.productName}
                  {i.notes && (
                    <Text span size="xs" c="orange.8">
                      {' '}
                      ({i.notes})
                    </Text>
                  )}
                </Table.Td>
                <Table.Td ta="right" className="tabular">
                  {formatMoney(i.subtotal)}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {adding && <AddItemsForm order={order} onDone={() => setAdding(false)} onSaved={reload} />}
        <Divider my="xs" />
        <Stack gap={2}>
          <Row label="Subtotal" value={order.subtotal} />
          {Number(order.deliveryFee) > 0 && <Row label="Domicilio" value={order.deliveryFee} />}
          {Number(order.discount) > 0 && <Row label="Descuento" value={-order.discount} />}
          <Row label="Total" value={order.total} bold />
          <Row label="Pagado" value={paid} />
          <Row label="Saldo" value={Number(order.total) - paid} bold />
        </Stack>
      </div>

      {/* ---------------- Pagos ---------------- */}
      {order.payments.length > 0 && (
        <div>
          <Text fw={600} mb={4}>
            Pagos
          </Text>
          <Stack gap={4}>
            {order.payments.map((p) => (
              <Group key={p.id} justify="space-between">
                <Text size="sm">
                  {formatTime(p.createdAt)} · {PAYMENT_METHOD[p.method]} · {p.recordedBy.name}
                </Text>
                <Group gap="xs">
                  <Text size="sm" fw={600} className="tabular">
                    {formatMoney(p.amount)}
                  </Text>
                  <Badge info={PAYMENT_STATUS[p.status]} size="xs" />
                </Group>
              </Group>
            ))}
          </Stack>
        </div>
      )}

      {/* ---------------- Entrega ---------------- */}
      {order.delivery && (
        <Paper withBorder p="sm">
          <Text fw={600}>Domiciliario: {order.delivery.deliveryPerson.name}</Text>
          <Text size="sm" c="dimmed">
            {order.delivery.deliveryPerson.phone} · salió {formatTime(order.delivery.assignedAt)}
            {order.delivery.deliveredAt && ` · entregado ${formatTime(order.delivery.deliveredAt)}`}
          </Text>
        </Paper>
      )}

      {/* ---------------- Historial ---------------- */}
      <div>
        <Text fw={600} mb="xs">
          Historial
        </Text>
        <Timeline active={order.statusHistory.length} bulletSize={18} lineWidth={2}>
          {order.statusHistory.map((h) => (
            <Timeline.Item key={h.id} bullet={<IconCircleCheck size={12} />} title={ORDER_STATUS[h.newStatus].label}>
              <Text size="xs" c="dimmed">
                {formatTime(h.createdAt)} · {h.changedBy?.name ?? 'Sistema / bot'}
              </Text>
              {h.note && <Text size="sm">{h.note}</Text>}
            </Timeline.Item>
          ))}
        </Timeline>
      </div>
    </Stack>
  );
}

function Row({ label, value, bold }) {
  return (
    <Group justify="space-between">
      <Text size="sm" fw={bold ? 700 : 400}>
        {label}
      </Text>
      <Text size="sm" fw={bold ? 700 : 400} className="tabular">
        {formatMoney(value)}
      </Text>
    </Group>
  );
}

function EditInfoForm({ order, onDone, onSaved }) {
  const [form, setForm] = useState({
    name: order.customer?.name ?? '',
    phone: order.customer?.phone ?? '',
    address: order.deliveryAddress ?? '',
    paymentMethod: order.paymentMethod,
    notes: order.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const body = { notes: form.notes.trim() || null, paymentMethod: form.paymentMethod };
    if (order.type === 'DOMICILIO') body.deliveryAddress = form.address.trim();
    if (form.name.trim() && form.phone.trim()) body.customer = { name: form.name.trim(), phone: form.phone.trim() };
    try {
      await updateOrder(order.id, body);
      notifySuccess(`Pedido #${order.orderNumber} actualizado`);
      onSaved();
      onDone();
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack gap="xs">
      <Group grow>
        <TextInput size="xs" label="Cliente" value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
        <TextInput size="xs" label="Celular" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.currentTarget.value })} />
      </Group>
      {order.type === 'DOMICILIO' && <TextInput size="xs" label="Dirección" value={form.address} onChange={(e) => setForm({ ...form, address: e.currentTarget.value })} />}
      <Select size="xs" label="Pagará con" data={toOptions(PAYMENT_METHOD)} value={form.paymentMethod} onChange={(v) => setForm({ ...form, paymentMethod: v })} clearable />
      <Textarea size="xs" label="Notas" autosize value={form.notes} onChange={(e) => setForm({ ...form, notes: e.currentTarget.value })} />
      <Group justify="flex-end">
        <Button size="xs" variant="default" onClick={onDone}>
          Cancelar
        </Button>
        <Button size="xs" loading={saving} onClick={save}>
          Guardar
        </Button>
      </Group>
    </Stack>
  );
}

function AddItemsForm({ order, onDone, onSaved }) {
  const loadProducts = useCallback(() => fetchProducts({ available: true }), []);
  const { data: products } = useApi(loadProducts, { topics: ['products'] });
  const [productId, setProductId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await addOrderItems(order.id, [{ productId: Number(productId), quantity, notes: notes.trim() || null }]);
      notifySuccess('Producto agregado; el total se recalculó');
      onSaved();
      onDone();
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Paper withBorder p="xs" mt="xs">
      <Stack gap="xs">
        <Group grow align="flex-end">
          <Select
            size="xs"
            label="Producto"
            searchable
            data={(products ?? []).map((p) => ({ value: String(p.id), label: `${p.name} · ${formatMoney(p.price)}` }))}
            value={productId}
            onChange={setProductId}
          />
          <NumberInput size="xs" label="Cantidad" min={1} max={99} value={quantity} onChange={(v) => setQuantity(Number(v) || 1)} maw={90} />
        </Group>
        <TextInput size="xs" placeholder="Instrucciones (opcional)" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />
        <Group justify="flex-end">
          <Button size="xs" variant="default" onClick={onDone}>
            Cancelar
          </Button>
          <Button size="xs" loading={saving} disabled={!productId} onClick={save}>
            Agregar
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
