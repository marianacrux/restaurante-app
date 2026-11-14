import { Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconInbox } from '@tabler/icons-react';

/** Mensaje amable cuando una lista está vacía. */
export default function EmptyState({ title, description, icon: Icon = IconInbox }) {
  return (
    <Paper withBorder p="xl" style={{ borderStyle: 'dashed' }}>
      <Stack align="center" gap={6} ta="center">
        <ThemeIcon size={44} radius="xl" variant="light" color="gray">
          <Icon size={24} />
        </ThemeIcon>
        <Text fw={600}>{title}</Text>
        {description && (
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
