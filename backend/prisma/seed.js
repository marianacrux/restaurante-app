// Datos iniciales del sistema. Se puede ejecutar varias veces sin duplicar nada.
// Uso (desde backend/):  npm run db:seed
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const password = process.env.SEED_USER_PASSWORD;
if (!password || password.length < 8) {
  console.error('Defina SEED_USER_PASSWORD (mínimo 8 caracteres) en backend/.env');
  process.exit(1);
}

//datos

const USERS = [
  { name: 'Administrador', email: 'admin@restaurante.test', role: 'ADMIN' },
  { name: 'Carla Cajera', email: 'cajero@restaurante.test', role: 'CAJERO' },
  { name: 'Cocina Principal', email: 'cocina@restaurante.test', role: 'COCINA' },
  { name: 'Diego Domiciliario', email: 'domiciliario@restaurante.test', role: 'DOMICILIARIO' },
];

const CATEGORIES = [
  { name: 'Platos fuertes', position: 1 },
  { name: 'Hamburguesas', position: 2 },
  { name: 'Combos', position: 3 },
  { name: 'Bebidas', position: 4 },
  { name: 'Adicionales', position: 5 },
  { name: 'Postres', position: 6 },
];

// Precios en pesos colombianos
const PRODUCTS = [
  { name: 'Bandeja paisa', category: 'Platos fuertes', price: 28000, isDailyMenu: true, isFeatured: true },
  { name: 'Almuerzo ejecutivo', category: 'Platos fuertes', price: 18000, isDailyMenu: true },
  { name: 'Sobrebarriga en salsa', category: 'Platos fuertes', price: 26000, available: false }, // agotado, para pruebas
  { name: 'Hamburguesa clásica', category: 'Hamburguesas', price: 19000, isDailyMenu: true, isFeatured: true },
  { name: 'Hamburguesa doble', category: 'Hamburguesas', price: 25000 },
  { name: 'Combo clásico', category: 'Combos', price: 26000 },
  { name: 'Gaseosa 400 ml', category: 'Bebidas', price: 4000 },
  { name: 'Jugo natural', category: 'Bebidas', price: 6000 },
  { name: 'Limonada', category: 'Bebidas', price: 5000 },
  { name: 'Papas a la francesa', category: 'Adicionales', price: 6000 },
  { name: 'Tres leches', category: 'Postres', price: 8000 },
];

const DELIVERY_PERSONS = [
  { name: 'Diego Domiciliario', phone: '3001110001', transportType: 'MOTOCICLETA', userEmail: 'domiciliario@restaurante.test' },
  { name: 'Andrés Gómez', phone: '3001110002', transportType: 'MOTOCICLETA' },
  { name: 'Laura Ríos', phone: '3001110003', transportType: 'BICICLETA' },
  { name: 'Sofía Martínez', phone: '3001110004', transportType: 'A_PIE' },
];

const SCREENS = [
  { screenNumber: 1, name: 'Menú del día' },
  { screenNumber: 2, name: 'Promociones y combos' },
  { screenNumber: 3, name: 'Bebidas y complementos' },
  { screenNumber: 4, name: 'Publicidad y destacados' },
];

const SETTINGS = [
  { key: 'DELIVERY_FEE', value: '5000' },
  { key: 'RESTAURANT_NAME', value: 'Restaurante Demo' },
];

// FUNCIONES

async function seedUsers() {
  const passwordHash = await bcrypt.hash(password, 10); // 10 = "costo": qué tan lento es a propósito
  for (const user of USERS) {
    await prisma.user.upsert({
      where: { email: user.email },              // ¿ya existe alguien con este correo?
      update: { name: user.name, role: user.role, passwordHash },  // sí: lo actualizo
      create: { ...user, passwordHash },         // no: lo creo
    });
  }
  console.log(`✔ ${USERS.length} usuarios`);
}

async function seedCatalog() {
  const categoryIds = {};
  for (const category of CATEGORIES) {
    const saved = await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category,
    });
    categoryIds[category.name] = saved.id;
  }

  for (const { category, ...product } of PRODUCTS) {
    const data = { available: true, ...product, categoryId: categoryIds[category] };
    // El nombre del producto no es único en el esquema, así que no se puede usar upsert:
    // primero buscamos y luego decidimos si actualizar o crear.
    const existing = await prisma.product.findFirst({ where: { name: product.name } });
    if (existing) await prisma.product.update({ where: { id: existing.id }, data });
    else await prisma.product.create({ data });
  }
  console.log(`${CATEGORIES.length} categorías, ${PRODUCTS.length} productos`);
}

