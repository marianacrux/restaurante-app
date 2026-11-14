import { useCallback, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Checkbox,
  Group,
  Menu,
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
  Tabs,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconAlertCircle, IconCategory, IconDotsVertical, IconEdit, IconPlus, IconSearch, IconToolsKitchen, IconTrash } from '@tabler/icons-react';
import {
  createCategory,
  createProduct,
  deactivateProduct,
  fetchCategories,
  fetchProducts,
  setProductAvailability,
  updateCategory,
  updateProduct,
} from '../../services/catalog.service.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.js';
import { can } from '../../auth/access.js';
import PageHeader from '../../components/PageHeader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ImageInput from '../../components/ImageInput.jsx';
import { notifyError, notifySuccess } from '../../utils/notify.js';
import { formatMoney } from '../../utils/format.js';

const EMPTY_PRODUCT = { name: '', description: '', price: '', categoryId: null, imageUrl: null, available: true, isDailyMenu: false, isFeatured: false };

export default function ProductsPage() {
  const { user } = useAuth();
  const isAdmin = can(user, 'products.manage');
  const load = useCallback(
    () =>
      Promise.all([fetchProducts({ includeInactive: isAdmin }), fetchCategories({ includeInactive: isAdmin })]).then(([products, categories]) => ({
        products,
        categories,
      })),
    [isAdmin],
  );
  const { data, error, loading, reload } = useApi(load, { topics: ['products'], interval: 60000 });

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [view, setView] = useState('active');
  const [editing, setEditing] = useState(null); // producto en el formulario ({} = nuevo)
  const [editingCategory, setEditingCategory] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const term = search.trim().toLowerCase();
  const products = (data?.products ?? []).filter(
    (p) =>
      (view === 'all' || (view === 'active' ? p.active : !p.active)) &&
      (!categoryFilter || String(p.categoryId) === categoryFilter) &&
      (!term || p.name.toLowerCase().includes(term)),
  );
  const categoryOptions = (data?.categories ?? []).map((c) => ({ value: String(c.id), label: c.name + (c.active ? '' : ' (inactiva)') }));

  async function toggleAvailable(product) {
    setBusyId(product.id);
    try {
      await setProductAvailability(product.id, !product.available);
      notifySuccess(`${product.name}: ${product.available ? 'marcado agotado' : 'disponible otra vez'}`);
    } catch (err) {
      notifyError(err);
    } finally {
      setBusyId(null);
      reload();
    }
  }

  async function quickUpdate(product, changes, message) {
    setBusyId(product.id);
    try {
      await (changes.active === false ? deactivateProduct(product.id) : updateProduct(product.id, changes));
      notifySuccess(message);
    } catch (err) {
      notifyError(err);
    } finally {
      setBusyId(null);
      reload();
    }
  }

  return (
    <>
      <PageHeader title="Productos y menú" subtitle="Lo que cambies aquí se refleja al instante en pedidos, WhatsApp y pantallas">
        {isAdmin && (
          <>
            <Button variant="default" leftSection={<IconCategory size={16} />} onClick={() => setEditingCategory({ name: '', description: '', position: 0, active: true })}>
              Nueva categoría
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing({ ...EMPTY_PRODUCT })}>
              Nuevo producto
            </Button>
          </>
        )}
      </PageHeader>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={18} />} mb="md">
          {error}
        </Alert>
      )}
      {loading && <Skeleton h={300} radius="lg" />}

      {data && (
        <Tabs defaultValue="products">
          <Tabs.List mb="md">
            <Tabs.Tab value="products" leftSection={<IconToolsKitchen size={16} />}>
              Productos ({data.products.filter((p) => p.active).length})
            </Tabs.Tab>
            <Tabs.Tab value="categories" leftSection={<IconCategory size={16} />}>
              Categorías ({data.categories.length})
            </Tabs.Tab>
          </Tabs.List>

          {/* ---------------- Productos ---------------- */}
          <Tabs.Panel value="products">
            <Paper withBorder p="md" mb="md">
              <Group grow align="flex-end" wrap="wrap">
                <TextInput label="Buscar" placeholder="Nombre del producto" leftSection={<IconSearch size={16} />} value={search} onChange={(e) => setSearch(e.currentTarget.value)} />
                <Select label="Categoría" placeholder="Todas" data={categoryOptions} value={categoryFilter} onChange={setCategoryFilter} clearable />
                {isAdmin && (
                  <div>
                    <Text size="sm" fw={500} mb={4}>
                      Mostrar
                    </Text>
                    <SegmentedControl
                      fullWidth
                      value={view}
                      onChange={setView}
                      data={[
                        { value: 'active', label: 'En el menú' },
                        { value: 'inactive', label: 'Retirados' },
                        { value: 'all', label: 'Todos' },
                      ]}
                    />
                  </div>
                )}
              </Group>
            </Paper>

            {products.length === 0 ? (
              <EmptyState title="No hay productos con estos filtros" />
            ) : (
              <Paper withBorder>
                <Table.ScrollContainer minWidth={760}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Producto</Table.Th>
                        <Table.Th>Categoría</Table.Th>
                        <Table.Th ta="right">Precio</Table.Th>
                        <Table.Th>Etiquetas</Table.Th>
                        <Table.Th>Disponible</Table.Th>
                        {isAdmin && <Table.Th />}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {products.map((p) => (
                        <Table.Tr key={p.id} opacity={p.active ? 1 : 0.55}>
                          <Table.Td>
                            <Group gap="sm" wrap="nowrap">
                              <Avatar src={p.imageUrl} radius="md" size={44} color="brand">
                                <IconToolsKitchen size={20} />
                              </Avatar>
                              <div>
                                <Text fw={600} size="sm">
                                  {p.name}
                                </Text>
                                {p.description && (
                                  <Text size="xs" c="dimmed" lineClamp={1} maw={280}>
                                    {p.description}
                                  </Text>
                                )}
                              </div>
                            </Group>
                          </Table.Td>
                          <Table.Td>{p.category.name}</Table.Td>
                          <Table.Td ta="right" fw={600} className="tabular">
                            {formatMoney(p.price)}
                          </Table.Td>
                          <Table.Td>
                            <Group gap={4}>
                              {p.isDailyMenu && <Badge color="brand">Menú del día</Badge>}
                              {p.isFeatured && <Badge color="violet">Destacado</Badge>}
                              {!p.active && <Badge color="gray">Retirado</Badge>}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Switch
                              checked={p.available}
                              onChange={() => toggleAvailable(p)}
                              disabled={!p.active || busyId === p.id || !can(user, 'products.setAvailability')}
                              label={p.available ? 'Sí' : 'Agotado'}
                              color="green"
                            />
                          </Table.Td>
                          {isAdmin && (
                            <Table.Td>
                              <Group gap={4} wrap="nowrap">
                                <ActionIcon variant="subtle" onClick={() => setEditing({ ...p, categoryId: String(p.categoryId), price: Number(p.price) })} aria-label={`Editar ${p.name}`}>
                                  <IconEdit size={18} />
                                </ActionIcon>
                                <Menu position="bottom-end">
                                  <Menu.Target>
                                    <ActionIcon variant="subtle" color="gray" aria-label="Más acciones">
                                      <IconDotsVertical size={18} />
                                    </ActionIcon>
                                  </Menu.Target>
                                  <Menu.Dropdown>
                                    <Menu.Item onClick={() => quickUpdate(p, { isDailyMenu: !p.isDailyMenu }, `${p.name}: menú del día actualizado`)}>
                                      {p.isDailyMenu ? 'Quitar del menú del día' : 'Agregar al menú del día'}
                                    </Menu.Item>
                                    <Menu.Item onClick={() => quickUpdate(p, { isFeatured: !p.isFeatured }, `${p.name}: destacado actualizado`)}>
                                      {p.isFeatured ? 'Quitar de destacados' : 'Marcar como destacado'}
                                    </Menu.Item>
                                    <Menu.Divider />
                                    {p.active ? (
                                      <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => quickUpdate(p, { active: false }, `${p.name} retirado del menú`)}>
                                        Retirar del menú
                                      </Menu.Item>
                                    ) : (
                                      <Menu.Item onClick={() => quickUpdate(p, { active: true }, `${p.name} volvió al menú`)}>Volver a publicar</Menu.Item>
                                    )}
                                  </Menu.Dropdown>
                                </Menu>
                              </Group>
                            </Table.Td>
                          )}
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Paper>
            )}
          </Tabs.Panel>

          {/* ---------------- Categorías ---------------- */}
          <Tabs.Panel value="categories">
            <Paper withBorder>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Orden</Table.Th>
                    <Table.Th>Categoría</Table.Th>
                    <Table.Th>Productos</Table.Th>
                    <Table.Th>Estado</Table.Th>
                    {isAdmin && <Table.Th />}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.categories.map((c) => (
                    <Table.Tr key={c.id}>
                      <Table.Td>{c.position}</Table.Td>
                      <Table.Td>
                        <Text fw={600} size="sm">
                          {c.name}
                        </Text>
                        {c.description && (
                          <Text size="xs" c="dimmed">
                            {c.description}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>{data.products.filter((p) => p.categoryId === c.id && p.active).length}</Table.Td>
                      <Table.Td>{c.active ? <Badge color="green">Activa</Badge> : <Badge color="gray">Inactiva</Badge>}</Table.Td>
                      {isAdmin && (
                        <Table.Td>
                          <ActionIcon variant="subtle" onClick={() => setEditingCategory({ ...c })} aria-label={`Editar ${c.name}`}>
                            <IconEdit size={18} />
                          </ActionIcon>
                        </Table.Td>
                      )}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      )}

      <ProductModal product={editing} categories={categoryOptions} onClose={() => setEditing(null)} onSaved={reload} />
      <CategoryModal category={editingCategory} onClose={() => setEditingCategory(null)} onSaved={reload} />
    </>
  );
}

/** Formulario de producto (crear o editar). */
function ProductModal({ product, categories, onClose, onSaved }) {
  const [form, setForm] = useState(product);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [lastProduct, setLastProduct] = useState(product);

  // Al abrir con otro producto, se reinicia el formulario (patrón recomendado por React, sin useEffect)
  if (product !== lastProduct) {
    setLastProduct(product);
    setForm(product);
    setErrors({});
  }
  if (!form) return null;
  const isNew = !form.id;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e) {
    e.preventDefault();
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Mínimo 2 caracteres';
    if (!(Number(form.price) > 0)) found.price = 'El precio debe ser mayor que cero';
    if (!form.categoryId) found.categoryId = 'Seleccione una categoría';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    const body = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      price: Number(form.price),
      categoryId: Number(form.categoryId),
      imageUrl: form.imageUrl || null,
      available: form.available,
      isDailyMenu: form.isDailyMenu,
      isFeatured: form.isFeatured,
    };
    try {
      await (isNew ? createProduct(body) : updateProduct(form.id, body));
      notifySuccess(`${body.name} ${isNew ? 'creado' : 'actualizado'}`);
      onSaved();
      onClose();
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal opened onClose={onClose} title={isNew ? 'Nuevo producto' : `Editar: ${product.name}`} size="lg">
      <form onSubmit={submit}>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Nombre" required value={form.name} onChange={(e) => set('name')(e.currentTarget.value)} error={errors.name} data-autofocus />
            <Select label="Categoría" required data={categories} value={form.categoryId} onChange={set('categoryId')} error={errors.categoryId} />
          </SimpleGrid>
          <Textarea label="Descripción" autosize minRows={2} maxLength={500} value={form.description ?? ''} onChange={(e) => set('description')(e.currentTarget.value)} />
          <NumberInput
            label="Precio"
            required
            min={0}
            prefix="$ "
            thousandSeparator="."
            decimalSeparator=","
            decimalScale={2}
            value={form.price}
            onChange={set('price')}
            error={errors.price}
          />
          <ImageInput label="Fotografía" value={form.imageUrl} onChange={set('imageUrl')} />
          <Group>
            <Checkbox label="Disponible" checked={form.available} onChange={(e) => set('available')(e.currentTarget.checked)} />
            <Checkbox label="Menú del día" checked={form.isDailyMenu} onChange={(e) => set('isDailyMenu')(e.currentTarget.checked)} />
            <Checkbox label="Destacado" checked={form.isFeatured} onChange={(e) => set('isFeatured')(e.currentTarget.checked)} />
          </Group>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {isNew ? 'Crear producto' : 'Guardar cambios'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

/** Formulario de categoría (crear o editar). */
function CategoryModal({ category, onClose, onSaved }) {
  const [form, setForm] = useState(category);
  const [last, setLast] = useState(category);
  const [saving, setSaving] = useState(false);
  if (category !== last) {
    setLast(category);
    setForm(category);
  }
  if (!form) return null;
  const isNew = !form.id;

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const body = { name: form.name.trim(), description: form.description?.trim() || null, position: Number(form.position) || 0, active: form.active };
    try {
      await (isNew ? createCategory(body) : updateCategory(form.id, body));
      notifySuccess(`Categoría ${body.name} ${isNew ? 'creada' : 'actualizada'}`);
      onSaved();
      onClose();
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal opened onClose={onClose} title={isNew ? 'Nueva categoría' : `Editar: ${category.name}`}>
      <form onSubmit={submit}>
        <Stack>
          <TextInput label="Nombre" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} data-autofocus />
          <TextInput label="Descripción" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />
          <NumberInput label="Orden en el menú" description="Las categorías se muestran de menor a mayor" min={0} value={form.position} onChange={(v) => setForm({ ...form, position: v })} />
          <Switch label="Activa (si se desactiva, sus productos salen del menú)" checked={form.active} onChange={(e) => setForm({ ...form, active: e.currentTarget.checked })} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving} disabled={form.name.trim().length < 2}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
