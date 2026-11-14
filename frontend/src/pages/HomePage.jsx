import { Badge, Card, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { sectionsFor } from '../auth/access.js';
import NavIcon from '../components/NavIcon.jsx';
import { ROLE_COLOR, ROLE_LABEL } from '../utils/constants.js';

const DESCRIPTION = {
  '/dashboard': 'Ventas, pedidos por estado y dinero recibido del día.',
  '/pedidos/nuevo': 'Registra pedidos de mostrador, vitrina o domicilio telefónico.',
  '/productos': 'Crea y edita productos, fotos, precios, categorías y agotados.',
  '/promociones': 'Descuentos y combos con fechas de vigencia.',
  '/reportes': 'Reporte automático cada hora en el Excel de la empresa.',
  '/usuarios': 'Cuentas del personal, roles y contraseñas.',
  '/ajustes': 'Nombre del restaurante y costo del domicilio.',
  '/pedidos': 'Todos los pedidos, con filtros y cambios de estado.',
  '/cocina': 'Tablero de cocina en pantalla completa con avisos de voz.',
  '/domicilios': 'Despacha pedidos listos y controla a los domiciliarios.',
  '/mis-entregas': 'Tus entregas pendientes y confirmación de entrega.',
  '/pagos': 'Cobra pedidos, revisa pagos y reembolsos.',
  '/whatsapp': 'Prueba el bot de pedidos como si fueras un cliente.',
  '/pantallas': 'Contenido de los televisores del restaurante.',
};

function greeting() {
  const hour = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota', hour: 'numeric', hour12: false }));
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function HomePage() {
  const { user } = useAuth();
  const shortcuts = sectionsFor(user.role).filter((s) => s.path !== '/inicio');

  return (
    <Stack gap="xl">
      <div>
        <Group gap="sm">
          <Title order={2}>
            {greeting()}, {user.name.split(' ')[0]} 👋
          </Title>
          <Badge color={ROLE_COLOR[user.role]} size="lg">
            {ROLE_LABEL[user.role]}
          </Badge>
        </Group>
        <Text c="dimmed" mt={4}>
          Estos son los módulos disponibles para tu rol.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {shortcuts.map((s) => (
          <Card
            key={s.path}
            component={Link}
            to={s.path}
            padding="lg"
            style={{ transition: 'transform 120ms ease, box-shadow 120ms ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
          >
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <ThemeIcon size={46} radius="md" variant="light">
                <NavIcon name={s.icon} size={26} />
              </ThemeIcon>
              <IconArrowRight size={18} color="var(--mantine-color-dimmed)" />
            </Group>
            <Text fw={700} size="lg" mt="md">
              {s.label}
            </Text>
            <Text size="sm" c="dimmed" mt={4}>
              {DESCRIPTION[s.path]}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
