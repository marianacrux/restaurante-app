// DATOS DE DEMOSTRACIÓN: una semana de operación realista para presentar el sistema.
// Crea pedidos de los últimos 7 días (todos los canales), con su historial de estados,
// pagos, entregas a domicilio y algunos cancelados. Hoy deja pedidos en curso
// (en cocina, listos, en camino y por cobrar) para mostrar el flujo en vivo.
//
// Uso (desde backend/, DESPUÉS de "npm run db:seed"):   npm run db:demo
// Solo AGREGA datos. Si ya hay muchos pedidos recientes, se detiene para no duplicar.
import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

// Generador pseudoaleatorio con semilla: los datos salen iguales cada vez (demo reproducible)
let seed = 20261118;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));
/** Elige según pesos: [['A', 3], ['B', 1]] */
const weighted = (pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of pairs) if ((r -= w) < 0) return value;
  return pairs[0][0];
};

const CUSTOMERS = [
  ['Ana María López', '3005551001'],
  ['Carlos Rodríguez', '3105551002'],
  ['Luisa Fernanda Gómez', '3155551003'],
  ['Jorge Martínez', '3205551004'],
  ['Valentina Torres', '3015551005'],
  ['Andrés Herrera', '3125551006'],
  ['Camila Ruiz', '3175551007'],
  ['Felipe Castro', '3185551008'],
  ['Daniela Moreno', '3005551009'],
  ['Santiago Vargas', '3045551010'],
];
const ADDRESSES = [
  'Calle 10 # 20-30, barrio Centro',
  'Carrera 5 # 12-34, barrio La Esperanza',
  'Avenida 26 # 45-10, apto 302',
  'Calle 72 # 11-08, oficina 504',
  'Transversal 3 # 8-15, casa esquinera',
  'Carrera 15 # 93-60, torre 2 apto 701',
];
const NOTES = [null, null, null, null, 'sin cebolla', 'bien asado', 'sin hielo', 'salsa aparte', 'extra picante'];

/** Fecha en hora de Colombia: díasAtrás + hora local (UTC-5). */
const localDate = (daysAgo, hour, minute) => {
  const today = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
  const base = new Date(`${today}T00:00:00-05:00`).getTime() - daysAgo * DAY_MS;
  return new Date(base + (hour * 60 + minute) * MIN_MS);
};

