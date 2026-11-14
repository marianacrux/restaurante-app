import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
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
  Title,
  Tooltip,
} from '@mantine/core';
import { IconAlertCircle, IconArrowDown, IconArrowUp, IconDeviceFloppy, IconEdit, IconExternalLink, IconPlus, IconTrash } from '@tabler/icons-react';
import {
  fetchProducts,
  fetchPromotions,
  fetchScreenConfig,
  fetchScreens,
  saveScreenContent,
} from '../../services/screens.service.js';
import { useApi } from '../../hooks/useApi.js';
import ImageInput from '../../components/ImageInput.jsx';
import { Image, Modal, Textarea } from '@mantine/core';
import PageHeader from '../../components/PageHeader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { notifyError, notifySuccess } from '../../utils/notify.js';
import { getErrorMessage } from '../../services/api.js';
import { formatMoney } from '../../utils/format.js';

const TYPE = {
  PRODUCTO: { label: 'Producto', color: 'blue' },
  PROMOCION: { label: 'Promoción', color: 'brand' },
  ANUNCIO: { label: 'Anuncio', color: 'violet' },
};

/** Convierte un contenido guardado en una fila editable. */
const toDraft = (c) => ({
  key: crypto.randomUUID(),
  contentType: c.contentType,
  productId: c.productId,
  promotionId: c.promotionId,
  title: c.title ?? '',
  description: c.description ?? '',
  imageUrl: c.imageUrl ?? null, // imagen propia del elemento (si no hay, se usa la del producto/promoción)
  active: c.active,
});

const loadCatalog = () =>
  Promise.all([fetchScreens(), fetchProducts(), fetchPromotions()]).then(([screens, products, promotions]) => ({ screens, products, promotions }));

