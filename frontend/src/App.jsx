import { lazy, Suspense } from 'react';
import { Center, Loader } from '@mantine/core';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import { useAuth } from './hooks/useAuth.js';
import { homeFor } from './auth/access.js';
import LoginPage from './pages/LoginPage.jsx';

// Cada página se descarga solo cuando se abre (lazy): el login carga rápido
// y el domiciliario nunca descarga el código del dashboard, por ejemplo.
const StatusPage = lazy(() => import('./pages/StatusPage.jsx'));
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const OrdersPage = lazy(() => import('./pages/OrdersPage.jsx'));
const KitchenPage = lazy(() => import('./pages/kitchen/KitchenPage.jsx'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage.jsx'));
const DeliveriesPage = lazy(() => import('./pages/deliveries/DeliveriesPage.jsx'));
const MyDeliveriesPage = lazy(() => import('./pages/deliveries/MyDeliveriesPage.jsx'));
const PaymentsPage = lazy(() => import('./pages/payments/PaymentsPage.jsx'));
const WhatsAppSimulatorPage = lazy(() => import('./pages/whatsapp/WhatsAppSimulatorPage.jsx'));
const ScreensAdminPage = lazy(() => import('./pages/screens/ScreensAdminPage.jsx'));
const DisplayScreenPage = lazy(() => import('./pages/screens/DisplayScreenPage.jsx'));

/** "/" y rutas desconocidas: cada rol va a SU página principal (o al login). */
function HomeRedirect() {
  const { user, status } = useAuth();
  if (status === 'loading') return null;
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

const pageLoader = (
  <Center h="60vh">
    <Loader />
  </Center>
);

// Qué rol puede abrir cada ruta se define en auth/access.js (ProtectedRoute lo consulta).
export default function App() {
  return (
    <Suspense fallback={pageLoader}>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/estado" element={<StatusPage />} />
        <Route path="/pantalla/:number" element={<DisplayScreenPage />} /> {/* televisores */}

        <Route element={<ProtectedRoute />}>
          {/* Cocina: pantalla completa, sin menú lateral */}
          <Route path="/cocina" element={<KitchenPage />} />

          {/* Con menú lateral */}
          <Route element={<AppLayout />}>
            <Route path="/inicio" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pedidos" element={<OrdersPage />} />
            <Route path="/domicilios" element={<DeliveriesPage />} />
            <Route path="/mis-entregas" element={<MyDeliveriesPage />} />
            <Route path="/pagos" element={<PaymentsPage />} />
            <Route path="/whatsapp" element={<WhatsAppSimulatorPage />} />
            <Route path="/pantallas" element={<ScreensAdminPage />} />
          </Route>
        </Route>

        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </Suspense>
  );
}
