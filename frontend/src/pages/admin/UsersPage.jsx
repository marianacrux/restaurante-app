import { useState } from 'react';
import { ActionIcon, Alert, Avatar, Badge, Button, Group, Modal, Paper, PasswordInput, Select, Skeleton, Stack, Switch, Table, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconEdit, IconUserPlus } from '@tabler/icons-react';
import { createUser, fetchUsers, updateUser } from '../../services/admin.service.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.js';
import PageHeader from '../../components/PageHeader.jsx';
import { notifyError, notifySuccess } from '../../utils/notify.js';
import { ROLE_COLOR, ROLE_LABEL, toOptions } from '../../utils/constants.js';

const ROLE_HELP = {
  ADMIN: 'Acceso completo: catálogo, usuarios, reportes y configuración.',
  CAJERO: 'Registra pedidos y pagos, despacha domicilios.',
  COCINA: 'Ve la pantalla de cocina y cambia estados de preparación.',
  DOMICILIARIO: 'Solo ve y confirma sus entregas.',
};

export default function UsersPage() {
  const { user: me } = useAuth();
  const { data, error, loading, reload } = useApi(fetchUsers, { topics: ['users'] });
  const [editing, setEditing] = useState(null);

  return (
    <>
      <PageHeader title="Usuarios" subtitle="Cuentas del personal y sus permisos">
        <Button leftSection={<IconUserPlus size={16} />} onClick={() => setEditing({ name: '', email: '', role: 'CAJERO', password: '', active: true })}>
          Nuevo usuario
        </Button>
      </PageHeader>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={18} />} mb="md">
          {error}
        </Alert>
      )}
      {loading && <Skeleton h={300} radius="lg" />}

      {data && (
        <Paper withBorder>
          <Table.ScrollContainer minWidth={640}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Usuario</Table.Th>
                  <Table.Th>Rol</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.map((u) => (
                  <Table.Tr key={u.id} opacity={u.active ? 1 : 0.55}>
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Avatar color={ROLE_COLOR[u.role]} radius="xl">
                          {u.name.slice(0, 2).toUpperCase()}
                        </Avatar>
                        <div>
                          <Text fw={600} size="sm" component="div">
                            {u.name} {u.id === me.id && <Badge size="xs">Tú</Badge>}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {u.email}
                          </Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={ROLE_COLOR[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                      {u.deliveryPerson && (
                        <Text size="xs" c="dimmed">
                          Vinculado a {u.deliveryPerson.name}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>{u.active ? <Badge color="green">Activo</Badge> : <Badge color="gray">Desactivado</Badge>}</Table.Td>
                    <Table.Td>
                      <ActionIcon variant="subtle" onClick={() => setEditing({ ...u, password: '' })} aria-label={`Editar ${u.name}`}>
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

      {editing && <UserModal user={editing} isMe={editing.id === me.id} onClose={() => setEditing(null)} onSaved={reload} />}
    </>
  );
}

function UserModal({ user, isMe, onClose, onSaved }) {
  const [form, setForm] = useState(user);
  const [saving, setSaving] = useState(false);
  const isNew = !user.id;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const body = { name: form.name.trim(), email: form.email.trim(), role: form.role };
    if (!isNew) body.active = form.active;
    if (form.password) body.password = form.password;
    try {
      await (isNew ? createUser(body) : updateUser(user.id, body));
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
    <Modal opened onClose={onClose} title={isNew ? 'Nuevo usuario' : `Editar: ${user.name}`}>
      <form onSubmit={submit}>
        <Stack>
          <TextInput label="Nombre" required value={form.name} onChange={(e) => set('name')(e.currentTarget.value)} data-autofocus />
          <TextInput label="Correo" type="email" required value={form.email} onChange={(e) => set('email')(e.currentTarget.value)} />
          <Select
            label="Rol"
            data={toOptions(ROLE_LABEL)}
            value={form.role}
            onChange={(v) => set('role')(v)}
            allowDeselect={false}
            disabled={isMe}
            description={ROLE_HELP[form.role]}
          />
          <PasswordInput
            label={isNew ? 'Contraseña' : 'Nueva contraseña (opcional)'}
            description="Mínimo 8 caracteres, con letras y números"
            required={isNew}
            value={form.password}
            onChange={(e) => set('password')(e.currentTarget.value)}
          />
          {!isNew && (
            <Switch
              label={form.active ? 'Cuenta activa' : 'Cuenta desactivada (no puede iniciar sesión)'}
              checked={form.active}
              onChange={(e) => set('active')(e.currentTarget.checked)}
              disabled={isMe}
            />
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {isNew ? 'Crear usuario' : 'Guardar'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
