import express from 'express';
import { prisma } from './config/prisma.js';
import authRoutes from './modules/auth/auth.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import categoryRoutes from './modules/categories/category.routes.js';
import productRoutes from './modules/products/product.routes.js';
import orderRoutes from './modules/orders/order.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import deliveryPersonRoutes from './modules/delivery-persons/deliveryPerson.routes.js';
import deliveryRoutes from './modules/deliveries/delivery.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';
import simulatorRoutes from './modules/whatsapp/simulator.routes.js';
import screenRoutes from './modules/screens/screen.routes.js';
import promotionRoutes from './modules/screens/promotion.routes.js';

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/api/health', async (req, res) => {
    const [row] = await prisma.$queryRaw`
      SELECT current_database() AS database, current_user AS "user"`;
    res.json({ status: 'ok', database: row.database, user: row.user, timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  // Fase 10
  app.use('/api/delivery-persons', deliveryPersonRoutes);
  app.use('/api/deliveries', deliveryRoutes);
  app.use('/api/payments', paymentRoutes);
  // Fase 11
  app.use('/api/whatsapp-simulator', simulatorRoutes);
  app.use('/api/screens', screenRoutes);
  app.use('/api/promotions', promotionRoutes);

  app.use(notFoundHandler); // ninguna ruta coincidió
  app.use(errorHandler);    // cualquier error que ocurra arriba llega aquí
  return app;
}
