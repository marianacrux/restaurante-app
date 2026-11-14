import { useState } from 'react';
import { Alert, Button, Group, NumberInput, Paper, Skeleton, Stack, TextInput, Title } from '@mantine/core';
import { IconAlertCircle, IconDeviceFloppy } from '@tabler/icons-react';
import { fetchSettings, saveSettings } from '../../services/admin.service.js';
import { useApi } from '../../hooks/useApi.js';
import PageHeader from '../../components/PageHeader.jsx';
import { notifyError, notifySuccess } from '../../utils/notify.js';

export default function SettingsPage() {
  const { data, error, loading } = useApi(fetchSettings);
  return (
    <>
      <PageHeader title="Ajustes" subtitle="Parámetros generales del restaurante" />
      {error && (
        <Alert color="red" icon={<IconAlertCircle size={18} />} mb="md">
          {error}
        </Alert>
      )}
      {loading && <Skeleton h={200} radius="lg" maw={560} />}
      {data && <SettingsForm initial={data} />}
    </>
  );
}

function SettingsForm({ initial }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      setForm(await saveSettings({ deliveryFee: Number(form.deliveryFee), restaurantName: form.restaurantName.trim() }));
      notifySuccess('Los pedidos nuevos, el bot y las pantallas ya usan los nuevos valores.', 'Ajustes guardados');
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Paper withBorder p="lg" maw={560}>
      <form onSubmit={submit}>
        <Stack>
          <Title order={5}>Restaurante</Title>
          <TextInput
            label="Nombre del restaurante"
            description="Aparece en el bot de WhatsApp y en las pantallas digitales"
            value={form.restaurantName}
            onChange={(e) => setForm({ ...form, restaurantName: e.currentTarget.value })}
            required
          />
          <Title order={5} mt="sm">
            Domicilios
          </Title>
          <NumberInput
            label="Costo del domicilio"
            description="Se aplica a los pedidos NUEVOS; los anteriores conservan su valor"
            prefix="$ "
            thousandSeparator="."
            decimalSeparator=","
            min={0}
            allowDecimal={false}
            value={form.deliveryFee}
            onChange={(v) => setForm({ ...form, deliveryFee: v })}
          />
          <Group justify="flex-end">
            <Button type="submit" loading={saving} leftSection={<IconDeviceFloppy size={16} />}>
              Guardar ajustes
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}
