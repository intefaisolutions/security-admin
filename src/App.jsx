import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import VerifyOtp from "./pages/VerifyOtp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import Societies from "./pages/Societies";
import Visitors from "./pages/Visitors";
import EmergencyAlerts from "./pages/EmergencyAlerts";
import News from "./pages/News";
import FamilyMembers from "./pages/FamilyMembers";
import Dashboard from "./pages/Dashboard";
import Residents from "./pages/Residents";
import Guards from "./pages/Guards";
import Services from "./pages/Services";
import Admins from "./pages/Admins";
import Plans from "./pages/Plans";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ChangePassword />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/societies" element={<Societies />} />
          <Route path="/residents" element={<Residents />} />
          <Route path="/family-members" element={<FamilyMembers />} />
          <Route path="/guards" element={<Guards />} />
          <Route path="/visitors" element={<Visitors />} />
          <Route path="/services" element={<Services />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/alerts" element={<EmergencyAlerts />} />
          <Route path="/news" element={<News />} />
          <Route path="/admins" element={<Admins />} />
        </Route>
      </Route>

      {/* Default Route Redirection */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Catch-all 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
