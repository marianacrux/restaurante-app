// Carga las variables de entorno y levanta el servidor HTTP + Socket.IO
import 'dotenv/config';
import http from 'node:http';
import { createApp } from './app.js';
import { initSocket } from './realtime/socket.js';
import { startReportScheduler } from './modules/reports/report.scheduler.js';

const PORT = process.env.PORT ?? 4000;

// Express y Socket.IO comparten el mismo servidor y el mismo puerto
const server = http.createServer(createApp());
initSocket(server);

server.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}/api (tiempo real activo)`);
  startReportScheduler(); // reporte automático cada hora en el Excel de la empresa
});
