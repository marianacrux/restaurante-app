import { Group, Paper, Text, ThemeIcon } from '@mantine/core';

/** Tarjeta de indicador: un número grande con su etiqueta, un ícono y una aclaración. */
export default function StatCard({ label, value, hint, icon: Icon, color = 'brand' }) {
  return (
    <Paper withBorder p="md" shadow="xs">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {label}
          </Text>
          <Text fz={28} fw={800} lh={1.2} mt={4} className="tabular">
            {value}
          </Text>
        </div>
        {Icon && (
          <ThemeIcon size={42} radius="md" variant="light" color={color}>
            <Icon size={24} />
          </ThemeIcon>
        )}
      </Group>
      {hint && (
        <Text size="sm" c="dimmed" mt={6}>
          {hint}
        </Text>
      )}
    </Paper>
  );
}
