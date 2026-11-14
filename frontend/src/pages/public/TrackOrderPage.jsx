import { useEffect, useState } from 'react';
import { Alert, Box, Button, Center, Divider, Group, Paper, Stack, Stepper, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { IconSearch, IconToolsKitchen2 } from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';
import { trackOrder } from '../../services/admin.service.js';
import { getErrorMessage } from '../../services/api.js';
import { subscribe } from '../../services/socket.js';
import { formatMoney, formatTime } from '../../utils/format.js';

// Página PÚBLICA para el cliente: consulta el estado de su pedido con el número y su celular.
// (El bot de WhatsApp también responde "ESTADO".)
const STEPS_DELIVERY = ['CONFIRMADO', 'EN_PREPARACION', 'LISTO', 'EN_CAMINO', 'ENTREGADO'];
const STEPS_PICKUP = ['CONFIRMADO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO'];
const LABEL = {
  CONFIRMADO: 'Recibido',
  EN_PREPARACION: 'En cocina',
  LISTO: 'Listo',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
};

export default function TrackOrderPage() {
  const [params, setParams] = useSearchParams();
  const [number, setNumber] = useState(params.get('pedido') ?? '');
  const [phone, setPhone] = useState(params.get('cel') ?? '');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const query = params.get('pedido') && params.get('cel') ? { number: params.get('pedido'), phone: params.get('cel') } : null;

  // Consulta y se mantiene actualizado en vivo mientras la página esté abierta
  useEffect(() => {
    if (!query) return undefined;
    let ignore = false;
    const load = () =>
      trackOrder(query.number, query.phone)
        .then((data) => {
          if (ignore) return;
          setOrder(data);
          setError('');
        })
        .catch((err) => {
          if (ignore) return;
          setOrder(null);
          setError(getErrorMessage(err));
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    load();
    const unsubscribe = subscribe(['orders'], load);
    return () => {
      ignore = true;
      unsubscribe();
    };
  }, [query?.number, query?.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  function submit(e) {
    e.preventDefault();
    setLoading(true);
    setParams({ pedido: number.replace(/\D/g, ''), cel: phone.replace(/\D/g, '') });
  }

  const steps = order?.type === 'DOMICILIO' ? STEPS_DELIVERY : STEPS_PICKUP;
  const active = order ? (order.status === 'ENTREGADO' ? steps.length : steps.indexOf(order.status)) : 0;

  return (
    <Box mih="100vh" bg="var(--mantine-color-gray-light)">
      <Center p="md" pt={48}>
        <Stack w="100%" maw={560} gap="md">
          <Group justify="center" gap="sm">
            <ThemeIcon size={44} radius="xl" variant="gradient" gradient={{ from: 'brand.5', to: 'brand.8' }}>
              <IconToolsKitchen2 size={24} />
            </ThemeIcon>
            <Title order={2}>{order?.restaurantName ?? 'Sigue tu pedido'}</Title>
          </Group>

          <Paper withBorder p="lg">
            <form onSubmit={submit}>
              <Group align="flex-end" grow>
                <TextInput label="Número de pedido" placeholder="105" inputMode="numeric" required value={number} onChange={(e) => setNumber(e.currentTarget.value)} />
                <TextInput label="Tu celular" placeholder="3001234567" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.currentTarget.value)} />
              </Group>
              <Button type="submit" fullWidth mt="md" leftSection={<IconSearch size={16} />} loading={loading}>
                Consultar
              </Button>
            </form>
          </Paper>

          {error && <Alert color="red">{error}</Alert>}

          {order && (
            <Paper withBorder p="lg">
              <Group justify="space-between" mb="md">
                <Title order={3}>
                  Hola {order.customerName}, tu pedido #{order.orderNumber}
                </Title>
              </Group>
              {order.status === 'CANCELADO' ? (
                <Alert color="red" title="Pedido cancelado">
                  Si tienes dudas, comunícate con el restaurante.
                </Alert>
              ) : (
                <Stepper active={active} orientation="vertical" size="sm">
                  {steps.map((s) => {
                    const at = order.statusHistory.find((h) => h.newStatus === s);
                    return <Stepper.Step key={s} label={LABEL[s]} description={at ? formatTime(at.createdAt) : ''} />;
                  })}
                </Stepper>
              )}
              <Divider my="md" />
              <Stack gap={4}>
                {order.items.map((i, idx) => (
                  <Group key={idx} justify="space-between">
                    <Text size="sm">
                      {i.quantity} × {i.productName}
                    </Text>
                    <Text size="sm" className="tabular">
                      {formatMoney(i.subtotal)}
                    </Text>
                  </Group>
                ))}
                {Number(order.deliveryFee) > 0 && (
                  <Group justify="space-between">
                    <Text size="sm">Domicilio</Text>
                    <Text size="sm">{formatMoney(order.deliveryFee)}</Text>
                  </Group>
                )}
                <Group justify="space-between">
                  <Text fw={700}>Total</Text>
                  <Text fw={700}>{formatMoney(order.total)}</Text>
                </Group>
              </Stack>
              <Text size="xs" c="dimmed" mt="md">
                Esta página se actualiza sola cuando tu pedido cambia de estado.
              </Text>
            </Paper>
          )}
        </Stack>
      </Center>
    </Box>
  );
}
