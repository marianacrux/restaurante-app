import express from 'express';
import { prisma } from './config/prisma.js';
import authRoutes from './modules/auth/auth.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/api/health', async (req, res) => {
    const [row] = await prisma.$queryRaw`
      SELECT current_database() AS database, current_user AS "user"`;
    res.json({ status: 'ok', database: row.database, user: row.user, timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);

  app.use(notFoundHandler); // ninguna ruta coincidió 
  app.use(errorHandler);    // cualquier error que ocurra arriba llega aquí
  return app;
}