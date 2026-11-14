import { Button, Center, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { homeFor } from '../../auth/access.js';
import { ROLE_LABEL } from '../../utils/constants.js';

export default function ForbiddenPage() {
  const { user } = useAuth();
  return (
    <Center mih="70vh" p="md">
      <Stack align="center" gap="sm" maw={420} ta="center">
        <ThemeIcon size={64} radius="xl" variant="light" color="red">
          <IconLock size={34} />
        </ThemeIcon>
        <Title order={2}>Sin acceso</Title>
        <Text c="dimmed">
          Tu rol (<strong>{ROLE_LABEL[user.role]}</strong>) no tiene permiso para abrir esta sección. Si crees que es un
          error, habla con el administrador.
        </Text>
        <Button component={Link} to={homeFor(user.role)}>
          Ir a mi página de inicio
        </Button>
      </Stack>
    </Center>
  );
}
