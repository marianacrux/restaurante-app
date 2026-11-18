# Sistema de gestión de pedidos para restaurante

Plataforma que centraliza los pedidos de **WhatsApp, vitrina, punto de venta y domicilios**: cocina con anuncios de voz,
domicilios, pagos, dashboard, pantallas digitales, actualización en tiempo real y reporte automático cada hora en Excel.

| Capa | Tecnología |
|---|---|
| Frontend | React 19 · Vite · React Router · Mantine · Socket.IO client |
| Backend | Node.js · Express 5 · zod · JWT · Socket.IO · ExcelJS · multer |
| Base de datos | PostgreSQL · Prisma 6 |

## Desarrollo local

```bash
# backend/
cp .env.example .env        # complete DATABASE_URL, JWT_SECRET, SEED_USER_PASSWORD
npm install
npx prisma migrate dev
npm run db:seed             # usuarios, catálogo, domiciliarios, pantallas
npm run db:demo             # (opcional) 7 días de pedidos de demostración
npm run dev                 # http://localhost:4000/api

# frontend/
npm install
npm run dev                 # http://localhost:5173
```

Usuarios de prueba (contraseña = `SEED_USER_PASSWORD`):
`admin@restaurante.test`, `cajero@restaurante.test`, `cocina@restaurante.test`, `domiciliario@restaurante.test`.

## Despliegue (demo en internet)

```
Navegador ──► Vercel (frontend) ──/api, /uploads──► Render (backend) ──► Neon (PostgreSQL)
          └──────────── WebSocket directo (tiempo real) ──────┘
```

- **Vercel** sirve el frontend y reenvía `/api` y `/uploads` al backend (`frontend/vercel.json`).
- **Render** ejecuta el backend como proceso permanente: Vercel no admite WebSockets ni tareas cada hora.
- **Neon** aloja PostgreSQL.

### 1. Base de datos en Neon
1. Cree un proyecto en <https://neon.tech> (región **US East**).
2. Copie la *connection string* **directa** (sin `-pooler`), con `?sslmode=require`.

### 2. Backend en Render
1. Suba el repositorio a GitHub.
2. En <https://render.com>: **New → Blueprint** → elija el repositorio (usa `render.yaml`).
3. Complete las variables que pide:
   - `DATABASE_URL`: la de Neon
   - `SEED_USER_PASSWORD`: contraseña para las cuentas de demo (mínimo 8 caracteres)
   - `FRONTEND_URL` y `PUBLIC_APP_URL`: déjelas vacías por ahora (paso 4)
4. Al terminar, anote la URL del servicio, por ejemplo `https://restaurante-api-3n6k.onrender.com`,
   y compruebe `https://restaurante-api-3n6k.onrender.com/api/health`.
5. Cargue los datos **una sola vez** desde su computador (carpeta `backend/`):
   ```bash
   DATABASE_URL="<url de Neon>" npm run db:seed
   DATABASE_URL="<url de Neon>" npm run db:demo
   ```

### 3. Frontend en Vercel
1. Si la URL de Render no es `restaurante-api.onrender.com`, cámbiela en `frontend/vercel.json` y haga push.
2. En <https://vercel.com>: **Add New → Project** → elija el repositorio.
   - **Root Directory**: `frontend` (Vercel detecta Vite).
   - Variable de entorno `VITE_SOCKET_URL` = URL de Render.
3. **Deploy**. Anote la URL, por ejemplo `https://restaurante-app.vercel.app`.

### 4. Conectar ambos
En Render → *Environment*: `FRONTEND_URL` y `PUBLIC_APP_URL` = URL de Vercel. Guarde (se reinicia solo).

### Limitaciones del plan gratuito
- Render **se duerme tras 15 minutos sin uso**; la primera visita tarda unos 50 segundos.
  Abra la app unos minutos antes de presentar.
- El disco de Render **no es permanente**: las imágenes subidas y el Excel se pierden al reiniciar o volver a desplegar.
  Para la demo, suba las fotos el mismo día o use URLs de imágenes; el Excel se descarga desde **Reportes Excel**.
  Para producción: plan con disco persistente o almacenamiento externo (S3, Cloudinary).
- Mientras el servidor duerme no se generan reportes; al despertar recupera solo la última hora.

## Páginas para la presentación

| Ruta | Para quién |
|---|---|
| `/login` | Personal (cada rol entra a su pantalla) |
| `/cocina` | Tablet o TV de cocina (toque "activar anuncios de voz") |
| `/pantalla/1` … `/pantalla/4` | Televisores, sin sesión (doble clic: pantalla completa) |
| `/seguimiento` | Clientes: número de pedido + celular |
| `/whatsapp` | Simulador del bot (cajero o administrador) |
