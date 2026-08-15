import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Placeholder from './pages/Placeholder'
import Inventory from './pages/Inventory'
import Sales from './pages/Sales'
import WasteLog from './pages/WasteLog'
import Orders from './pages/Orders'
import Notifications from './pages/Notifications'
import Addresses from './pages/Addresses'
import PaymentSettings from './pages/PaymentSettings'
import Forecast from './pages/Forecast'
import Reports from './pages/Reports'
import Users from './pages/Users'
import ShippingRates from './pages/ShippingRates'
import BarcodeStockout from './pages/BarcodeStockout'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderDetail from './pages/OrderDetail'
import AccountSettings from './pages/AccountSettings'
import { CartProvider } from './context/CartContext'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />

            {/* Admin + staff shared */}
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/sales" element={<Sales />} />
            <Route
              path="/barcode-stockout"
              element={
                <ProtectedRoute roles={['staff']}>
                  <BarcodeStockout />
                </ProtectedRoute>
              }
            />
            <Route path="/waste" element={<WasteLog />} />

            {/* Admin only */}
            <Route
              path="/forecast"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Forecast />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shipping-rates"
              element={
                <ProtectedRoute roles={['admin']}>
                  <ShippingRates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Reports />
                </ProtectedRoute>
              }
            />

            {/* Admin + distributor */}
            <Route path="/orders" element={<Orders />} />

            {/* Any signed-in role */}
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/payment-settings" element={<PaymentSettings />} />

            {/* Distributor only */}
            <Route
              path="/addresses"
              element={
                <ProtectedRoute roles={['distributor']}>
                  <Addresses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop"
              element={
                <ProtectedRoute roles={['distributor']}>
                  <Shop />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop/:id"
              element={
                <ProtectedRoute roles={['distributor']}>
                  <ProductDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedRoute roles={['distributor']}>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute roles={['distributor']}>
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute roles={['distributor']}>
                  <OrderDetail />
                </ProtectedRoute>
              }
            />

            {/* Any signed-in role */}
            <Route path="/account" element={<AccountSettings />} />
          </Route>
        </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
