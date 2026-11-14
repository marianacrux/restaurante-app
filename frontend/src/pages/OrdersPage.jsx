import { useCallback, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Menu,
  Modal,
  Pagination,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconAlertCircle, IconDotsVertical, IconPlus, IconRefresh, IconSearch, IconX } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { changeOrderStatus, fetchOrders } from '../services/orders.service.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { can } from '../auth/access.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import OrderDrawer from '../components/OrderDrawer.jsx';
import { notifyError, notifySuccess } from '../utils/notify.js';
import { ORDER_SOURCE, ORDER_STATUS, ORDER_TYPE, PAYMENT_STATUS, STATUS_ACTION_LABEL, toOptions } from '../utils/constants.js';
import { formatMoney, formatTime } from '../utils/format.js';

const PAGE_SIZE = 20;
const ACTIVE = 'PENDIENTE,CONFIRMADO,EN_PREPARACION,LISTO,EN_CAMINO';
const STATUS_FILTERS = [
  { value: ACTIVE, label: 'Activos' },
  { value: 'ALL', label: 'Todos' },
  ...toOptions(ORDER_STATUS),
];

export default function OrdersPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState(ACTIVE);
  const [source, setSource] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [cancelling, setCancelling] = useState(null); // pedido a cancelar (abre la ventana)
  const [reason, setReason] = useState('');
  const [detailId, setDetailId] = useState(null); // pedido abierto en el panel lateral

  const load = useCallback(
    () => fetchOrders({ status: status === 'ALL' ? undefined : status, source: source ?? undefined, page, pageSize: PAGE_SIZE }),
    [status, source, page],
  );
  const { data, error, loading, reload, updatedAt } = useApi(load, { topics: ['orders'], interval: 60000 });

  // La búsqueda filtra la página actual (número de pedido, cliente o teléfono).
  const term = search.trim().toLowerCase();
  const orders = (data?.data ?? []).filter(
    (o) =>
      !term ||
      String(o.orderNumber).includes(term.replace('#', '')) ||
      o.customer?.name.toLowerCase().includes(term) ||
      o.customer?.phone.includes(term),
  );

  async function change(order, newStatus, extra = {}) {
    setBusyId(order.id);
    try {
      await changeOrderStatus(order.id, { status: newStatus, ...extra });
      notifySuccess(`Pedido #${order.orderNumber}: ${ORDER_STATUS[newStatus].label.toLowerCase()}`);
      reload();
      return true;
    } catch (err) {
      notifyError(err);
      reload();
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function confirmCancel() {
    if (reason.trim().length < 3) return;
    if (await change(cancelling, 'CANCELADO', { cancelReason: reason.trim() })) {
      setCancelling(null);
      setReason('');
    }
  }

  const resetPage = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Pedidos"
        subtitle={`${data?.pagination.total ?? '…'} pedidos · ${updatedAt ? `actualizado ${formatTime(updatedAt.toISOString())}` : 'cargando'} · en vivo · toca un pedido para ver su detalle`}
      >
        {can(user, 'orders.create') && (
          <Button component={Link} to="/pedidos/nuevo" leftSection={<IconPlus size={16} />}>
            Nuevo pedido
          </Button>
        )}
        <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={reload}>
          Actualizar
        </Button>
      </PageHeader>

      <Paper withBorder p="md" mb="md">
        <Group grow wrap="wrap" align="flex-end">
          <Select label="Estado" data={STATUS_FILTERS} value={status} onChange={resetPage((v) => setStatus(v ?? ACTIVE))} allowDeselect={false} />
          <Select label="Canal" placeholder="Todos los canales" data={toOptions(ORDER_SOURCE)} value={source} onChange={resetPage(setSource)} clearable />
          <TextInput
            label="Buscar"
            placeholder="# pedido, cliente o teléfono"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            rightSection={
              search && (
                <ActionIcon variant="subtle" color="gray" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">
                  <IconX size={14} />
                </ActionIcon>
              )
            }
          />
        </Group>
      </Paper>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={18} />} mb="md">
          {error}
        </Alert>
      )}

      {loading && <Skeleton h={300} radius="lg" />}

      {data && orders.length === 0 && <EmptyState title="No hay pedidos con estos filtros" description="Prueba con otro estado o canal." />}

      {orders.length > 0 && (
        <Paper withBorder>
          <Table.ScrollContainer minWidth={900}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Pedido</Table.Th>
                  <Table.Th>Hora</Table.Th>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Canal / entrega</Table.Th>
                  <Table.Th>Productos</Table.Th>
                  <Table.Th ta="right">Total</Table.Th>
                  <Table.Th>Pago</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {orders.map((order) => {
                  const actions = can(user, 'orders.changeStatus') ? order.availableStatuses : [];
                  return (
                    <Table.Tr key={order.id} onClick={() => setDetailId(order.id)} style={{ cursor: 'pointer' }}>
                      <Table.Td fw={700}>#{order.orderNumber}</Table.Td>
                      <Table.Td>{formatTime(order.createdAt)}</Table.Td>
                      <Table.Td>
                        <Text size="sm">{order.customer?.name ?? 'Mostrador'}</Text>
                        {order.customer && (
                          <Text size="xs" c="dimmed">
                            {order.customer.phone}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{ORDER_SOURCE[order.source]}</Text>
                        <Text size="xs" c="dimmed">
                          {ORDER_TYPE[order.type]}
                        </Text>
                      </Table.Td>
                      <Table.Td maw={260}>
                        <Text size="sm" lineClamp={2}>
                          {order.items.map((i) => `${i.quantity} ${i.productName}`).join(', ')}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right" fw={600} className="tabular">
                        {formatMoney(order.total)}
                      </Table.Td>
                      <Table.Td>
                        <Badge info={PAYMENT_STATUS[order.paymentStatus]} size="sm" />
                      </Table.Td>
                      <Table.Td>
                        <Badge info={ORDER_STATUS[order.status]} />
                      </Table.Td>
                      <Table.Td onClick={(e) => e.stopPropagation()}>
                        {actions.length > 0 && (
                          <Menu position="bottom-end" withinPortal>
                            <Menu.Target>
                              <ActionIcon variant="subtle" color="gray" loading={busyId === order.id} aria-label={`Acciones del pedido ${order.orderNumber}`}>
                                <IconDotsVertical size={18} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Label>Cambiar estado</Menu.Label>
                              {actions.map((s) => (
                                <Menu.Item
                                  key={s}
                                  color={s === 'CANCELADO' ? 'red' : undefined}
                                  onClick={() => (s === 'CANCELADO' ? setCancelling(order) : change(order, s))}
                                >
                                  {STATUS_ACTION_LABEL[s] ?? ORDER_STATUS[s].label}
                                </Menu.Item>
                              ))}
                            </Menu.Dropdown>
                          </Menu>
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

      {data && data.pagination.totalPages > 1 && (
        <Group justify="center" mt="md">
          <Pagination total={data.pagination.totalPages} value={page} onChange={setPage} />
        </Group>
      )}

      <OrderDrawer orderId={detailId} onClose={() => setDetailId(null)} />

      <Modal opened={Boolean(cancelling)} onClose={() => setCancelling(null)} title={`Cancelar pedido #${cancelling?.orderNumber ?? ''}`}>
        <Stack>
          <Text size="sm" c="dimmed">
            El pedido no se podrá reactivar. Si iba en camino, el domiciliario quedará libre.
          </Text>
          <Textarea
            label="Motivo"
            placeholder="Ej.: el cliente desistió"
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            error={reason && reason.trim().length < 3 ? 'Mínimo 3 caracteres' : null}
            autosize
            minRows={2}
            data-autofocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCancelling(null)}>
              Volver
            </Button>
            <Button color="red" onClick={confirmCancel} loading={busyId === cancelling?.id} disabled={reason.trim().length < 3}>
              Cancelar pedido
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
