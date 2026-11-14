import { AppShell, Burger, Group, NavLink, ScrollArea, Text, ThemeIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconToolsKitchen2 } from '@tabler/icons-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { sectionsFor } from '../auth/access.js';
import NavIcon from '../components/NavIcon.jsx';
import UserMenu from '../components/UserMenu.jsx';

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [opened, { toggle, close }] = useDisclosure(false);

  // El menú se arma con los permisos de access.js: cada rol ve solo lo suyo.
  const groups = Object.entries(
    sectionsFor(user.role).reduce((acc, s) => ({ ...acc, [s.group]: [...(acc[s.group] ?? []), s] }), {}),
  );

  return (
    <AppShell header={{ height: 60 }} navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="lg">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Abrir menú" />
            <ThemeIcon size={34} radius="md" variant="gradient" gradient={{ from: 'brand.5', to: 'brand.8' }}>
              <IconToolsKitchen2 size={20} />
            </ThemeIcon>
            <Text fw={800} size="lg" visibleFrom="xs">
              Restaurante
            </Text>
          </Group>
          <UserMenu />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <ScrollArea>
          {groups.map(([group, sections]) => (
            <div key={group}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="sm" mt="md" mb={4}>
                {group}
              </Text>
              {sections.map((s) => (
                <NavLink
                  key={s.path}
                  component={Link}
                  to={s.path}
                  label={s.label}
                  leftSection={<NavIcon name={s.icon} />}
                  active={location.pathname === s.path}
                  onClick={close}
                  variant="light"
                  style={{ borderRadius: 'var(--mantine-radius-md)' }}
                />
              ))}
            </div>
          ))}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main bg="var(--mantine-color-body)">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
