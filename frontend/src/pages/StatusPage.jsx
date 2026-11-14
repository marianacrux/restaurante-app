import { useCallback } from 'react';
import { Alert, Button, Center, Group, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck, IconRefresh } from '@tabler/icons-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';

// Página pública para comprobar que la API y la base de datos responden.
export default function StatusPage() {
  const load = useCallback(() => api.get('/health').then((r) => r.data), []);
  const { data, error, loading, reload } = useApi(load);

  return (
    <Center mih="100vh" p="md">
      <Paper withBorder shadow="md" p="xl" w="100%" maw={460}>
        <Stack>
          <Title order={3}>Estado del sistema</Title>
          {loading && <Text c="dimmed">Comprobando…</Text>}
          {error && (
            <Alert color="red" icon={<IconAlertCircle size={18} />}>
              {error}
            </Alert>
          )}
          {data && !error && (
            <Stack gap="xs">
              {[
                ['API', 'respondiendo'],
                ['Base de datos', `${data.database} (usuario ${data.user})`],
                ['Hora del servidor', new Date(data.timestamp).toLocaleTimeString('es-CO')],
              ].map(([label, value]) => (
                <Group key={label} gap="sm" wrap="nowrap">
                  <ThemeIcon color="green" variant="light" radius="xl">
                    <IconCircleCheck size={18} />
                  </ThemeIcon>
                  <Text>
                    <strong>{label}:</strong> {value}
                  </Text>
                </Group>
              ))}
            </Stack>
          )}
          <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={reload}>
            Volver a comprobar
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
