import { useState } from 'react';
import { Alert, Box, Button, Center, Group, Paper, PasswordInput, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { IconAlertCircle, IconAt, IconLock, IconToolsKitchen2 } from '@tabler/icons-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { canAccessPath, homeFor } from '../auth/access.js';
import { getErrorMessage } from '../services/api.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A dónde ir después de iniciar sesión:
 * a la página que la persona intentaba abrir (si su rol puede verla) o a su página principal.
 */
function destinationFor(user, from) {
  if (from && from !== '/login' && canAccessPath(user.role, from)) return from;
  return homeFor(user.role);
}

export default function LoginPage() {
  const { login, status, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') return <Navigate to={destinationFor(user, location.state?.from)} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    const found = {};
    if (!EMAIL_RE.test(email.trim())) found.email = 'Ingresa un correo válido';
    if (!password) found.password = 'Ingresa la contraseña';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setServerError('');
    try {
      const loggedUser = await login(email.trim(), password);
      navigate(destinationFor(loggedUser, location.state?.from), { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      mih="100vh"
      style={{
        background:
          'radial-gradient(circle at 15% 20%, var(--mantine-color-brand-1), transparent 45%), radial-gradient(circle at 85% 80%, var(--mantine-color-brand-2), transparent 40%), var(--mantine-color-body)',
      }}
    >
      <Center mih="100vh" p="md">
        <Paper withBorder shadow="lg" p={{ base: 'lg', sm: 40 }} w="100%" maw={420}>
          <Stack gap="lg">
            <Stack align="center" gap={6}>
              <ThemeIcon size={56} radius="xl" variant="gradient" gradient={{ from: 'brand.5', to: 'brand.8' }}>
                <IconToolsKitchen2 size={30} />
              </ThemeIcon>
              <Title order={2} ta="center">
                Gestión de pedidos
              </Title>
              <Text c="dimmed" size="sm" ta="center">
                Inicia sesión con tu cuenta del restaurante
              </Text>
            </Stack>

            {serverError && (
              <Alert color="red" icon={<IconAlertCircle size={18} />} variant="light">
                {serverError}
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <Stack gap="md">
                <TextInput
                  label="Correo electrónico"
                  placeholder="tu.correo@restaurante.test"
                  leftSection={<IconAt size={16} />}
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  error={errors.email}
                  autoComplete="username"
                  autoFocus
                  size="md"
                />
                <PasswordInput
                  label="Contraseña"
                  placeholder="Tu contraseña"
                  leftSection={<IconLock size={16} />}
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  error={errors.password}
                  autoComplete="current-password"
                  size="md"
                />
                <Button type="submit" size="md" loading={submitting} fullWidth mt="xs">
                  Ingresar
                </Button>
              </Stack>
            </form>

            <Group justify="center">
              <Text size="xs" c="dimmed">
                Cada rol entra directo a su pantalla de trabajo
              </Text>
            </Group>
          </Stack>
        </Paper>
      </Center>
    </Box>
  );
}
