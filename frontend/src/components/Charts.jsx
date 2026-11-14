import { Box, Group, Progress, Stack, Table, Text, Tooltip } from '@mantine/core';

/**
 * Barras horizontales con su etiqueta y su valor.
 * rows: [{ key, label, value: número, display: texto, hint?: texto }]
 */
export function BarList({ rows, emptyText = 'Sin datos' }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (max === 0) {
    return (
      <Text c="dimmed" size="sm" py="md">
        {emptyText}
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      {rows.map((row) => (
        <div key={row.key}>
          <Group justify="space-between" mb={4} wrap="nowrap">
            <Text size="sm">{row.label}</Text>
            <Text size="sm" fw={600} className="tabular">
              {row.display}
              {row.hint && (
                <Text span c="dimmed" fw={400}>
                  {' '}
                  · {row.hint}
                </Text>
              )}
            </Text>
          </Group>
          <Progress value={(row.value / max) * 100} size="lg" radius="xl" />
        </div>
      ))}
    </Stack>
  );
}

/**
 * Columnas verticales para una serie corta en el tiempo (p. ej. 7 días).
 * points: [{ key, label, value: número, display: texto }]
 */
export function ColumnChart({ points, height = 170 }) {
  const max = Math.max(0, ...points.map((p) => p.value));

  return (
    <Stack gap="xs">
      <Group align="flex-end" gap="xs" h={height} wrap="nowrap" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        {points.map((p) => (
          <Tooltip key={p.key} label={`${p.label}: ${p.display}`} withArrow>
            <Box style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end' }}>
              <Box
                w="100%"
                bg="brand.5"
                style={{
                  height: max ? `${(p.value / max) * 100}%` : 0,
                  minHeight: p.value > 0 ? 4 : 0,
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 300ms ease',
                }}
              />
            </Box>
          </Tooltip>
        ))}
      </Group>
      <Group gap="xs" wrap="nowrap">
        {points.map((p) => (
          <Text key={p.key} size="xs" c="dimmed" ta="center" style={{ flex: 1 }}>
            {p.label}
          </Text>
        ))}
      </Group>
      <details>
        <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--mantine-color-dimmed)' }}>Ver como tabla</summary>
        <Table mt="xs" withRowBorders={false}>
          <Table.Tbody>
            {points.map((p) => (
              <Table.Tr key={p.key}>
                <Table.Td>{p.label}</Table.Td>
                <Table.Td ta="right" className="tabular">
                  {p.display}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </details>
    </Stack>
  );
}
