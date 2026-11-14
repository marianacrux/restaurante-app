import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

/**
 * Costo del domicilio. Recibe "db" para poder usarse dentro de una transacción:
 * getDeliveryFee(tx) lee con la transacción; getDeliveryFee() lee normal.
 */
export async function getDeliveryFee(db = prisma) {
  const setting = await db.setting.findUnique({ where: { key: 'DELIVERY_FEE' } });
  return new Prisma.Decimal(setting?.value ?? '0');
}

/** Nombre que muestran el bot de WhatsApp y las pantallas. */
export async function getRestaurantName() {
  const setting = await prisma.setting.findUnique({ where: { key: 'RESTAURANT_NAME' } });
  return setting?.value ?? 'Restaurante';
}

/** Parámetros editables por el administrador (con su valor por defecto). */
const DEFAULTS = { DELIVERY_FEE: '5000', RESTAURANT_NAME: 'Restaurante' };

export async function getSettings() {
  const rows = await prisma.setting.findMany({ where: { key: { in: Object.keys(DEFAULTS) } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    deliveryFee: Number(map.DELIVERY_FEE ?? DEFAULTS.DELIVERY_FEE),
    restaurantName: map.RESTAURANT_NAME ?? DEFAULTS.RESTAURANT_NAME,
  };
}

/** Guarda solo los campos enviados. Afecta a los pedidos NUEVOS (los anteriores conservan su valor). */
export async function updateSettings({ deliveryFee, restaurantName }) {
  const changes = [
    deliveryFee !== undefined && ['DELIVERY_FEE', String(deliveryFee)],
    restaurantName !== undefined && ['RESTAURANT_NAME', restaurantName],
  ].filter(Boolean);
  await prisma.$transaction(
    changes.map(([key, value]) => prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })),
  );
  return getSettings();
}
