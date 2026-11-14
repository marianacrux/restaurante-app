import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import StatusPage from './pages/StatusPage.jsx';
import HomePage from './pages/HomePage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import KitchenPage from './pages/kitchen/KitchenPage.jsx';
import DashboardPage from './pages/dashboard/DashboardPage.jsx';
import DeliveriesPage from './pages/deliveries/DeliveriesPage.jsx';
import MyDeliveriesPage from './pages/deliveries/MyDeliveriesPage.jsx';
import PaymentsPage from './pages/payments/PaymentsPage.jsx';
import WhatsAppSimulatorPage from './pages/whatsapp/WhatsAppSimulatorPage.jsx';
import ScreensAdminPage from './pages/screens/ScreensAdminPage.jsx';
import DisplayScreenPage from './pages/screens/DisplayScreenPage.jsx';

export default function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/estado" element={<StatusPage />} />
      <Route path="/pantalla/:number" element={<DisplayScreenPage />} /> {/* televisores */}

      <Route element={<ProtectedRoute />}>
        {/* Cocina: pantalla completa, SIN el menú lateral */}
        <Route element={<ProtectedRoute roles={['ADMIN', 'CAJERO', 'COCINA']} />}>
          <Route path="/cocina" element={<KitchenPage />} />
        </Route>

        {/* Con el menú lateral */}
        <Route element={<AppLayout />}>
          <Route path="/inicio" element={<HomePage />} />
          <Route element={<ProtectedRoute roles={['ADMIN', 'CAJERO']} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/domicilios" element={<DeliveriesPage />} />
            <Route path="/pagos" element={<PaymentsPage />} />
            <Route path="/whatsapp" element={<WhatsAppSimulatorPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['ADMIN', 'CAJERO', 'COCINA']} />}>
            <Route path="/pedidos" element={<OrdersPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['DOMICILIARIO']} />}>
            <Route path="/mis-entregas" element={<MyDeliveriesPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/pantallas" element={<ScreensAdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/inicio" replace />} />
    </Routes>
  );
}
