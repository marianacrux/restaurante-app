import { useCallback, useState } from 'react';
import { Alert, Button, Group, Paper, SimpleGrid, Skeleton, Text, TextInput, Title, UnstyledButton } from '@mantine/core';
import { IconAlertCircle, IconCash, IconClockDollar, IconReceipt, IconRefresh, IconTrendingUp } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { fetchSalesByDay, fetchSummary } from '../../services/dashboard.service.js';
import { useApi } from '../../hooks/useApi.js';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';
import { BarList, ColumnChart } from '../../components/Charts.jsx';
import { ORDER_SOURCE, ORDER_STATUS, PAYMENT_METHOD } from '../../utils/constants.js';
import { formatMoney, formatShortDay, formatTime, todayLocal } from '../../utils/format.js';

const REFRESH_MS = 60000; // respaldo: los cambios llegan al instante por Socket.IO

export default function DashboardPage() {
  const [day, setDay] = useState(todayLocal);
  const load = useCallback(
    () => Promise.all([fetchSummary(day), fetchSalesByDay({ to: day })]).then(([summary, sales]) => ({ summary, sales })),
    [day],
  );
  const { data, error, loading, reload, updatedAt } = useApi(load, { topics: ['dashboard', 'orders', 'payments'], interval: REFRESH_MS });

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={updatedAt ? `Actualizado ${formatTime(updatedAt.toISOString())} · en vivo` : 'Cargando…'}
      >
        <TextInput
          type="date"
          value={day}
          max={todayLocal()}
          onChange={(e) => e.currentTarget.value && setDay(e.currentTarget.value)}
          aria-label="Día del resumen"
        />
        <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={reload}>
          Actualizar
        </Button>
      </PageHeader>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={18} />} mb="md">
          {error}
        </Alert>
      )}
      {loading && <Skeleton h={400} radius="lg" />}
      {data && <DashboardContent summary={data.summary} sales={data.sales} />}
    </>
  );
}

function DashboardContent({ summary, sales }) {
  const { byStatus } = summary.orders;
  const valid = summary.orders.total - byStatus.CANCELADO;

  return (
    <>
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md" mb="md">
        <StatCard label="Ventas del día" value={formatMoney(summary.sales.total)} hint={`${valid} pedidos · sin cancelados`} icon={IconTrendingUp} />
        <StatCard label="Dinero recibido" value={formatMoney(summary.sales.collected)} hint="Pagos registrados hoy" icon={IconCash} color="green" />
        <StatCard label="Ticket promedio" value={formatMoney(summary.sales.averageTicket)} hint="Por pedido válido" icon={IconReceipt} color="blue" />
        <StatCard
          label="Por cobrar"
          value={summary.pendingPayments.orders}
          hint={`${formatMoney(summary.pendingPayments.amount)} pendientes`}
          icon={IconClockDollar}
          color="yellow"
        />
      </SimpleGrid>

      <Paper withBorder p="md" mb="md">
        <Title order={5} mb="sm">
          Pedidos por estado
        </Title>
        <SimpleGrid cols={{ base: 2, sm: 4, lg: 7 }} spacing="xs">
          {Object.entries(ORDER_STATUS).map(([status, { label, color }]) => (
            <UnstyledButton
              key={status}
              component={Link}
              to="/pedidos"
              p="sm"
              style={{
                borderRadius: 'var(--mantine-radius-md)',
                background: `var(--mantine-color-${color}-light)`,
                textAlign: 'center',
              }}
            >
              <Text fz={26} fw={800} c={`${color}.7`} className="tabular">
                {byStatus[status]}
              </Text>
              <Text size="xs" fw={600} c={`${color}.8`}>
                {label}
              </Text>
            </UnstyledButton>
          ))}
        </SimpleGrid>
      </Paper>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Paper withBorder p="md">
          <Title order={5} mb="md">
            Ventas por canal
          </Title>
          <BarList
            emptyText="Aún no hay ventas en este día"
            rows={summary.bySource.map((s) => ({
              key: s.source,
              label: ORDER_SOURCE[s.source],
              value: Number(s.total),
              display: formatMoney(s.total),
              hint: `${s.orders} ${s.orders === 1 ? 'pedido' : 'pedidos'}`,
            }))}
          />
        </Paper>

        <Paper withBorder p="md">
          <Group justify="space-between" mb="md">
            <Title order={5}>Dinero recibido por método</Title>
            <Text fw={700} c="green.7" className="tabular">
              {formatMoney(summary.sales.collected)}
            </Text>
          </Group>
          <BarList
            emptyText="Aún no se han registrado pagos este día"
            rows={summary.byPaymentMethod.map((m) => ({
              key: m.method,
              label: PAYMENT_METHOD[m.method],
              value: Number(m.total),
              display: formatMoney(m.total),
              hint: `${m.payments} ${m.payments === 1 ? 'pago' : 'pagos'}`,
            }))}
          />
        </Paper>

        <Paper withBorder p="md" style={{ gridColumn: '1 / -1' }}>
          <Title order={5} mb="md">
            Ventas de los últimos 7 días
          </Title>
          <ColumnChart
            points={sales.map((d) => ({
              key: d.day,
              label: formatShortDay(d.day),
              value: Number(d.total),
              display: `${formatMoney(d.total)} · ${d.orders} pedidos`,
            }))}
          />
        </Paper>
      </SimpleGrid>
    </>
  );
}
