import { useCallback, useState } from 'react';
import { Button, Group, Modal, Select, Stack, Switch, TextInput } from '@mantine/core';
import { createCourier, fetchUsers, updateCourier } from '../../services/admin.service.js';
import { useApi } from '../../hooks/useApi.js';
import { notifyError, notifySuccess } from '../../utils/notify.js';
import { TRANSPORT_TYPE, toOptions } from '../../utils/constants.js';

/** Registrar o editar un domiciliario (solo administrador). */
export default function CourierModal({ courier, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: courier.name ?? '',
    phone: courier.phone ?? '',
    transportType: courier.transportType ?? 'MOTOCICLETA',
    userId: courier.userId ? String(courier.userId) : null,
    active: courier.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const isNew = !courier.id;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  // Cuentas con rol DOMICILIARIO para vincular (así ve "Mis entregas")
  const loadUsers = useCallback(() => fetchUsers().then((users) => users.filter((u) => u.role === 'DOMICILIARIO' && u.active)), []);
  const { data: users } = useApi(loadUsers);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const body = { name: form.name.trim(), phone: form.phone.trim(), transportType: form.transportType, userId: form.userId ? Number(form.userId) : null };
    if (!isNew) body.active = form.active;
    try {
      await (isNew ? createCourier(body) : updateCourier(courier.id, body));
      notifySuccess(`${body.name} ${isNew ? 'registrado' : 'actualizado'}`);
      onSaved();
      onClose();
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal opened onClose={onClose} title={isNew ? 'Nuevo domiciliario' : `Editar: ${courier.name}`}>
      <form onSubmit={submit}>
        <Stack>
          <TextInput label="Nombre" required value={form.name} onChange={(e) => set('name')(e.currentTarget.value)} data-autofocus />
          <TextInput label="Celular" required placeholder="3001234567" inputMode="tel" value={form.phone} onChange={(e) => set('phone')(e.currentTarget.value)} />
          <Select label="Transporte" data={toOptions(TRANSPORT_TYPE)} value={form.transportType} onChange={set('transportType')} allowDeselect={false} />
          <Select
            label="Cuenta de usuario (opcional)"
            description="Vincúlela para que vea sus entregas en “Mis entregas”"
            placeholder="Sin cuenta"
            clearable
            data={(users ?? []).map((u) => ({ value: String(u.id), label: `${u.name} · ${u.email}` }))}
            value={form.userId}
            onChange={set('userId')}
          />
          {!isNew && (
            <Switch
              label={form.active ? 'Trabaja en el restaurante' : 'Desactivado (ya no trabaja aquí)'}
              checked={form.active}
              onChange={(e) => set('active')(e.currentTarget.checked)}
            />
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {isNew ? 'Registrar' : 'Guardar'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