async function seedDeliveryPersons() {
  for (const { userEmail, ...person } of DELIVERY_PERSONS) {
    const user = userEmail ? await prisma.user.findUnique({ where: { email: userEmail } }) : null;
    const data = { ...person, userId: user?.id ?? null };
    await prisma.deliveryPerson.upsert({ where: { phone: person.phone }, update: data, create: data });
  }
  console.log(`${DELIVERY_PERSONS.length} domiciliarios`);
}

async function seedScreensAndSettings() {
  for (const screen of SCREENS) {
    await prisma.menuScreen.upsert({ where: { screenNumber: screen.screenNumber }, update: screen, create: screen });
  }
  for (const setting of SETTINGS) {
    // update vacío: si el administrador ya cambió el valor, el seed no lo pisa
    await prisma.setting.upsert({ where: { key: setting.key }, update: {}, create: setting });
  }
  console.log(`✔ ${SCREENS.length} pantallas, ${SETTINGS.length} parámetros`);
}

// Fase 11: promociones de ejemplo (vigentes 30 días desde que se ejecuta el seed)
async function seedPromotions() {
  const combo = await prisma.product.findFirst({ where: { name: 'Combo clásico' } });
  const startDate = new Date();
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const promotions = [
    { name: 'Martes de hamburguesa', description: '20% de descuento en hamburguesas los martes', discountType: 'PORCENTAJE', discountValue: 20 },
    { name: 'Combo clásico a precio especial', description: 'Ahorra $4.000 en el combo clásico', discountType: 'VALOR_FIJO', discountValue: 4000, productId: combo?.id ?? null },
  ];
  for (const promotion of promotions) {
    const data = { ...promotion, startDate, endDate, active: true };
    const existing = await prisma.promotion.findFirst({ where: { name: promotion.name } });
    if (existing) await prisma.promotion.update({ where: { id: existing.id }, data });
    else await prisma.promotion.create({ data });
  }
  console.log(`✔ ${promotions.length} promociones`);
}

// Fase 11: contenido inicial de las 4 pantallas. Solo se crea si la pantalla está VACÍA,
// para no borrar lo que el administrador haya configurado.
async function seedScreenContent() {
  const products = await prisma.product.findMany({ where: { active: true }, include: { category: true } });
  const byCategory = (...names) => products.filter((p) => names.includes(p.category.name));
  const asProduct = (p) => ({ contentType: 'PRODUCTO', productId: p.id });
  const promotions = await prisma.promotion.findMany({ where: { active: true } });

  const plan = {
    1: [...products.filter((p) => p.isDailyMenu), ...byCategory('Platos fuertes').filter((p) => !p.isDailyMenu)].map(asProduct),
    2: [...promotions.map((p) => ({ contentType: 'PROMOCION', promotionId: p.id })), ...byCategory('Combos').map(asProduct)],
    3: byCategory('Bebidas', 'Adicionales', 'Postres').map(asProduct),
    4: [
      { contentType: 'ANUNCIO', title: 'Pide por WhatsApp', description: 'Escríbenos y recibe tu pedido en casa' },
      ...products.filter((p) => p.isFeatured).map(asProduct),
      { contentType: 'ANUNCIO', title: 'Aceptamos Nequi, Daviplata y tarjeta', description: 'También efectivo y transferencia' },
    ],
  };

  let created = 0;
  for (const [number, items] of Object.entries(plan)) {
    const screen = await prisma.menuScreen.findUnique({
      where: { screenNumber: Number(number) },
      include: { _count: { select: { contents: true } } },
    });
    if (!screen || screen._count.contents > 0) continue;
    await prisma.screenContent.createMany({ data: items.map((item, position) => ({ ...item, screenId: screen.id, position })) });
    created += items.length;
  }
  console.log(`✔ ${created} contenidos de pantallas`);
}

// EJECUCIÓN

try {
  await seedUsers();
  await seedCatalog();
  await seedDeliveryPersons(); // va después de los usuarios: necesita el de Diego
  await seedScreensAndSettings();
  await seedPromotions();
  await seedScreenContent(); // va al final: usa productos, promociones y pantallas
  console.log('Seed completado');
} catch (error) {
  console.error('Error en el seed:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect(); // cierra la conexión pase lo que pase
}