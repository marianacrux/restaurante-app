import { PrismaClient } from '@prisma/client';

// Una única instancia para toda la aplicación.
// Cada PrismaClient abre su propio grupo de conexiones a PostgreSQL;
// crear uno por archivo agotaría las conexiones disponibles.
export const prisma = new PrismaClient();