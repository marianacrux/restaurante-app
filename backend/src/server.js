import 'dotenv/config';
import express from 'express';
import { prisma } from './config/Prisma.js';

const app = express();
const PORT = process.env.PORT ?? 4000;

app.get('/api/health', async (req, res) => {
  try {
    const [row] = await prisma.$queryRaw`
      SELECT current_database() AS database, current_user AS "user"`;

    res.json({
      status: 'ok',
      database: row.database,
      user: row.user,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    res.status(503).json({
      status: 'error',
      message: 'No se pudo conectar a la base de datos',
    });
  }
});

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}/api`);
});