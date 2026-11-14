import { useCallback, useState } from 'react';
import { Alert, Anchor, Button, Card, Divider, Group, List, Modal, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck, IconMapPin, IconMotorbike, IconPhone } from '@tabler/icons-react';
import { completeDelivery, fetchDeliveries } from '../../services/deliveries.service.js';
import { useApi } from '../../hooks/useApi.js';
import PageHeader from '../../components/PageHeader.jsx';
import Badge from '../../components/Badge.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { notifyError, notifySuccess } from '../../utils/notify.js';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../../utils/constants.js';
import { formatMoney, formatTime } from '../../utils/format.js';

// Pantalla del domiciliario (pensada para el celular).
// El backend solo le devuelve SUS entregas, así que aquí no se filtra por persona.
export default function MyDeliveriesPage() {
  const load = useCallback(() => fetchDeliveries(), []);
  const { data, error, loading, reload } = useApi(load, { interval: 15000 });
  const [confirming, setConfirming] = useState(null); // entrega a confirmar (abre la ventana)
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await completeDelivery(confirming.id);
      notifySuccess(`Pedido #${confirming.order.orderNumber} entregado. ¡Buen trabajo!`);
      setConfirming(null);
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(false);
      reload();
    }
  }

  const active = data?.filter((d) => d.status === 'ASIGNADO' || d.status === 'EN_CAMINO') ?? [];
  const done = data?.filter((d) => d.status === 'ENTREGADO').slice(0, 10) ?? [];

  return (
    <>
      <PageHeader title="Mis entregas" subtitle="Se actualiza cada 15 s" />

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={18} />} mb="md">
          {error}
        </Alert>
      )}
      {loading && <Skeleton h={260} radius="lg" />}

      {data && (
        <Stack gap="xl">
          <div>
            <Title order={4} mb="sm">
              Por entregar ({active.length})
            </Title>
            {active.length === 0 ? (
              <EmptyState title="No tienes entregas pendientes" description="Cuando te asignen un pedido aparecerá aquí." icon={IconMotorbike} />
            ) : (
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                {active.map((d) => (
                  <Card key={d.id} padding="lg">
                    <Group justify="space-between">
                      <Title order={3}>#{d.order.orderNumber}</Title>
                      <Text size="sm" c="dimmed">
                        Salió {formatTime(d.assignedAt)}
                      </Text>
                    </Group>

                    <Group gap={8} mt="md" wrap="nowrap" align="flex-start">
                      <IconMapPin size={22} color="var(--mantine-color-brand-6)" style={{ flexShrink: 0 }} />
                      <Text fz="lg" fw={600}>
                        {d.order.deliveryAddress}
                      </Text>
                    </Group>
                    <Group gap={8} mt={6}>
                      <Text>{d.order.customer?.name}</Text>
                      <Anchor href={`tel:${d.order.customer?.phone}`} fw={600}>
                        <Group gap={4}>
                          <IconPhone size={16} /> {d.order.customer?.phone}
                        </Group>
                      </Anchor>
                    </Group>

                    <Divider my="sm" />
                    <List size="sm" spacing={2}>
                      {d.order.items.map((i) => (
                        <List.Item key={i.id}>
                          {i.quantity} × {i.productName}
                          {i.notes && (
                            <Text span c="dimmed" fs="italic">
                              {' '}
                              ({i.notes})
                            </Text>
                          )}
                        </List.Item>
                      ))}
                    </List>
                    {d.order.notes && (
                      <Alert color="blue" mt="sm" p="xs">
                        Nota: {d.order.notes}
                      </Alert>
                    )}

                    <Paper bg="var(--mantine-color-gray-light)" p="sm" mt="md">
                      <Group justify="space-between">
                        <div>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                            {d.order.paymentStatus === 'PAGADO' ? 'Ya pagado' : 'Cobrar al cliente'}
                          </Text>
                          <Text fz="xl" fw={800} className="tabular">
                            {formatMoney(d.order.total)}
                          </Text>
                          {d.order.paymentMethod && (
                            <Text size="sm" c="dimmed">
                              {PAYMENT_METHOD[d.order.paymentMethod]}
                            </Text>
                          )}
                        </div>
                        <Badge info={PAYMENT_STATUS[d.order.paymentStatus]} size="lg" />
                      </Group>
                    </Paper>

                    <Button fullWidth size="lg" mt="md" color="teal" leftSection={<IconCircleCheck size={20} />} onClick={() => setConfirming(d)}>
                      Confirmar entrega
                    </Button>
                  </Card>
                ))}
              </SimpleGrid>
            )}
          </div>

          {done.length > 0 && (
            <div>
              <Title order={4} mb="sm">
                Últimas entregadas
              </Title>
              <Paper withBorder p="md">
                <Stack gap={6}>
                  {done.map((d) => (
                    <Group key={d.id} justify="space-between" wrap="nowrap">
                      <Text size="sm">
                        <strong>#{d.order.orderNumber}</strong> · {d.order.deliveryAddress}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {formatTime(d.deliveredAt)}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            </div>
          )}
        </Stack>
      )}

      <Modal opened={Boolean(confirming)} onClose={() => setConfirming(null)} title="Confirmar entrega">
        <Text>
          ¿Entregaste el pedido <strong>#{confirming?.order.orderNumber}</strong> en {confirming?.order.deliveryAddress}?
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setConfirming(null)}>
            Todavía no
          </Button>
          <Button color="teal" loading={busy} onClick={confirm}>
            Sí, entregado
          </Button>
        </Group>
      </Modal>
    </>
  );
}
