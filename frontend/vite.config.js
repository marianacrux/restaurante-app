import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// En desarrollo, Vite reenvía al backend (puerto 4000):
//   /api        → API REST
//   /uploads    → imágenes subidas
//   /socket.io  → avisos en tiempo real (WebSocket)
const BACKEND = 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': BACKEND,
      '/uploads': BACKEND,
      '/socket.io': { target: BACKEND, ws: true },
    },
  },
});
