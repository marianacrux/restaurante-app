import { useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { ActionIcon } from '@mantine/core';
import { IconAlertCircle, IconEdit, IconMapPin, IconMotorbike, IconPackage, IconRefresh, IconUserPlus, IconUsers } from '@tabler/icons-react';
import CourierModal from './CourierModal.jsx';
import { fetchOrders } from '../../services/orders.service.js';
import {
  assignDelivery,
  completeDelivery,
  fetchDeliveries,
  fetchDeliveryPersons,
  setCourierAvailability,
} from '../../services/deliveries.service.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.js';
import { can } from '../../auth/access.js';
import PageHeader from '../../components/PageHeader.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { notifyError, notifySuccess } from '../../utils/notify.js';
import { COURIER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, TRANSPORT_TYPE } from '../../utils/constants.js';
import { formatMoney, formatTime } from '../../utils/format.js';

const REFRESH_MS = 60000; // respaldo: los cambios llegan al instante por Socket.IO

const loadAll = () =>
  Promise.all([
    fetchOrders({ status: 'LISTO', type: 'DOMICILIO', pageSize: 50 }),
    fetchDeliveries({ status: 'ASIGNADO,EN_CAMINO' }),
    fetchDeliveryPersons({ includeInactive: true }),
  ]).then(([orders, onTheWay, couriers]) => ({ ready: orders.data, onTheWay, couriers }));

export default function DeliveriesPage() {
  const { user } = useAuth();
  // loadAll está fuera del componente: es siempre la misma función (no necesita useCallback)
  const { data, error, loading, reload } = useApi(loadAll, { topics: ['orders', 'deliveries', 'couriers'], interval: REFRESH_MS });
  const [editingCourier, setEditingCourier] = useState(null);
  const [busy, setBusy] = useState(null); // id de lo que se está guardando
  const [selected, setSelected] = useState({}); // { [orderId]: deliveryPersonId }

  /** Ejecuta una acción, avisa el resultado y recarga (también si falla: otro cajero pudo adelantarse). */
  async function run(key, action, successText) {
    setBusy(key);
    try {
      await action();
      notifySuccess(successText);
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(null);
      reload();
    }
  }

  const available = data?.couriers.filter((c) => c.availability === 'DISPONIBLE') ?? [];
  const courierOptions = available.map((c) => ({ value: String(c.id), label: `${c.name} · ${TRANSPORT_TYPE[c.transportType]}` }));

  return (
    <>
      <PageHeader title="Domicilios" subtitle="Despacho de pedidos listos · en vivo">
        {can(user, 'couriers.manage') && (
          <Button variant="default" leftSection={<IconUserPlus size={16} />} onClick={() => setEditingCourier({})}>
            Nuevo domiciliario
          </Button>
        )}
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
        <Tabs defaultValue="ready" keepMounted={false}>
          <Tabs.List mb="md">
            <Tabs.Tab value="ready" leftSection={<IconPackage size={16} />}>
              Listos para despachar <Badge info={{ label: data.ready.length, color: 'green' }} size="sm" />
            </Tabs.Tab>
            <Tabs.Tab value="onTheWay" leftSection={<IconMotorbike size={16} />}>
              En camino <Badge info={{ label: data.onTheWay.length, color: 'violet' }} size="sm" />
            </Tabs.Tab>
            <Tabs.Tab value="couriers" leftSection={<IconUsers size={16} />}>
              Domiciliarios <Badge info={{ label: `${available.length} libres`, color: 'gray' }} size="sm" />
            </Tabs.Tab>
          </Tabs.List>

          {/* ---------------- Listos ---------------- */}
          <Tabs.Panel value="ready">
            {data.ready.length === 0 ? (
              <EmptyState title="No hay pedidos a domicilio listos" description="Aparecerán aquí cuando cocina los marque como listos." />
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
                {data.ready.map((order) => (
                  <Card key={order.id} padding="lg">
                    <Group justify="space-between" mb="xs">
                      <Title order={4}>#{order.orderNumber}</Title>
                      <Badge info={PAYMENT_STATUS[order.paymentStatus]} />
                    </Group>
                    <Text fw={600}>{order.customer?.name}</Text>
                    <Text size="sm" c="dimmed">
                      {order.customer?.phone}
                    </Text>
                    <Group gap={6} mt="xs" wrap="nowrap" align="flex-start">
                      <IconMapPin size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                      <Text size="sm">{order.deliveryAddress}</Text>
                    </Group>
                    <Text size="sm" c="dimmed" mt="xs" lineClamp={2}>
                      {order.items.map((i) => `${i.quantity} ${i.productName}`).join(', ')}
                    </Text>
                    <Group justify="space-between" mt="sm">
                      <Text fw={700} size="lg" className="tabular">
                        {formatMoney(order.total)}
                      </Text>
                      {order.paymentMethod && (
                        <Text size="sm" c="dimmed">
                          {PAYMENT_METHOD[order.paymentMethod]}
                        </Text>
                      )}
                    </Group>
                    {can(user, 'deliveries.assign') && (
                      <Group mt="md" gap="xs" wrap="nowrap" align="flex-end">
                        <Select
                          style={{ flex: 1 }}
                          placeholder={available.length ? 'Elegir domiciliario' : 'Nadie disponible'}
                          data={courierOptions}
                          value={selected[order.id] ?? null}
                          onChange={(v) => setSelected((s) => ({ ...s, [order.id]: v }))}
                          disabled={available.length === 0}
                          aria-label={`Domiciliario para el pedido ${order.orderNumber}`}
                          comboboxProps={{ withinPortal: true }}
                        />
                        <Button
                          disabled={!selected[order.id]}
                          loading={busy === `assign-${order.id}`}
                          onClick={() =>
                            run(`assign-${order.id}`, () => assignDelivery(order.id, Number(selected[order.id])), `Pedido #${order.orderNumber} despachado`)
                          }
                        >
                          Despachar
                        </Button>
                      </Group>
                    )}
                  </Card>
                ))}
              </SimpleGrid>
            )}
          </Tabs.Panel>

          {/* ---------------- En camino ---------------- */}
          <Tabs.Panel value="onTheWay">
            {data.onTheWay.length === 0 ? (
              <EmptyState title="No hay entregas en curso" icon={IconMotorbike} />
            ) : (
              <Paper withBorder>
                <Table.ScrollContainer minWidth={760}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Pedido</Table.Th>
                        <Table.Th>Domiciliario</Table.Th>
                        <Table.Th>Salió</Table.Th>
                        <Table.Th>Dirección</Table.Th>
                        <Table.Th ta="right">Total</Table.Th>
                        <Table.Th>Pago</Table.Th>
                        <Table.Th />
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {data.onTheWay.map((d) => (
                        <Table.Tr key={d.id}>
                          <Table.Td fw={700}>#{d.order.orderNumber}</Table.Td>
                          <Table.Td>{d.deliveryPerson.name}</Table.Td>
                          <Table.Td>{formatTime(d.assignedAt)}</Table.Td>
                          <Table.Td>{d.order.deliveryAddress}</Table.Td>
                          <Table.Td ta="right" className="tabular">
                            {formatMoney(d.order.total)}
                          </Table.Td>
                          <Table.Td>
                            <Badge info={PAYMENT_STATUS[d.order.paymentStatus]} size="sm" />
                          </Table.Td>
                          <Table.Td>
                            <Button
                              size="xs"
                              variant="light"
                              color="teal"
                              loading={busy === `done-${d.id}`}
                              onClick={() => run(`done-${d.id}`, () => completeDelivery(d.id), `Pedido #${d.order.orderNumber} entregado`)}
                            >
                              Confirmar entrega
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Paper>
            )}
          </Tabs.Panel>

          {/* ---------------- Domiciliarios ---------------- */}
          <Tabs.Panel value="couriers">
            <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
              {data.couriers.filter((c) => c.active || can(user, 'couriers.manage')).map((c) => {
                const next = c.availability === 'DISPONIBLE' ? 'INACTIVO' : 'DISPONIBLE';
                return (
                  <Card key={c.id} padding="lg">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap">
                        <Avatar color={COURIER_STATUS[c.availability].color} radius="xl">
                          <IconMotorbike size={20} />
                        </Avatar>
                        <div>
                          <Text fw={600}>{c.name}</Text>
                          <Text size="xs" c="dimmed">
                            {TRANSPORT_TYPE[c.transportType]} · {c.phone}
                          </Text>
                        </div>
                      </Group>
                      <Group gap={4} wrap="nowrap">
                        {c.active ? <Badge info={COURIER_STATUS[c.availability]} /> : <Badge info={{ label: 'Desactivado', color: 'gray' }} />}
                        {can(user, 'couriers.manage') && (
                          <ActionIcon variant="subtle" onClick={() => setEditingCourier(c)} aria-label={`Editar ${c.name}`}>
                            <IconEdit size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Group>
                    <Stack gap={2} mt="md">
                      <Text size="sm">
                        <strong>{c.deliveredToday}</strong> entregas hoy
                      </Text>
                      {c.activeDelivery && (
                        <Text size="sm" c="violet.7">
                          Lleva el pedido #{c.activeDelivery.order.orderNumber}
                        </Text>
                      )}
                    </Stack>
                    {can(user, 'couriers.setAvailability') && c.active && c.availability !== 'OCUPADO' && (
                      <Button
                        mt="md"
                        variant="light"
                        color={next === 'DISPONIBLE' ? 'green' : 'gray'}
                        loading={busy === `avail-${c.id}`}
                        onClick={() =>
                          run(`avail-${c.id}`, () => setCourierAvailability(c.id, next), `${c.name}: ${COURIER_STATUS[next].label.toLowerCase()}`)
                        }
                      >
                        {next === 'DISPONIBLE' ? 'Marcar disponible' : 'Enviar a descanso'}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </SimpleGrid>
          </Tabs.Panel>
        </Tabs>
      )}
      {editingCourier && <CourierModal courier={editingCourier} onClose={() => setEditingCourier(null)} onSaved={reload} />}
    </>
  );
}
