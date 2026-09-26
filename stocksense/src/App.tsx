import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";

import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import ForgotPassword from "@/pages/auth/ForgotPassword";

import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/products/Products";
import ImportInventory from "@/pages/products/ImportInventory";
import Receipts from "@/pages/operations/Receipts";
import DeliveryOrders from "@/pages/operations/DeliveryOrders";
import Transfers from "@/pages/operations/Transfers";
import Adjustments from "@/pages/operations/Adjustments";
import MoveHistory from "@/pages/operations/MoveHistory";
import Warehouses from "@/pages/settings/Warehouses";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Authenticated */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/products/import" element={<ProtectedRoute><ImportInventory /></ProtectedRoute>} />
      <Route path="/operations/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
      <Route path="/operations/deliveries" element={<ProtectedRoute><DeliveryOrders /></ProtectedRoute>} />
      <Route path="/operations/transfers" element={<ProtectedRoute><Transfers /></ProtectedRoute>} />
      <Route path="/operations/adjustments" element={<ProtectedRoute><Adjustments /></ProtectedRoute>} />
      <Route path="/operations/history" element={<ProtectedRoute><MoveHistory /></ProtectedRoute>} />
      <Route path="/settings/warehouses" element={<ProtectedRoute><Warehouses /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