async function main() {
  const recent = await prisma.order.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * DAY_MS) } } });
  if (recent >= 40 && !process.argv.includes('--forzar')) {
    console.log(`Ya hay ${recent} pedidos de los últimos 7 días: no se agregan datos de demo (use --forzar si de verdad quiere más).`);
    return;
  }

  const products = await prisma.product.findMany({ where: { active: true, available: true } });
  const users = Object.fromEntries((await prisma.user.findMany()).map((u) => [u.role, u]));
  const couriers = await prisma.deliveryPerson.findMany({ where: { active: true } });
  const feeSetting = await prisma.setting.findUnique({ where: { key: 'DELIVERY_FEE' } });
  const deliveryFee = new Prisma.Decimal(feeSetting?.value ?? '5000');
  if (!products.length || !users.ADMIN || !couriers.length) {
    throw new Error('Primero ejecute "npm run db:seed" (faltan productos, usuarios o domiciliarios).');
  }

  const nowLocalHour = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota', hour: 'numeric', hour12: false }));
  let created = 0;
  const busyCouriers = new Set();

  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const isToday = daysAgo === 0;
    const weekend = [0, 6].includes(localDate(daysAgo, 12, 0).getUTCDay());
    // Horarios de pedidos del día (más pedidos el fin de semana), en orden cronológico
    const count = isToday ? Math.max(4, Math.min(14, Math.round(((nowLocalHour - 10) / 11) * 14))) : between(weekend ? 14 : 9, weekend ? 20 : 14);
    const lastHour = isToday ? Math.max(11, Math.min(21, nowLocalHour)) : 21;
    const times = Array.from({ length: count }, () => [between(11, lastHour), between(0, 59)])
      .map(([h, m]) => localDate(daysAgo, h, m))
      .filter((d) => d.getTime() < Date.now() - 2 * MIN_MS)
      .sort((a, b) => a - b);

    for (const createdAt of times) {
      const source = weighted([['WHATSAPP', 35], ['PUNTO_DE_VENTA', 30], ['VITRINA', 15], ['DOMICILIO', 20]]);
      const type =
        source === 'DOMICILIO' ? 'DOMICILIO' : source === 'WHATSAPP' ? weighted([['DOMICILIO', 6], ['PARA_LLEVAR', 4]]) : weighted([['EN_LOCAL', 6], ['PARA_LLEVAR', 4]]);
      const needsCustomer = type === 'DOMICILIO' || source === 'WHATSAPP' || rand() < 0.3;
      const [name, phone] = pick(CUSTOMERS);
      const customer = needsCustomer ? await prisma.customer.upsert({ where: { phone }, update: {}, create: { name, phone } }) : null;

      // Productos del pedido (copias históricas de nombre y precio)
      const lines = [];
      for (let i = 0, n = between(1, 3); i < n; i++) {
        const p = pick(products);
        if (lines.some((l) => l.productId === p.id)) continue;
        const quantity = weighted([[1, 6], [2, 3], [3, 1]]);
        lines.push({ productId: p.id, productName: p.name, unitPrice: p.price, quantity, notes: pick(NOTES), subtotal: p.price.mul(quantity) });
      }
      const subtotal = lines.reduce((s, l) => s.add(l.subtotal), new Prisma.Decimal(0));
      const fee = type === 'DOMICILIO' ? deliveryFee : new Prisma.Decimal(0);
      const total = subtotal.add(fee);

      // Estado final: los días anteriores casi todo entregado; hoy, lo reciente sigue en curso
      const ageMin = (Date.now() - createdAt.getTime()) / MIN_MS;
      let finalStatus;
      if (rand() < 0.07) finalStatus = 'CANCELADO';
      else if (!isToday || ageMin > 120) finalStatus = 'ENTREGADO';
      else if (ageMin > 60) finalStatus = type === 'DOMICILIO' ? 'EN_CAMINO' : 'LISTO';
      else if (ageMin > 25) finalStatus = 'EN_PREPARACION';
      else finalStatus = 'CONFIRMADO';
      if (finalStatus === 'EN_CAMINO' && busyCouriers.size >= couriers.length) finalStatus = 'LISTO';

      const flow = ['CONFIRMADO', 'EN_PREPARACION', 'LISTO', ...(type === 'DOMICILIO' ? ['EN_CAMINO'] : []), 'ENTREGADO'];
      const steps = finalStatus === 'CANCELADO' ? ['CONFIRMADO', 'CANCELADO'] : flow.slice(0, flow.indexOf(finalStatus) + 1);
      const offsets = { CONFIRMADO: 0, EN_PREPARACION: 4, LISTO: 22, EN_CAMINO: 26, ENTREGADO: type === 'DOMICILIO' ? 48 : 30, CANCELADO: 8 };
      const at = (status) => new Date(createdAt.getTime() + offsets[status] * MIN_MS);
      const who = (status) => (['EN_PREPARACION', 'LISTO'].includes(status) ? users.COCINA : status === 'CONFIRMADO' && source === 'WHATSAPP' ? null : users.CAJERO);

      const method =
        type === 'DOMICILIO'
          ? weighted([['CONTRAENTREGA_EFECTIVO', 4], ['NEQUI', 4], ['DAVIPLATA', 2], ['TRANSFERENCIA', 1]])
          : weighted([['EFECTIVO', 5], ['NEQUI', 3], ['TARJETA', 3], ['DAVIPLATA', 1]]);
      // ¿Se cobró? Entregados casi siempre; hoy algunos quedan por cobrar para la demo de Pagos
      const paid = finalStatus === 'ENTREGADO' && !(isToday && rand() < 0.25);

      const order = await prisma.order.create({
        data: {
          source,
          type,
          status: finalStatus,
          customerId: customer?.id ?? null,
          createdById: source === 'WHATSAPP' ? null : users.CAJERO?.id ?? users.ADMIN.id,
          subtotal,
          deliveryFee: fee,
          total,
          paymentMethod: method,
          paymentStatus: paid ? 'PAGADO' : 'PENDIENTE',
          deliveryAddress: type === 'DOMICILIO' ? pick(ADDRESSES) : null,
          cancelReason: finalStatus === 'CANCELADO' ? pick(['El cliente desistió', 'Dirección fuera de cobertura', 'Producto agotado']) : null,
          createdAt,
          updatedAt: at(steps.at(-1)),
          items: { create: lines },
          statusHistory: {
            create: steps.map((status, i) => ({
              previousStatus: i === 0 ? null : steps[i - 1],
              newStatus: status,
              changedById: who(status)?.id ?? null,
              note: i === 0 ? `Pedido creado (${source})` : status === 'CANCELADO' ? 'Cancelado: demo' : null,
              createdAt: at(status),
            })),
          },
        },
      });

      if (paid) {
        await prisma.payment.create({
          data: {
            orderId: order.id,
            method,
            amount: total,
            status: 'PAGADO',
            reference: ['NEQUI', 'DAVIPLATA', 'TRANSFERENCIA'].includes(method) ? `M${between(100000, 999999)}` : null,
            recordedById: users.CAJERO?.id ?? users.ADMIN.id,
            createdAt: at('ENTREGADO'),
          },
        });
      }

      if (type === 'DOMICILIO' && ['EN_CAMINO', 'ENTREGADO'].includes(finalStatus)) {
        const free = couriers.filter((c) => !busyCouriers.has(c.id));
        const courier = finalStatus === 'EN_CAMINO' ? free[0] : pick(couriers);
        if (finalStatus === 'EN_CAMINO') busyCouriers.add(courier.id);
        await prisma.delivery.create({
          data: {
            orderId: order.id,
            deliveryPersonId: courier.id,
            status: finalStatus === 'EN_CAMINO' ? 'EN_CAMINO' : 'ENTREGADO',
            assignedAt: at('EN_CAMINO'),
            pickedUpAt: at('EN_CAMINO'),
            deliveredAt: finalStatus === 'ENTREGADO' ? at('ENTREGADO') : null,
          },
        });
      }
      created++;
    }
  }

  // Domiciliarios con entrega en curso quedan OCUPADOS (como en la operación real)
  if (busyCouriers.size) {
    await prisma.deliveryPerson.updateMany({ where: { id: { in: [...busyCouriers] } }, data: { availability: 'OCUPADO' } });
  }
  console.log(`✔ ${created} pedidos de demostración creados (7 días), con pagos, entregas e historial`);
}

try {
  await main();
} catch (error) {
  console.error('Error al crear los datos de demo:', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