export default function ScreensAdminPage() {
  const { data: catalog, error: catalogError } = useApi(loadCatalog, { topics: ['products', 'promotions'] });

  const [number, setNumber] = useState('1');
  const [name, setName] = useState('');
  const [items, setItems] = useState(null); // filas editables de la pantalla elegida
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [screenActive, setScreenActive] = useState(true);
  const [editingItem, setEditingItem] = useState(null); // elemento abierto en la ventana de edición
  const [previewKey, setPreviewKey] = useState(0); // para recargar la vista previa al guardar
  const [toAdd, setToAdd] = useState({ productId: null, promotionId: null, title: '', description: '', imageUrl: null });
  const [saving, setSaving] = useState(false);

  // Cada vez que se elige otra pantalla: su configuración
  useEffect(() => {
    let ignore = false;
    fetchScreenConfig(number)
      .then((config) => {
        if (ignore) return;
        setName(config.name);
        setScreenActive(config.active);
        setItems(config.contents.map(toDraft));
        setDirty(false);
        setError('');
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, [number]);

  const productById = new Map((catalog?.products ?? []).map((p) => [p.id, p]));
  const promotionById = new Map((catalog?.promotions ?? []).map((p) => [p.id, p]));

  function describe(item) {
    if (item.contentType === 'PRODUCTO') {
      const p = productById.get(item.productId);
      if (!p) return { title: 'Producto retirado', warning: true };
      return { title: p.name, detail: formatMoney(p.price), warning: !p.available && 'Agotado' };
    }
    if (item.contentType === 'PROMOCION') {
      const p = promotionById.get(item.promotionId);
      if (!p) return { title: 'Promoción eliminada', warning: true };
      return { title: p.name, detail: p.finalPrice ? formatMoney(p.finalPrice) : p.description, warning: !p.live && 'No vigente' };
    }
    return { title: item.title, detail: item.description };
  }

  // ---------- edición local (nada se guarda hasta pulsar "Guardar")
  const edit = (fn) => {
    setItems(fn);
    setDirty(true);
  };
  const update = (key, changes) => edit((list) => list.map((i) => (i.key === key ? { ...i, ...changes } : i)));
  const remove = (key) => edit((list) => list.filter((i) => i.key !== key));
  const move = (index, delta) =>
    edit((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });
  function add(contentType) {
    const base = { key: crypto.randomUUID(), contentType, productId: null, promotionId: null, title: '', description: '', imageUrl: null, active: true };
    if (contentType === 'PRODUCTO') base.productId = Number(toAdd.productId);
    if (contentType === 'PROMOCION') base.promotionId = Number(toAdd.promotionId);
    if (contentType === 'ANUNCIO') Object.assign(base, { title: toAdd.title.trim(), description: toAdd.description.trim(), imageUrl: toAdd.imageUrl });
    edit((list) => [...list, base]);
    setToAdd({ productId: null, promotionId: null, title: '', description: '', imageUrl: null });
  }

  async function save() {
    setSaving(true);
    try {
      const config = await saveScreenContent(number, {
        name,
        active: screenActive,
        items: items.map((i) => ({
          contentType: i.contentType,
          productId: i.productId,
          promotionId: i.promotionId,
          title: i.title || null,
          description: i.description || null,
          imageUrl: i.imageUrl || null,
          active: i.active,
        })),
      });
      setItems(config.contents.map(toDraft));
      setDirty(false);
      setPreviewKey((k) => k + 1);
      notifySuccess('Los televisores lo mostrarán en menos de 30 segundos.', `Pantalla ${number} guardada`);
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  }

  function changeScreen(value) {
    if (dirty && !window.confirm('Tienes cambios sin guardar en esta pantalla. ¿Descartarlos?')) return;
    setItems(null);
    setNumber(value);
  }

  return (
    <>
      <PageHeader title="Pantallas" subtitle="Contenido de los televisores del restaurante">
        <Button component="a" href={`/pantalla/${number}`} target="_blank" rel="noreferrer" variant="default" leftSection={<IconExternalLink size={16} />}>
          Abrir pantalla {number}
        </Button>
        <Button leftSection={<IconDeviceFloppy size={16} />} onClick={save} loading={saving} disabled={!dirty || !items || name.trim().length < 2}>
          Guardar cambios
        </Button>
      </PageHeader>

      {(error || catalogError) && (
        <Alert color="red" icon={<IconAlertCircle size={18} />} mb="md">
          {error || catalogError}
        </Alert>
      )}

      {catalog && (
        <SegmentedControl
          fullWidth
          mb="md"
          value={number}
          onChange={changeScreen}
          data={catalog.screens.map((s) => ({ value: String(s.screenNumber), label: `${s.screenNumber}. ${s.name}` }))}
        />
      )}

      {!items && !error && <Skeleton h={300} radius="lg" />}

      {items && (
        <Stack gap="md">
          <Paper withBorder p="md">
            <Group justify="space-between" align="flex-end" mb="md">
              <TextInput
                label="Nombre de la pantalla"
                value={name}
                maxLength={80}
                onChange={(e) => {
                  setName(e.currentTarget.value);
                  setDirty(true);
                }}
                w={320}
              />
              <Switch
                label={screenActive ? 'Pantalla encendida' : 'Pantalla en pausa'}
                checked={screenActive}
                onChange={(e) => {
                  setScreenActive(e.currentTarget.checked);
                  setDirty(true);
                }}
              />
              {dirty && (
                <Badge color="yellow" size="lg" variant="light">
                  Cambios sin guardar
                </Badge>
              )}
            </Group>

            {items.length === 0 ? (
              <EmptyState title="Esta pantalla no tiene contenido" description="Agrega productos, promociones o anuncios abajo." />
            ) : (
              <Table.ScrollContainer minWidth={640}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={40}>#</Table.Th>
                      <Table.Th w={120}>Tipo</Table.Th>
                      <Table.Th>Contenido</Table.Th>
                      <Table.Th w={90}>Visible</Table.Th>
                      <Table.Th w={130} />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {items.map((item, index) => {
                      const info = describe(item);
                      return (
                        <Table.Tr key={item.key} opacity={item.active ? 1 : 0.5}>
                          <Table.Td c="dimmed">{index + 1}</Table.Td>
                          <Table.Td>
                            <Badge color={TYPE[item.contentType].color}>{TYPE[item.contentType].label}</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Text fw={600} size="sm">
                                {info.title}
                              </Text>
                              {info.warning && (
                                <Badge color="red" size="xs">
                                  {info.warning === true ? 'Revisar' : info.warning}
                                </Badge>
                              )}
                            </Group>
                            {info.detail && (
                              <Text size="xs" c="dimmed">
                                {info.detail}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Switch checked={item.active} onChange={(e) => update(item.key, { active: e.currentTarget.checked })} aria-label="Visible" />
                          </Table.Td>
                          <Table.Td>
                            <Group gap={4} wrap="nowrap">
                              <Tooltip label="Subir">
                                <ActionIcon variant="subtle" color="gray" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Subir">
                                  <IconArrowUp size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Bajar">
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  disabled={index === items.length - 1}
                                  onClick={() => move(index, 1)}
                                  aria-label="Bajar"
                                >
                                  <IconArrowDown size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Editar textos e imagen">
                                <ActionIcon variant="subtle" onClick={() => setEditingItem(item)} aria-label="Editar">
                                  <IconEdit size={16} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Quitar">
                                <ActionIcon variant="subtle" color="red" onClick={() => remove(item.key)} aria-label="Quitar">
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Paper>

          {catalog && (
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
              <Card padding="lg">
                <Title order={5}>Agregar producto</Title>
                <Text size="sm" c="dimmed" mb="sm">
                  El precio y si está agotado se leen en vivo del catálogo.
                </Text>
                <Select
                  placeholder="Buscar producto…"
                  searchable
                  data={catalog.products.map((p) => ({ value: String(p.id), label: `${p.name} · ${formatMoney(p.price)}` }))}
                  value={toAdd.productId}
                  onChange={(v) => setToAdd({ ...toAdd, productId: v })}
                  nothingFoundMessage="Sin resultados"
                />
                <Button mt="sm" variant="light" leftSection={<IconPlus size={16} />} disabled={!toAdd.productId} onClick={() => add('PRODUCTO')}>
                  Agregar
                </Button>
              </Card>

              <Card padding="lg">
                <Title order={5}>Agregar promoción</Title>
                <Text size="sm" c="dimmed" mb="sm">
                  Las vencidas no se muestran en el televisor.
                </Text>
                <Select
                  placeholder="Elegir promoción…"
                  data={catalog.promotions.map((p) => ({ value: String(p.id), label: `${p.name}${p.live ? '' : ' (no vigente)'}` }))}
                  value={toAdd.promotionId}
                  onChange={(v) => setToAdd({ ...toAdd, promotionId: v })}
                />
                <Button mt="sm" variant="light" leftSection={<IconPlus size={16} />} disabled={!toAdd.promotionId} onClick={() => add('PROMOCION')}>
                  Agregar
                </Button>
              </Card>

              <Card padding="lg">
                <Title order={5} mb="sm">
                  Agregar anuncio
                </Title>
                <Stack gap="xs">
                  <TextInput placeholder="Título (obligatorio)" maxLength={120} value={toAdd.title} onChange={(e) => setToAdd({ ...toAdd, title: e.currentTarget.value })} />
                  <TextInput
                    placeholder="Texto (opcional)"
                    maxLength={300}
                    value={toAdd.description}
                    onChange={(e) => setToAdd({ ...toAdd, description: e.currentTarget.value })}
                  />
                </Stack>
                <ImageInput label="Imagen (opcional)" value={toAdd.imageUrl} onChange={(url) => setToAdd({ ...toAdd, imageUrl: url })} />
                <Button mt="sm" variant="light" leftSection={<IconPlus size={16} />} disabled={!toAdd.title.trim()} onClick={() => add('ANUNCIO')}>
                  Agregar
                </Button>
              </Card>
            </SimpleGrid>
          )}

          <Paper withBorder p="md">
            <Group justify="space-between" mb="sm">
              <Title order={5}>Vista previa de la pantalla {number}</Title>
              <Text size="xs" c="dimmed">
                Muestra lo guardado; los televisores se actualizan al instante al guardar
              </Text>
            </Group>
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
              <iframe
                key={`${number}-${previewKey}`}
                title={`Vista previa pantalla ${number}`}
                src={`/pantalla/${number}`}
                style={{ position: 'absolute', inset: 0, width: '200%', height: '200%', transform: 'scale(0.5)', transformOrigin: '0 0', border: 0 }}
              />
            </div>
          </Paper>
        </Stack>
      )}

      {editingItem && (
        <ItemModal
          item={editingItem}
          info={describe(editingItem)}
          onClose={() => setEditingItem(null)}
          onSave={(changes) => {
            update(editingItem.key, changes);
            setEditingItem(null);
          }}
        />
      )}
    </>
  );
}

/** Personalizar un elemento: título, texto e imagen propios (si se dejan vacíos, se usan los del producto). */
function ItemModal({ item, info, onClose, onSave }) {
  const [form, setForm] = useState({ title: item.title, description: item.description, imageUrl: item.imageUrl });
  const isAd = item.contentType === 'ANUNCIO';
  return (
    <Modal opened onClose={onClose} title={isAd ? 'Editar anuncio' : `Personalizar: ${info.title}`}>
      <Stack>
        {!isAd && (
          <Text size="sm" c="dimmed">
            Deje un campo vacío para usar el dato del catálogo. El precio y la disponibilidad siempre se leen en vivo.
          </Text>
        )}
        <TextInput label="Título" placeholder={isAd ? 'Obligatorio' : info.title} maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.currentTarget.value })} />
        <Textarea label="Texto" autosize minRows={2} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />
        <ImageInput label="Imagen" value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
        {!form.imageUrl && !isAd && <Text size="xs" c="dimmed">Sin imagen propia: se mostrará la foto del producto o de la promoción.</Text>}
        {form.imageUrl && <Image src={form.imageUrl} h={120} fit="contain" radius="md" alt="" />}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={isAd && !form.title.trim()} onClick={() => onSave({ title: form.title.trim(), description: form.description.trim(), imageUrl: form.imageUrl })}>
            Aplicar (luego pulse “Guardar cambios”)
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
