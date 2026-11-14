import { ActionIcon, Avatar, Group, Menu, Text, UnstyledButton, useMantineColorScheme } from '@mantine/core';
import { IconChevronDown, IconLogout, IconMoon, IconSun } from '@tabler/icons-react';
import { useAuth } from '../hooks/useAuth.js';
import { ROLE_COLOR, ROLE_LABEL } from '../utils/constants.js';

const initials = (name) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/** Botón de modo claro/oscuro + menú del usuario (nombre, rol, cerrar sesión). */
export default function UserMenu({ compact = false }) {
  const { user, logout } = useAuth();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  return (
    <Group gap="xs" wrap="nowrap">
      <ActionIcon
        variant="default"
        size="lg"
        onClick={toggleColorScheme}
        aria-label={colorScheme === 'dark' ? 'Usar modo claro' : 'Usar modo oscuro'}
      >
        {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
      </ActionIcon>

      <Menu position="bottom-end" width={220} shadow="md">
        <Menu.Target>
          <UnstyledButton aria-label="Menú de usuario">
            <Group gap={8} wrap="nowrap">
              <Avatar color={ROLE_COLOR[user.role]} radius="xl" size={34}>
                {initials(user.name)}
              </Avatar>
              {!compact && (
                <div style={{ lineHeight: 1.1 }}>
                  <Text size="sm" fw={600}>
                    {user.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {ROLE_LABEL[user.role]}
                  </Text>
                </div>
              )}
              <IconChevronDown size={14} />
            </Group>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>{user.email}</Menu.Label>
          <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={() => logout('manual')}>
            Cerrar sesión
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
