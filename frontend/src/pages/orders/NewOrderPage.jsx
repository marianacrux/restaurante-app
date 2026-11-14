import { useCallback, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Image,
  NumberInput,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { IconAlertCircle, IconMessage2, IconMinus, IconPlus, IconSearch, IconShoppingCart, IconToolsKitchen, IconTrash } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { fetchCategories, fetchProducts } from '../../services/catalog.service.js';
import { fetchSettings } from '../../services/admin.service.js';
import { createOrder } from '../../services/orders.service.js';
import { useApi } from '../../hooks/useApi.js';
import PageHeader from '../../components/PageHeader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { notifyError } from '../../utils/notify.js';
import { notifications } from '@mantine/notifications';
import { ORDER_SOURCE, ORDER_TYPE, PAYMENT_METHOD, toOptions } from '../../utils/constants.js';
import { formatMoney } from '../../utils/format.js';

const PHONE_RE = /^\d{10}$/;
const EMPTY = { source: 'PUNTO_DE_VENTA', type: 'EN_LOCAL', name: '', phone: '', address: '', paymentMethod: null, notes: '' };

const loadCatalog = () =>
  Promise.all([fetchProducts(), fetchCategories(), fetchSettings()]).then(([products, categories, settings]) => ({ products, categories, settings }));

export default function NewOrderPage() {
  const navigate = useNavigate();
  // El catálogo se actualiza en vivo: si cocina marca algo agotado, se bloquea aquí al instante
  const { data, error, loading } = useApi(loadCatalog, { topics: ['products', 'settings'], interval: 60000 });

  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]); // [{ key, productId, name, price, quantity, notes, showNotes }]
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = useCallback((key) => (value) => setForm((f) => ({ ...f, [key]: value })), []);
  const type = form.source === 'DOMICILIO' ? 'DOMICILIO' : form.type; // el canal DOMICILIO siempre se entrega a domicilio
  const needsCustomer = type === 'DOMICILIO' || form.source === 'WHATSAPP';

  const term = search.trim().toLowerCase();
  const products = (data?.products ?? []).filter(
    (p) => (category === 'ALL' || String(p.categoryId) === category) && (!term || p.name.toLowerCase().includes(term)),
  );
  const byId = new Map((data?.products ?? []).map((p) => [p.id, p]));

  function add(product) {
    setCart((c) => {
      const existing = c.find((l) => l.productId === product.id && !l.notes);
      if (existing) return c.map((l) => (l === existing ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l));
      return [...c, { key: crypto.randomUUID(), productId: product.id, name: product.name, price: Number(product.price), quantity: 1, notes: '' }];
    });
  }
  const updateLine = (key, changes) => setCart((c) => c.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  const removeLine = (key) => setCart((c) => c.filter((l) => l.key !== key));

  // Solo para mostrar: el total real lo calcula el backend con los precios del catálogo
  const subtotal = cart.reduce((s, l) => s + (Number(byId.get(l.productId)?.price ?? l.price) || 0) * l.quantity, 0);
  const deliveryFee = type === 'DOMICILIO' ? (data?.settings.deliveryFee ?? 0) : 0;
  const unavailable = cart.filter((l) => !byId.get(l.productId)?.available);

  async function submit() {
    const found = {};
    if (cart.length === 0) found.cart = 'Agrega al menos un producto';
    if (unavailable.length) found.cart = `Quita los productos agotados: ${unavailable.map((l) => l.name).join(', ')}`;
    const phone = form.phone.replace(/[\s-]/g, '').replace(/^\+?57(?=\d{10}$)/, '');
    if (needsCustomer || form.name || form.phone) {
      if (form.name.trim().length < 2) found.name = 'Escribe el nombre del cliente';
      if (!PHONE_RE.test(phone)) found.phone = 'Celular de 10 dígitos';
    }
    if (type === 'DOMICILIO' && form.address.trim().length < 5) found.address = 'Escribe la dirección completa';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const order = await createOrder({
        source: form.source,
        type,
        customer: form.name.trim() ? { name: form.name.trim(), phone } : null,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, notes: l.notes.trim() || null })),
        paymentMethod: form.paymentMethod,
        deliveryAddress: type === 'DOMICILIO' ? form.address.trim() : null,
        notes: form.notes.trim() || null,
      });
      notifications.show({
        color: 'green',
        title: `Pedido #${order.orderNumber} registrado`,
        message: `Total ${formatMoney(order.total)} · ya está en la pantalla de cocina`,
        autoClose: 6000,
      });
      setCart([]);
      setForm((f) => ({ ...EMPTY, source: f.source }));
    } catch (err) {
      notifyError(err, 'No se pudo registrar el pedido');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Nuevo pedido" subtitle="Registro manual: punto de venta, vitrina, domicilios telefónicos">
        <Button variant="default" onClick={() => navigate('/pedidos')}>
          Ver pedidos
        </Button>
      </PageHeader>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={18} />} mb="md">
          {error}
        </Alert>
      )}
      {loading && <Skeleton h={420} radius="lg" />}

      {data && (
        <Grid gutter="md">
          {/* ---------------- Catálogo ---------------- */}
          <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
            <Paper withBorder p="md">
              <Group mb="md" align="flex-end" wrap="wrap">
                <TextInput
                  style={{ flex: 1, minWidth: 200 }}
                  placeholder="Buscar producto…"
                  leftSection={<IconSearch size={16} />}
                  value={search}
                  onChange={(e) => setSearch(e.currentTarget.value)}
                />
              </Group>
              <ScrollArea type="auto" mb="md">
                <SegmentedControl
                  value={category}
                  onChange={setCategory}
                  data={[{ value: 'ALL', label: 'Todo' }, ...data.categories.map((c) => ({ value: String(c.id), label: c.name }))]}
                />
              </ScrollArea>

              {products.length === 0 ? (
                <EmptyState title="Sin productos" description="Prueba con otra categoría o búsqueda." />
              ) : (
                <SimpleGrid cols={{ base: 2, sm: 3, xl: 4 }} spacing="sm">
                  {products.map((p) => (
                    <UnstyledButton key={p.id} onClick={() => add(p)} disabled={!p.available} aria-label={`Agregar ${p.name}`}>
                      <Card padding="xs" h="100%" style={{ opacity: p.available ? 1 : 0.45, cursor: p.available ? 'pointer' : 'not-allowed' }}>
                        <Card.Section>
                          {p.imageUrl ? (
                            <Image src={p.imageUrl} h={90} alt="" fit="cover" />
                          ) : (
                            <Box h={90} bg="var(--mantine-color-brand-light)" style={{ display: 'grid', placeItems: 'center' }}>
                              <IconToolsKitchen size={30} color="var(--mantine-color-brand-6)" />
                            </Box>
                          )}
                        </Card.Section>
                        <Text fw={600} size="sm" mt={6} lineClamp={2}>
                          {p.name}
                        </Text>
                        <Group justify="space-between" mt={4}>
                          <Text size="sm" c="brand.7" fw={700} className="tabular">
                            {formatMoney(p.price)}
                          </Text>
                          {!p.available && (
                            <Badge color="red" size="xs">
                              Agotado
                            </Badge>
                          )}
                        </Group>
                      </Card>
                    </UnstyledButton>
                  ))}
                </SimpleGrid>
              )}
            </Paper>
          </Grid.Col>

          {/* ---------------- Pedido ---------------- */}
          <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
            <Paper withBorder p="md" style={{ position: 'sticky', top: 76 }}>
              <Group gap="xs" mb="sm">
                <IconShoppingCart size={20} />
                <Title order={4}>Pedido</Title>
                <Badge ml="auto">{cart.reduce((n, l) => n + l.quantity, 0)} productos</Badge>
              </Group>

              <Stack gap="sm">
                <Select label="Canal" data={toOptions(ORDER_SOURCE)} value={form.source} onChange={(v) => set('source')(v ?? 'PUNTO_DE_VENTA')} allowDeselect={false} />
                <div>
                  <Text size="sm" fw={500} mb={4}>
                    Entrega
                  </Text>
                  <SegmentedControl
                    fullWidth
                    value={type}
                    onChange={set('type')}
                    disabled={form.source === 'DOMICILIO'}
                    data={toOptions(ORDER_TYPE)}
                  />
                </div>

                <Group grow>
                  <TextInput
                    label={`Cliente${needsCustomer ? '' : ' (opcional)'}`}
                    placeholder="Nombre"
                    value={form.name}
                    onChange={(e) => set('name')(e.currentTarget.value)}
                    error={errors.name}
                  />
                  <TextInput label="Celular" placeholder="3001234567" inputMode="tel" value={form.phone} onChange={(e) => set('phone')(e.currentTarget.value)} error={errors.phone} />
                </Group>
                {type === 'DOMICILIO' && (
                  <TextInput label="Dirección de entrega" placeholder="Calle 10 # 20-30, barrio Centro" value={form.address} onChange={(e) => set('address')(e.currentTarget.value)} error={errors.address} />
                )}

                <Divider label="Productos" labelPosition="left" />
                {cart.length === 0 ? (
                  <Text c="dimmed" size="sm" ta="center" py="md">
                    Toca un producto para agregarlo
                  </Text>
                ) : (
                  <Stack gap="xs">
                    {cart.map((l) => {
                      const product = byId.get(l.productId);
                      const soldOut = !product?.available;
                      return (
                        <Paper key={l.key} withBorder p="xs" bg={soldOut ? 'var(--mantine-color-red-light)' : undefined}>
                          <Group justify="space-between" wrap="nowrap" gap="xs">
                            <div style={{ minWidth: 0 }}>
                              <Text size="sm" fw={600} truncate>
                                {l.name}
                              </Text>
                              <Text size="xs" c={soldOut ? 'red' : 'dimmed'}>
                                {soldOut ? 'Se agotó: quítalo del pedido' : `${formatMoney(product.price)} c/u`}
                              </Text>
                            </div>
                            <Group gap={4} wrap="nowrap">
                              <ActionIcon variant="default" size="sm" onClick={() => (l.quantity > 1 ? updateLine(l.key, { quantity: l.quantity - 1 }) : removeLine(l.key))} aria-label="Menos">
                                <IconMinus size={12} />
                              </ActionIcon>
                              <NumberInput value={l.quantity} onChange={(v) => updateLine(l.key, { quantity: Math.max(1, Math.min(99, Number(v) || 1)) })} w={50} size="xs" hideControls min={1} max={99} />
                              <ActionIcon variant="default" size="sm" onClick={() => updateLine(l.key, { quantity: Math.min(99, l.quantity + 1) })} aria-label="Más">
                                <IconPlus size={12} />
                              </ActionIcon>
                              <ActionIcon variant="subtle" size="sm" color={l.showNotes || l.notes ? 'brand' : 'gray'} onClick={() => updateLine(l.key, { showNotes: !l.showNotes })} aria-label="Instrucciones">
                                <IconMessage2 size={14} />
                              </ActionIcon>
                              <ActionIcon variant="subtle" size="sm" color="red" onClick={() => removeLine(l.key)} aria-label="Quitar">
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>
                          </Group>
                          {(l.showNotes || l.notes) && (
                            <TextInput mt={6} size="xs" placeholder="Ej.: sin cebolla" maxLength={200} value={l.notes} onChange={(e) => updateLine(l.key, { notes: e.currentTarget.value })} />
                          )}
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
                {errors.cart && (
                  <Text c="red" size="sm">
                    {errors.cart}
                  </Text>
                )}

                <Select label="El cliente pagará con (opcional)" placeholder="Sin definir" data={toOptions(PAYMENT_METHOD)} value={form.paymentMethod} onChange={set('paymentMethod')} clearable />
                <Textarea label="Notas del pedido" placeholder="Opcional" autosize minRows={1} maxLength={500} value={form.notes} onChange={(e) => set('notes')(e.currentTarget.value)} />

                <Paper bg="var(--mantine-color-default-hover)" p="sm">
                  <Group justify="space-between">
                    <Text size="sm">Subtotal</Text>
                    <Text size="sm" className="tabular">
                      {formatMoney(subtotal)}
                    </Text>
                  </Group>
                  {type === 'DOMICILIO' && (
                    <Group justify="space-between">
                      <Text size="sm">Domicilio</Text>
                      <Text size="sm" className="tabular">
                        {formatMoney(deliveryFee)}
                      </Text>
                    </Group>
                  )}
                  <Group justify="space-between" mt={4}>
                    <Text fw={700}>Total</Text>
                    <Text fw={800} fz="xl" className="tabular">
                      {formatMoney(subtotal + deliveryFee)}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    El total definitivo lo calcula el servidor con los precios vigentes.
                  </Text>
                </Paper>

                <Button size="lg" onClick={submit} loading={saving} disabled={cart.length === 0}>
                  Registrar pedido
                </Button>
                {cart.length > 0 && (
                  <Button variant="subtle" color="gray" onClick={() => setCart([])}>
                    Vaciar
                  </Button>
                )}
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      )}
    </>
  );
}
