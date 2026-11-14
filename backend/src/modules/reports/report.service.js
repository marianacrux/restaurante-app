// REPORTE POR HORA EN EXCEL.
// Cada hora en punto se calcula lo que pasó en la hora anterior y se escribe en el
// archivo Excel de la empresa (ruta en EXCEL_REPORT_PATH; p. ej. una carpeta de
// OneDrive o Google Drive sincronizada en el computador del restaurante).
//
// El archivo tiene tres hojas:
//   - "Resumen por hora": una fila por hora (si se vuelve a generar, la fila se ACTUALIZA, no se duplica)
//   - "Pedidos": una fila por pedido (también se actualiza: el estado de un pedido cambia con el tiempo)
//   - "Información": cuándo se actualizó y qué significa cada columna
import ExcelJS from 'exceljs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

const ZERO = new Prisma.Decimal(0);
const HOUR_MS = 60 * 60 * 1000;
const TZ = 'America/Bogota';

export const REPORT_PATH = path.resolve(process.cwd(), process.env.EXCEL_REPORT_PATH || 'reports/reporte-ventas.xlsx');

const METHODS = [
  ['EFECTIVO', 'Efectivo'],
  ['NEQUI', 'Nequi'],
  ['DAVIPLATA', 'Daviplata'],
  ['TRANSFERENCIA', 'Transferencia'],
  ['TARJETA', 'Tarjeta'],
  ['CONTRAENTREGA_EFECTIVO', 'Contraentrega'],
];
const SOURCES = [
  ['WHATSAPP', 'WhatsApp'],
  ['VITRINA', 'Vitrina'],
  ['PUNTO_DE_VENTA', 'Punto de venta'],
  ['DOMICILIO', 'Domicilio'],
];

const SUMMARY_COLUMNS = [
  { header: 'Periodo', key: 'period', width: 22 },
  { header: 'Fecha', key: 'date', width: 12 },
  { header: 'Hora', key: 'hour', width: 13 },
  { header: 'Pedidos', key: 'orders', width: 10 },
  { header: 'Ventas', key: 'sales', width: 14, money: true },
  { header: 'Recibido', key: 'collected', width: 14, money: true },
  { header: 'Ticket promedio', key: 'avg', width: 15, money: true },
  { header: 'Cancelados', key: 'cancelled', width: 11 },
  ...METHODS.map(([key, header]) => ({ header, key: `m_${key}`, width: 14, money: true })),
  ...SOURCES.map(([key, header]) => ({ header: `Pedidos ${header}`, key: `s_${key}`, width: 14 })),
  { header: 'Actualizado', key: 'updated', width: 20 },
];

const ORDER_COLUMNS = [
  { header: 'Pedido', key: 'number', width: 9 },
  { header: 'Fecha', key: 'date', width: 12 },
  { header: 'Hora', key: 'time', width: 10 },
  { header: 'Canal', key: 'source', width: 15 },
  { header: 'Entrega', key: 'type', width: 13 },
  { header: 'Cliente', key: 'customer', width: 22 },
  { header: 'Productos', key: 'items', width: 45 },
  { header: 'Total', key: 'total', width: 13, money: true },
  { header: 'Estado', key: 'status', width: 15 },
  { header: 'Pago', key: 'payment', width: 13 },
];

