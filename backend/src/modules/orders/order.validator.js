import { z } from 'zod';
import { OrderSource, OrderStatus, OrderType, PaymentMethod } from '@prisma/client';
import { phoneSchema, prismaEnum } from '../../utils/validation.js';

const customerSchema = z.object({
  name: z.string({ error: 'El nombre del cliente es obligatorio' }).trim().min(2, 'Nombre: mínimo 2 caracteres').max(120),
  phone: phoneSchema,
});

const itemSchema = z.object({
  productId: z.coerce.number({ error: 'Producto inválido' }).int().positive('Producto inválido'),
  quantity: z.coerce.number({ error: 'Cantidad inválida' }).int('La cantidad debe ser entera').min(1, 'Mínimo 1').max(99, 'Máximo 99'),
  notes: z.string().trim().max(200).nullish(), 
});

// IMPORTANTE: no hay campos de precio ni de total. Si llegan, zod los descarta.
export const createOrderSchema = z
  .object({
    source: prismaEnum(OrderSource, 'Canal de origen no válido'),
    type: prismaEnum(OrderType, 'Tipo de entrega no válido').optional(),
    customer: customerSchema.nullish(),
    items: z.array(itemSchema, { error: 'Los productos son obligatorios' }).min(1, 'El pedido debe tener al menos un producto').max(50),
    paymentMethod: prismaEnum(PaymentMethod, 'Método de pago no válido').nullish(),
    deliveryAddress: z.string().trim().min(5, 'Dirección muy corta').max(250).nullish(),
    notes: z.string().trim().max(500).nullish(),
  })
  // 1) Ajustes: un pedido del canal DOMICILIO siempre se entrega a domicilio
  .transform((o) => ({ ...o, type: o.source === 'DOMICILIO' ? 'DOMICILIO' : (o.type ?? 'EN_LOCAL') }))
  // 2) Reglas que dependen de VARIOS campos a la vez
  .superRefine((o, ctx) => {
    if (o.type === 'DOMICILIO') {
      if (!o.deliveryAddress) ctx.addIssue({ code: 'custom', path: ['deliveryAddress'], message: 'La dirección es obligatoria para domicilios' });
      if (!o.customer) ctx.addIssue({ code: 'custom', path: ['customer'], message: 'Los datos del cliente son obligatorios para domicilios' });
    } else if (o.deliveryAddress) {
      ctx.addIssue({ code: 'custom', path: ['deliveryAddress'], message: 'Solo los pedidos a domicilio llevan dirección' });
    }
    if (o.source === 'WHATSAPP' && !o.customer) {
      ctx.addIssue({ code: 'custom', path: ['customer'], message: 'Los pedidos de WhatsApp requieren nombre y teléfono' });
    }
  });

// "CONFIRMADO,LISTO" (texto de la URL) → ['CONFIRMADO', 'LISTO'] validado contra el enum. 
const statusList = z
  .string()
  .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean))
  .pipe(z.array(prismaEnum(OrderStatus, 'Estado no válido')).min(1));

export const listOrdersQuerySchema = z.object({
  status: statusList.optional(),
  source: prismaEnum(OrderSource, 'Canal no válido').optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});