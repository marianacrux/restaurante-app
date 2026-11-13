import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import StatusPage from './pages/StatusPage.jsx';
import HomePage from './pages/HomePage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import KitchenPage from './pages/kitchen/KitchenPage.jsx';

export default function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/estado" element={<StatusPage />} />

      <Route element={<ProtectedRoute />}>
        {/* Cocina: pantalla completa, SIN el menú lateral */}
        <Route element={<ProtectedRoute roles={['ADMIN', 'CAJERO', 'COCINA']} />}>
          <Route path="/cocina" element={<KitchenPage />} />
        </Route>

        {/* Con el menú lateral */}
        <Route element={<AppLayout />}>
          <Route path="/inicio" element={<HomePage />} />
          <Route element={<ProtectedRoute roles={['ADMIN', 'CAJERO', 'COCINA']} />}>
            <Route path="/pedidos" element={<OrdersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/inicio" replace />} />
    </Routes>
  );
}