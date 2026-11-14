import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBell,
  IconChefHat,
  IconRepeat,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useSpeechAnnouncer } from '../../hooks/useSpeechAnnouncer.js';
import { changeOrderStatus, fetchOrders } from '../../services/orders.service.js';
import { getErrorMessage } from '../../services/api.js';
import { notifyError } from '../../utils/notify.js';
import UserMenu from '../../components/UserMenu.jsx';
import { ORDER_SOURCE, ORDER_TYPE } from '../../utils/constants.js';
import { formatTime } from '../../utils/format.js';
import { buildAnnouncement } from './announcement.js';

const POLL_MS = 5000; // cada 5 segundos se consulta la API
const HIGHLIGHT_MS = 20000; // cuánto tiempo se resalta un pedido nuevo
const LATE_MINUTES = 20; // a partir de aquí el tiempo de espera se pinta en rojo

const COLUMNS = [
  { status: 'CONFIRMADO', title: 'Por preparar', color: 'blue', action: 'EN_PREPARACION', actionLabel: 'Iniciar preparación' },
  { status: 'EN_PREPARACION', title: 'En preparación', color: 'yellow', action: 'LISTO', actionLabel: 'Marcar listo' },
  { status: 'LISTO', title: 'Listos', color: 'green' },
];

export default function KitchenPage() {
  const { user } = useAuth();
  const { supported, enabled, muted, speaking, announce, enable, toggleMute, repeatLast } = useSpeechAnnouncer();

  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [highlighted, setHighlighted] = useState(() => new Set());
  const [banner, setBanner] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);
  const now = useNow(30000);
  const seenRef = useRef(null); // ids de pedidos ya vistos (null = aún no hubo primera carga)

  useEffect(() => {
    let ignore = false;

    function load() {
      fetchOrders({ status: COLUMNS.map((c) => c.status).join(','), pageSize: 100 })
        .then((result) => {
          if (ignore) return;
          setOrders(result.data);
          setError('');
          setLastUpdated(new Date());

          // Primera carga: solo se registran los pedidos que ya estaban (no se anuncian)
          if (seenRef.current === null) {
            seenRef.current = new Set(result.data.map((o) => o.id));
            return;
          }
          // Cargas siguientes: cada pedido CONFIRMADO que no habíamos visto es nuevo
          const fresh = result.data.filter((o) => o.status === 'CONFIRMADO' && !seenRef.current.has(o.id));
          result.data.forEach((o) => seenRef.current.add(o.id));
          if (fresh.length === 0) return;

          fresh.sort((a, b) => a.orderNumber - b.orderNumber).forEach((o) => announce(buildAnnouncement(o)));
          const ids = fresh.map((o) => o.id);
          setHighlighted((prev) => new Set([...prev, ...ids]));
          setBanner(fresh.length === 1 ? `Nuevo pedido #${fresh[0].orderNumber}` : `${fresh.length} pedidos nuevos`);
          setTimeout(() => {
            setHighlighted((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
            setBanner('');
          }, HIGHLIGHT_MS);
        })
        .catch((err) => {
          if (!ignore) setError(getErrorMessage(err));
        });
    }

    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [reloadCount, announce]);

  async function advance(order, status) {
    setBusyId(order.id);
    try {
      await changeOrderStatus(order.id, { status });
    } catch (err) {
      notifyError(err);
    } finally {
      setBusyId(null);
      setReloadCount((n) => n + 1); // recargar enseguida, sin esperar los 5 s
    }
  }

  const byStatus = (status) =>
    (orders ?? []).filter((o) => o.status === status).sort((a, b) => a.orderNumber - b.orderNumber);

  function repeat() {
    const latest = byStatus('CONFIRMADO').at(-1) ?? byStatus('EN_PREPARACION').at(-1);
    repeatLast(latest ? buildAnnouncement(latest, { isNew: false }) : 'No hay pedidos pendientes en cocina');
  }

  return (
    <Box mih="100vh" bg="var(--mantine-color-gray-light)" p={{ base: 'sm', md: 'lg' }}>
      {/* ---------------- Encabezado ---------------- */}
      <Paper withBorder p="sm" mb="md">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="sm">
            {user.role !== 'COCINA' && (
              <Button component={Link} to="/pedidos" variant="subtle" leftSection={<IconArrowLeft size={16} />}>
                Volver
              </Button>
            )}
            <ThemeIcon size={40} radius="md" variant="light">
              <IconChefHat size={24} />
            </ThemeIcon>
            <div>
              <Title order={3} lh={1.1}>
                Cocina
              </Title>
              <Text size="sm" c="dimmed">
                {formatTime(new Date(now).toISOString())}
              </Text>
            </div>
            <Badge color={error ? 'red' : 'green'} variant="dot" size="lg">
              {error ? 'Sin conexión' : lastUpdated ? `En línea · ${formatTime(lastUpdated.toISOString())}` : 'Conectando…'}
            </Badge>
          </Group>

          <Group gap="xs">
            {user.role === 'COCINA' && (
              <Button component={Link} to="/pedidos" variant="default">
                Ver pedidos
              </Button>
            )}
            {enabled && (
              <>
                <Button
                  variant={muted ? 'light' : 'default'}
                  color={muted ? 'red' : 'gray'}
                  leftSection={muted ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
                  onClick={toggleMute}
                >
                  {muted ? 'Silenciado' : speaking ? 'Anunciando…' : 'Audio activo'}
                </Button>
                <Button variant="default" leftSection={<IconRepeat size={16} />} onClick={repeat} disabled={muted}>
                  Repetir último
                </Button>
              </>
            )}
            <UserMenu compact />
          </Group>
        </Group>
      </Paper>

      {supported && !enabled && (
        <Button fullWidth size="lg" mb="md" leftSection={<IconVolume size={20} />} onClick={enable}>
          Toca aquí para activar los anuncios de voz
        </Button>
      )}
      {!supported && (
        <Alert color="yellow" mb="md">
          Este navegador no soporta anuncios de voz. Los avisos visuales siguen activos.
        </Alert>
      )}
      {error && (
        <Alert color="red" mb="md">
          {error} · se seguirá intentando cada 5 segundos.
        </Alert>
      )}
      {banner && (
        <Alert color="brand" variant="filled" icon={<IconBell size={20} />} mb="md" fz="lg" role="alert">
          {banner}
        </Alert>
      )}

      {/* ---------------- Tablero ---------------- */}
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {COLUMNS.map((col) => {
          const list = byStatus(col.status);
          return (
            <Paper key={col.status} withBorder p="sm" style={{ borderTop: `4px solid var(--mantine-color-${col.color}-6)` }}>
              <Group justify="space-between" mb="sm" px={4}>
                <Title order={4}>{col.title}</Title>
                <Badge color={col.color} size="lg" circle>
                  {list.length}
                </Badge>
              </Group>
              <ScrollArea.Autosize mah="calc(100vh - 230px)">
                <Stack gap="sm">
                  {list.length === 0 && (
                    <Text c="dimmed" ta="center" py="xl">
                      Sin pedidos
                    </Text>
                  )}
                  {list.map((order) => {
                    const minutes = Math.max(0, Math.floor((now - new Date(order.createdAt)) / 60000));
                    const isNew = highlighted.has(order.id);
                    return (
                      <Card
                        key={order.id}
                        padding="md"
                        style={isNew ? { outline: '3px solid var(--mantine-color-brand-5)', animation: 'none' } : undefined}
                      >
                        <Group justify="space-between" mb={6}>
                          <Text fw={800} fz={26} lh={1}>
                            #{order.orderNumber}
                          </Text>
                          <Badge color={minutes >= LATE_MINUTES ? 'red' : 'gray'} variant="light" size="lg">
                            {minutes} min
                          </Badge>
                        </Group>
                        <Group gap={6} mb="xs">
                          <Badge variant="outline" color="gray" size="sm">
                            {ORDER_SOURCE[order.source]}
                          </Badge>
                          {order.type !== 'EN_LOCAL' && (
                            <Badge variant="outline" color="violet" size="sm">
                              {ORDER_TYPE[order.type]}
                            </Badge>
                          )}
                          {isNew && (
                            <Badge color="brand" size="sm" variant="filled">
                              Nuevo
                            </Badge>
                          )}
                        </Group>
                        {order.customer && (
                          <Text size="sm" c="dimmed" mb={4}>
                            {order.customer.name}
                          </Text>
                        )}
                        <Stack gap={4}>
                          {order.items.map((item, index) => (
                            <div key={index}>
                              <Text fz="lg">
                                <strong>{item.quantity}×</strong> {item.productName}
                              </Text>
                              {item.notes && (
                                <Group gap={4} c="orange.8">
                                  <IconAlertTriangle size={14} />
                                  <Text size="sm" fw={600}>
                                    {item.notes}
                                  </Text>
                                </Group>
                              )}
                            </div>
                          ))}
                        </Stack>
                        {col.action && order.availableStatuses.includes(col.action) && (
                          <Button
                            fullWidth
                            mt="md"
                            size="md"
                            color={col.action === 'LISTO' ? 'green' : 'brand'}
                            onClick={() => advance(order, col.action)}
                            loading={busyId === order.id}
                          >
                            {col.actionLabel}
                          </Button>
                        )}
                        {order.status === 'LISTO' && (
                          <Text size="sm" c="dimmed" mt="sm" ta="center">
                            {order.type === 'DOMICILIO' ? 'Esperando domiciliario' : 'Esperando entrega'}
                          </Text>
                        )}
                      </Card>
                    );
                  })}
                </Stack>
              </ScrollArea.Autosize>
            </Paper>
          );
        })}
      </SimpleGrid>
    </Box>
  );
}

/** Hora actual que se actualiza cada `interval` ms (para los minutos de espera). */
function useNow(interval) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
}
