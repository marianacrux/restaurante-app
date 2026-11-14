import { Group, Stack, Text, Title } from '@mantine/core';

/** Encabezado común de las páginas: título, descripción y acciones a la derecha. */
export default function PageHeader({ title, subtitle, children }) {
  return (
    <Group justify="space-between" align="flex-end" mb="lg" wrap="wrap" gap="sm">
      <Stack gap={2}>
        <Title order={2}>{title}</Title>
        {subtitle && (
          <Text c="dimmed" size="sm">
            {subtitle}
          </Text>
        )}
      </Stack>
      {children && <Group gap="xs">{children}</Group>}
    </Group>
  );
}
