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