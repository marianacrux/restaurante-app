// Indicadores del dashboard. Todo sale de consultas reales a PostgreSQL.
// Regla de negocio: un pedido CANCELADO nunca suma como venta.
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { addDays, listDays, localDayRange, todayLocal } from '../../utils/dates.js';

const ZERO = new Prisma.Decimal(0);
const STATUSES = ['PENDIENTE', 'CONFIRMADO', 'EN_PREPARACION', 'LISTO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO'];
const SOURCES = ['WHATSAPP', 'VITRINA', 'PUNTO_DE_VENTA', 'DOMICILIO'];

export async function getSummary(day = todayLocal()) {
  const { start, end } = localDayRange(day);
  const inDay = { createdAt: { gte: start, lt: end } };
  const notCancelled = { ...inDay, status: { not: 'CANCELADO' } };

  // Cinco consultas independientes, ejecutadas juntas
  const [byStatus, bySource, sales, delivered, pending] = await prisma.$transaction([
    prisma.order.groupBy({ by: ['status'], where: inDay, _count: { _all: true }, orderBy: { status: 'asc' } }),
    prisma.order.groupBy({
      by: ['source'],
      where: notCancelled,
      _count: { _all: true },
      _sum: { total: true },
      orderBy: { source: 'asc' },
    }),
    prisma.order.aggregate({ where: notCancelled, _count: { _all: true }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { ...inDay, status: 'ENTREGADO' }, _sum: { total: true } }),
    prisma.order.aggregate({
      where: { ...notCancelled, paymentStatus: { in: ['PENDIENTE', 'PARCIAL'] } },
      _count: { _all: true },
      _sum: { total: true },
    }),
  ]);

  // groupBy solo devuelve los grupos que existen: completamos con 0 los que faltan
  const ordersByStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const row of byStatus) ordersByStatus[row.status] = row._count._all;

  const salesBySource = SOURCES.map((source) => {
    const row = bySource.find((r) => r.source === source);
    return { source, orders: row?._count._all ?? 0, total: row?._sum.total ?? ZERO };
  });

  const total = sales._sum.total ?? ZERO;
  const validOrders = sales._count._all;

  return {
    day,
    sales: {
      total, // pedidos del día que no están cancelados
      delivered: delivered._sum.total ?? ZERO, // ventas completadas (ENTREGADO)
      averageTicket: validOrders ? total.div(validOrders).toDecimalPlaces(0) : ZERO,
    },
    orders: { total: Object.values(ordersByStatus).reduce((a, b) => a + b, 0), byStatus: ordersByStatus },
    pendingPayments: { orders: pending._count._all, amount: pending._sum.total ?? ZERO },
    bySource: salesBySource,
  };
}

/** Ventas por día (sin cancelados) para el gráfico. Por defecto, los últimos 7 días. */
export async function getSalesByDay({ to = todayLocal(), from = addDays(to, -6) } = {}) {
  const { start } = localDayRange(from);
  const { end } = localDayRange(to);

  // SQL directo: agrupar por día EN HORA DE BOGOTÁ.
  // "createdAt" se guarda en UTC sin zona; los AT TIME ZONE lo convierten explícitamente,
  // para no depender de la zona horaria que tenga configurada el servidor de PostgreSQL.
  const rows = await prisma.$queryRaw`
    SELECT to_char(("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date, 'YYYY-MM-DD') AS day,
           count(*)::int AS orders,
           coalesce(sum(total), 0) AS total
    FROM "Order"
    WHERE "createdAt" >= (${start}::timestamptz AT TIME ZONE 'UTC')
      AND "createdAt" <  (${end}::timestamptz AT TIME ZONE 'UTC')
      AND status <> 'CANCELADO'
    GROUP BY 1
    ORDER BY 1`;

  // Los días sin ventas no aparecen en la consulta: se completan con 0
  const byDay = new Map(rows.map((r) => [r.day, r]));
  return listDays(from, to).map((day) => ({
    day,
    orders: byDay.get(day)?.orders ?? 0,
    total: byDay.get(day)?.total ?? ZERO,
  }));
}