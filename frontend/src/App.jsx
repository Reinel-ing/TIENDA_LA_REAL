import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import Categorias from './pages/Categorias'
import Ventas from './pages/Ventas'
import VentasHistorial from './pages/VentasHistorial'
import Clientes from './pages/Clientes'
import Caja from './pages/Caja'
import Reportes from './pages/Reportes'
import Pedidos from './pages/Pedidos'
import Transferencias from './pages/Transferencias'
import Promociones from './pages/Promociones'
import Difusion from './pages/Difusion'
import Configuracion from './pages/Configuracion'
import Catalogo from './pages/Catalogo'
import CatalogoConfirmado from './pages/CatalogoConfirmado'
import Factura from './pages/Factura'

const Admin = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Rutas públicas (sin login) */}
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/catalogo/confirmado/:id" element={<CatalogoConfirmado />} />
        <Route path="/factura/:id" element={<Factura />} />

        {/* Panel admin (requiere login) */}
        <Route element={<Admin><Layout /></Admin>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/ventas/historial" element={<VentasHistorial />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/caja" element={<Caja />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/transferencias" element={<Transferencias />} />
          <Route path="/promociones" element={<Promociones />} />
          <Route path="/difusion" element={<Difusion />} />
          <Route path="/configuracion" element={<Configuracion />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
