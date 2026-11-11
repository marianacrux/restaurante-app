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

// EJECUCIÓN

try {
  await seedUsers();
  await seedCatalog();
  await seedDeliveryPersons(); // va después de los usuarios: necesita el de Diego
  await seedScreensAndSettings();
  console.log('Seed completado');
} catch (error) {
  console.error('Error en el seed:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect(); // cierra la conexión pase lo que pase
}