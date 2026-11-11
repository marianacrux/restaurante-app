// crea las variables de entorno y levanta el serividor
import 'dotenv/config';
import { createApp } from './app.js';

const PORT = process.env.PORT ?? 4000;

createApp().listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}/api`);
});