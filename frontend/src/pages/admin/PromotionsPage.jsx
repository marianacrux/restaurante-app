import { useState } from 'react';
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconAlertCircle, IconDiscount2, IconEdit, IconPlus } from '@tabler/icons-react';
import { createPromotion, updatePromotion } from '../../services/admin.service.js';
import { fetchProducts, fetchPromotions } from '../../services/screens.service.js';
import { useApi } from '../../hooks/useApi.js';
import PageHeader from '../../components/PageHeader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ImageInput from '../../components/ImageInput.jsx';
import { notifyError, notifySuccess } from '../../utils/notify.js';
import { formatMoney } from '../../utils/format.js';

const loadAll = () => Promise.all([fetchPromotions(), fetchProducts()]).then(([promotions, products]) => ({ promotions, products }));

/** 'AAAA-MM-DDTHH:mm' en hora local para <input type="datetime-local"> */
const toLocalInput = (date) => {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fmt = (iso) => new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' });

export default function PromotionsPage() {
  const { data, error, loading, reload } = useApi(loadAll, { topics: ['promotions', 'products'] });
  const [editing, setEditing] = useState(null);

  function openNew() {
    setEditing({
      name: '',
      description: '',
      discountType: 'PORCENTAJE',
      discountValue: 10,
      productId: null,
      imageUrl: null,
      startDate: toLocalInput(new Date()),
      endDate: toLocalInput(Date.now() + 7 * 86400000),
      active: true,
    });
  }

  return (
    <>
      <PageHeader title="Promociones y combos" subtitle="Las promociones vigentes aparecen en la pantalla 2 y en las que las incluyan">
        <Button leftSection={<IconPlus size={16} />} onClick={openNew}>
          Nueva promoción
        </Button>
      </PageHeader>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={18} />} mb="md">
          {error}
        </Alert>
      )}
      {loading && <Skeleton h={300} radius="lg" />}

      {data && data.promotions.length === 0 && <EmptyState title="No hay promociones" icon={IconDiscount2} />}

      {data && data.promotions.length > 0 && (
        <Paper withBorder>
          <Table.ScrollContainer minWidth={760}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Promoción</Table.Th>
                  <Table.Th>Descuento</Table.Th>
                  <Table.Th>Producto</Table.Th>
                  <Table.Th>Vigencia</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.promotions.map((p) => (
                  <Table.Tr key={p.id} opacity={p.active ? 1 : 0.55}>
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Avatar src={p.imageUrl} radius="md" color="brand">
                          <IconDiscount2 size={20} />
                        </Avatar>
                        <div>
                          <Text fw={600} size="sm">
                            {p.name}
                          </Text>
                          <Text size="xs" c="dimmed" lineClamp={1} maw={260}>
                            {p.description}
                          </Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td fw={700}>{p.discountType === 'PORCENTAJE' ? `${Number(p.discountValue)} %` : formatMoney(p.discountValue)}</Table.Td>
                    <Table.Td>
                      {p.product ? (
                        <>
                          <Text size="sm">{p.product.name}</Text>
                          <Text size="xs" c="dimmed">
                            <s>{formatMoney(p.product.price)}</s> → <strong>{formatMoney(p.finalPrice)}</strong>
                          </Text>
                        </>
                      ) : (
                        <Text size="sm" c="dimmed">
                          General
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">Desde {fmt(p.startDate)}</Text>
                      <Text size="xs">Hasta {fmt(p.endDate)}</Text>
                    </Table.Td>
                    <Table.Td>
                      {p.live ? <Badge color="green">Vigente</Badge> : p.active ? <Badge color="yellow">Fuera de fechas</Badge> : <Badge color="gray">Inactiva</Badge>}
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        aria-label={`Editar ${p.name}`}
                        onClick={() =>
                          setEditing({ ...p, productId: p.productId ? String(p.productId) : null, discountValue: Number(p.discountValue), startDate: toLocalInput(p.startDate), endDate: toLocalInput(p.endDate) })
                        }
                      >
                        <IconEdit size={18} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      )}

      {editing && data && <PromotionModal promotion={editing} products={data.products} onClose={() => setEditing(null)} onSaved={reload} />}
    </>
  );
}

function PromotionModal({ promotion, products, onClose, onSaved }) {
  const [form, setForm] = useState(promotion);
  const [saving, setSaving] = useState(false);
  const isNew = !promotion.id;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const product = products.find((p) => String(p.id) === form.productId);
  const preview = product
    ? Math.max(0, form.discountType === 'PORCENTAJE' ? (Number(product.price) * (100 - (form.discountValue || 0))) / 100 : Number(product.price) - (form.discountValue || 0))
    : null;

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const body = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      productId: form.productId ? Number(form.productId) : null,
      imageUrl: form.imageUrl || null,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      active: form.active,
    };
    try {
      await (isNew ? createPromotion(body) : updatePromotion(promotion.id, body));
      notifySuccess(`Promoción ${isNew ? 'creada' : 'actualizada'}`);
      onSaved();
      onClose();
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal opened onClose={onClose} title={isNew ? 'Nueva promoción' : `Editar: ${promotion.name}`} size="lg">
      <form onSubmit={submit}>
        <Stack>
          <TextInput label="Nombre" required value={form.name} onChange={(e) => set('name')(e.currentTarget.value)} data-autofocus />
          <Textarea label="Descripción" autosize minRows={2} value={form.description ?? ''} onChange={(e) => set('description')(e.currentTarget.value)} />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <div>
              <Text size="sm" fw={500} mb={4}>
                Tipo de descuento
              </Text>
              <SegmentedControl
                fullWidth
                value={form.discountType}
                onChange={set('discountType')}
                data={[
                  { value: 'PORCENTAJE', label: 'Porcentaje' },
                  { value: 'VALOR_FIJO', label: 'Valor fijo' },
                ]}
              />
            </div>
            <NumberInput
              label="Descuento"
              required
              min={1}
              max={form.discountType === 'PORCENTAJE' ? 100 : undefined}
              suffix={form.discountType === 'PORCENTAJE' ? ' %' : undefined}
              prefix={form.discountType === 'VALOR_FIJO' ? '$ ' : undefined}
              thousandSeparator="."
              decimalSeparator=","
              value={form.discountValue}
              onChange={set('discountValue')}
            />
          </SimpleGrid>
          <Select
            label="Producto (opcional)"
            description={preview !== null ? `Precio con descuento: ${formatMoney(preview)}` : 'Sin producto: promoción general (p. ej. “martes de hamburguesa”)'}
            searchable
            clearable
            data={products.map((p) => ({ value: String(p.id), label: `${p.name} · ${formatMoney(p.price)}` }))}
            value={form.productId}
            onChange={set('productId')}
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Desde" type="datetime-local" required value={form.startDate} onChange={(e) => set('startDate')(e.currentTarget.value)} />
            <TextInput label="Hasta" type="datetime-local" required value={form.endDate} onChange={(e) => set('endDate')(e.currentTarget.value)} />
          </SimpleGrid>
          <ImageInput label="Imagen (opcional)" value={form.imageUrl} onChange={set('imageUrl')} />
          <Switch label="Activa" checked={form.active} onChange={(e) => set('active')(e.currentTarget.checked)} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {isNew ? 'Crear promoción' : 'Guardar'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