const fmtDate = (d) => d.toLocaleDateString('en-CA', { timeZone: TZ }); // AAAA-MM-DD
const fmtTime = (d) => d.toLocaleTimeString('es-CO', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDateTime = (d) => `${fmtDate(d)} ${fmtTime(d)}`;
const money = (v) => Number(v ?? 0);

/** Inicio de la hora que contiene `date` (en Colombia las horas coinciden con UTC porque el desfase es entero). */
export const startOfHour = (date = new Date()) => new Date(Math.floor(date.getTime() / HOUR_MS) * HOUR_MS);

/** Datos de una hora, consultados en vivo en PostgreSQL. */
async function collect(start, end) {
  const inRange = { createdAt: { gte: start, lt: end } };
  const [orders, payments] = await prisma.$transaction([
    prisma.order.findMany({
      where: inRange,
      include: { customer: { select: { name: true } }, items: { select: { productName: true, quantity: true } } },
      orderBy: { orderNumber: 'asc' },
    }),
    prisma.payment.groupBy({ by: ['method'], where: { ...inRange, status: 'PAGADO' }, _sum: { amount: true }, orderBy: { method: 'asc' } }),
  ]);

  const valid = orders.filter((o) => o.status !== 'CANCELADO');
  const sales = valid.reduce((sum, o) => sum.add(o.total), ZERO);
  const byMethod = Object.fromEntries(METHODS.map(([m]) => [m, payments.find((p) => p.method === m)?._sum.amount ?? ZERO]));
  const collected = Object.values(byMethod).reduce((sum, v) => sum.add(v), ZERO);

  return { orders, valid, sales, collected, byMethod };
}

/** Abre el Excel de la empresa o lo crea con sus hojas y encabezados. */
async function openWorkbook() {
  const workbook = new ExcelJS.Workbook();
  const exists = await fs
    .access(REPORT_PATH)
    .then(() => true)
    .catch(() => false);
  if (exists) await workbook.xlsx.readFile(REPORT_PATH); // si existe pero está dañado, se informa el error
  const sheet = (name, columns) => {
    const ws = workbook.getWorksheet(name) ?? workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = columns.map(({ header, key, width }) => ({ header, key, width }));
    columns.forEach((c, i) => {
      if (c.money) ws.getColumn(i + 1).numFmt = '"$"#,##0';
    });
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2410C' } };
    return ws;
  };
  return {
    workbook,
    summary: sheet('Resumen por hora', SUMMARY_COLUMNS),
    detail: sheet('Pedidos', ORDER_COLUMNS),
    info: workbook.getWorksheet('Información') ?? workbook.addWorksheet('Información'),
  };
}

/** Agrega la fila o, si ya existe una con la misma clave en la columna 1, la reemplaza. */
function upsertRow(ws, keyValue, values) {
  let target = null;
  ws.eachRow((row, n) => {
    if (n > 1 && String(row.getCell(1).value) === String(keyValue)) target = row;
  });
  if (target) {
    Object.entries(values).forEach(([key, value]) => {
      target.getCell(key).value = value;
    });
    target.commit?.();
  } else {
    ws.addRow(values);
  }
}

/** Escribe primero un archivo temporal y luego lo reemplaza: el Excel nunca queda a medio escribir. */
async function saveWorkbook(workbook) {
  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  const tmp = `${REPORT_PATH}.tmp-${process.pid}.xlsx`;
  await workbook.xlsx.writeFile(tmp);
  await fs.rename(tmp, REPORT_PATH);
}

let queue = Promise.resolve(); // las escrituras al archivo se hacen de a una

/**
 * Genera (o actualiza) el reporte de una hora.
 * @param trigger 'AUTOMATICO' | 'MANUAL'
 * @param periodStart inicio de la hora a reportar
 */
export function runReport({ trigger, periodStart }) {
  const run = queue.then(() => generate(trigger, periodStart));
  queue = run.catch(() => {});
  return run;
}

async function generate(trigger, periodStart) {
  const start = startOfHour(periodStart);
  const end = new Date(Math.min(start.getTime() + HOUR_MS, Date.now()));
  const data = await collect(start, end);
  const base = { trigger, periodStart: start, periodEnd: end, orders: data.valid.length, sales: data.sales, collected: data.collected };

  try {
    const { workbook, summary, detail, info } = await openWorkbook();
    const now = new Date();
    const period = `${fmtDate(start)} ${fmtTime(start)}`;

    upsertRow(summary, period, {
      period,
      date: fmtDate(start),
      hour: `${fmtTime(start)} - ${fmtTime(new Date(start.getTime() + HOUR_MS))}`,
      orders: data.valid.length,
      sales: money(data.sales),
      collected: money(data.collected),
      avg: data.valid.length ? Math.round(money(data.sales) / data.valid.length) : 0,
      cancelled: data.orders.length - data.valid.length,
      ...Object.fromEntries(METHODS.map(([m]) => [`m_${m}`, money(data.byMethod[m])])),
      ...Object.fromEntries(SOURCES.map(([s]) => [`s_${s}`, data.valid.filter((o) => o.source === s).length])),
      updated: fmtDateTime(now),
    });

    for (const o of data.orders) {
      upsertRow(detail, o.orderNumber, {
        number: o.orderNumber,
        date: fmtDate(o.createdAt),
        time: fmtTime(o.createdAt),
        source: SOURCES.find(([s]) => s === o.source)?.[1] ?? o.source,
        type: o.type,
        customer: o.customer?.name ?? 'Mostrador',
        items: o.items.map((i) => `${i.quantity} ${i.productName}`).join(', '),
        total: money(o.total),
        status: o.status,
        payment: o.paymentStatus,
      });
    }

    info.getCell('A1').value = 'Reporte automático de ventas';
    info.getCell('A1').font = { bold: true, size: 14 };
    info.getCell('A2').value = `Última actualización: ${fmtDateTime(now)} (hora de Colombia)`;
    info.getCell('A3').value = 'Ventas = pedidos creados en la hora, sin cancelados. Recibido = pagos registrados en la hora.';
    info.getCell('A4').value = 'Generado por el sistema de gestión de pedidos. No edite las hojas "Resumen por hora" ni "Pedidos".';
    info.getColumn(1).width = 100;

    await saveWorkbook(workbook);
    return prisma.reportRun.create({ data: { ...base, success: true, filePath: REPORT_PATH } });
  } catch (err) {
    const message =
      err.code === 'EBUSY' || err.code === 'EPERM'
        ? 'El archivo Excel está abierto o bloqueado por otro programa. Ciérrelo; se reintentará en la próxima hora.'
        : err.message;
    console.error('[reportes] No se pudo escribir el Excel:', message);
    return prisma.reportRun.create({ data: { ...base, success: false, error: message.slice(0, 500), filePath: REPORT_PATH } });
  }
}

export function listRuns() {
  return prisma.reportRun.findMany({ orderBy: { createdAt: 'desc' }, take: 48 });
}

export async function fileExists() {
  try {
    const stat = await fs.stat(REPORT_PATH);
    return { exists: true, size: stat.size, modifiedAt: stat.mtime };
  } catch {
    return { exists: false };
  }
}
