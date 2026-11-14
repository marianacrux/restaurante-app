import { Center, Loader, Stack, Text } from '@mantine/core';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { canAccessPath } from '../auth/access.js';
import ForbiddenPage from '../pages/system/ForbiddenPage.jsx';

/**
 * Protege un grupo de rutas.
 * - Sin sesión: va al login y recuerda a dónde quería ir.
 * - Con sesión pero sin permiso: muestra "Sin acceso" (no redirige en silencio).
 * Los permisos por ruta salen de auth/access.js (un solo lugar).
 */
export default function ProtectedRoute() {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <Center h="100vh">
        <Stack align="center" gap="xs">
          <Loader />
          <Text c="dimmed">Verificando sesión…</Text>
        </Stack>
      </Center>
    );
  }
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!canAccessPath(user.role, location.pathname)) return <ForbiddenPage />;

  return <Outlet />;
}
