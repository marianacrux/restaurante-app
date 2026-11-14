import { useState } from 'react';
import { Alert, Badge, Button, Code, Group, Paper, SimpleGrid, Skeleton, Table, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertCircle, IconClockHour4, IconDownload, IconFileSpreadsheet, IconPlayerPlay } from '@tabler/icons-react';
import { downloadReport, fetchReports, runReportNow } from '../../services/admin.service.js';
import { useApi } from '../../hooks/useApi.js';
import PageHeader from '../../components/PageHeader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { notifyError, notifySuccess } from '../../utils/notify.js';
import { formatMoney } from '../../utils/format.js';

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' }) : '—');
const hour = (iso) => new Date(iso).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' });

export default function ReportsPage() {
  const { data, error, loading, reload } = useApi(fetchReports, { topics: ['reports'], interval: 60000 });
  const [busy, setBusy] = useState(null);

  async function runNow() {
    setBusy('run');
    try {
      const run = await runReportNow();
      notifySuccess(`Se actualizó la fila de la hora en curso (${run.orders} pedidos).`, 'Excel actualizado');
    } catch (err) {
      notifyError(err, 'No se pudo escribir el Excel');
    } finally {
      setBusy(null);
      reload();
    }
  }

  async function download() {
    setBusy('download');
    try {
      await downloadReport(data.fileName);
    } catch (err) {
      notifyError(err);
    } finally {
      setBusy(null);
    }
  }

  const lastOk = data?.runs.find((r) => r.success);
  const lastError = data?.runs[0] && !data.runs[0].success ? data.runs[0] : null;

  return (
    <>
      <PageHeader title="Reportes en Excel" subtitle="Cada hora en punto el sistema escribe el resumen de ventas en el Excel de la empresa">
        <Button variant="default" leftSection={<IconDownload size={16} />} onClick={download} loading={busy === 'download'} disabled={!data?.file.exists}>
          Descargar Excel
        </Button>
        <Button leftSection={<IconPlayerPlay size={16} />} onClick={runNow} loading={busy === 'run'}>
          Actualizar ahora
        </Button>
      </PageHeader>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={18} />} mb="md">
          {error}
        </Alert>
      )}
      {loading && <Skeleton h={300} radius="lg" />}

      {data && (
        <>
          {lastError && (
            <Alert color="red" icon={<IconAlertCircle size={18} />} mb="md" title="El último reporte falló">
              {lastError.error}
            </Alert>
          )}
          {!data.enabled && (
            <Alert color="yellow" mb="md">
              El reporte automático está desactivado (REPORTS_ENABLED=false en backend/.env).
            </Alert>
          )}

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" mb="md">
            <Paper withBorder p="md">
              <Group wrap="nowrap">
                <ThemeIcon size={42} variant="light" color="green">
                  <IconFileSpreadsheet size={24} />
                </ThemeIcon>
                <div style={{ minWidth: 0 }}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Archivo
                  </Text>
                  <Text fw={600} truncate>
                    {data.fileName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {data.file.exists ? `Modificado ${fmt(data.file.modifiedAt)}` : 'Aún no se ha creado'}
                  </Text>
                </div>
              </Group>
            </Paper>
            <Paper withBorder p="md">
              <Group wrap="nowrap">
                <ThemeIcon size={42} variant="light" color="blue">
                  <IconClockHour4 size={24} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Próximo reporte automático
                  </Text>
                  <Text fw={600}>{data.enabled ? fmt(data.nextRunAt) : 'Desactivado'}</Text>
                </div>
              </Group>
            </Paper>
            <Paper withBorder p="md">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Último reporte correcto
              </Text>
              <Text fw={600}>{lastOk ? fmt(lastOk.createdAt) : '—'}</Text>
              {lastOk && (
                <Text size="xs" c="dimmed">
                  {lastOk.orders} pedidos · {formatMoney(lastOk.sales)}
                </Text>
              )}
            </Paper>
          </SimpleGrid>

          <Paper withBorder p="md" mb="md">
            <Text size="sm">
              Ruta del archivo: <Code>{data.filePath}</Code>
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Para que llegue al Excel compartido de la empresa, configure <Code>EXCEL_REPORT_PATH</Code> en <Code>backend/.env</Code> con una carpeta sincronizada
              (OneDrive, Google Drive, Dropbox). Hojas: “Resumen por hora”, “Pedidos” e “Información”. Si el archivo está abierto en Excel, el reporte se reintenta la
              hora siguiente.
            </Text>
          </Paper>

          <Title order={5} mb="sm">
            Historial (últimas 48 ejecuciones)
          </Title>
          {data.runs.length === 0 ? (
            <EmptyState title="Todavía no hay reportes" description="El primero se genera en la próxima hora en punto, o con “Actualizar ahora”." />
          ) : (
            <Paper withBorder>
              <Table.ScrollContainer minWidth={700}>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Generado</Table.Th>
                      <Table.Th>Hora reportada</Table.Th>
                      <Table.Th>Tipo</Table.Th>
                      <Table.Th ta="right">Pedidos</Table.Th>
                      <Table.Th ta="right">Ventas</Table.Th>
                      <Table.Th ta="right">Recibido</Table.Th>
                      <Table.Th>Resultado</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.runs.map((r) => (
                      <Table.Tr key={r.id}>
                        <Table.Td>{fmt(r.createdAt)}</Table.Td>
                        <Table.Td>
                          {hour(r.periodStart)} – {hour(r.periodEnd)}
                        </Table.Td>
                        <Table.Td>
                          <Badge color={r.trigger === 'AUTOMATICO' ? 'blue' : 'gray'}>{r.trigger === 'AUTOMATICO' ? 'Automático' : 'Manual'}</Badge>
                        </Table.Td>
                        <Table.Td ta="right">{r.orders}</Table.Td>
                        <Table.Td ta="right" className="tabular">
                          {formatMoney(r.sales)}
                        </Table.Td>
                        <Table.Td ta="right" className="tabular">
                          {formatMoney(r.collected)}
                        </Table.Td>
                        <Table.Td>
                          {r.success ? (
                            <Badge color="green">Escrito</Badge>
                          ) : (
                            <Text size="xs" c="red" title={r.error}>
                              Error: {r.error}
                            </Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>
          )}
        </>
      )}
    </>
  );
}
