// ============================================================
// CivicPulse Web App Root & Routing
// Authentication-First + Location-Required Guard Architecture
// ============================================================

import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { PublicLayout } from './layouts/PublicLayout';
import { LandingPage } from './pages/landing/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { LocationSetupPage } from './pages/location/LocationSetupPage';
import { ContactPage } from './pages/contact/ContactPage';
import { ReportIncidentPage } from './pages/citizen/ReportIncidentPage';
import { LiveCityMapPage } from './pages/map/LiveCityMapPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProtectedRoute, LocationRequiredRoute } from './components/guards/ProtectedRoute';
import { GlassNotificationCapsule } from './design-system/components/GlassNotificationCapsule';
import { useToastStore } from './stores/toastStore';

export const App: React.FC = () => {
  const { initialize } = useAuthStore();
  const { toasts, removeToast } = useToastStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <Routes>
      <Route element={<PublicLayout />}>
        {/* ── Public Routes (Freely Accessible) ─────────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ── Authenticated Route: Location Setup & Confirmation */}
        <Route
          path="/setup-location"
          element={
            <ProtectedRoute>
              <LocationSetupPage />
            </ProtectedRoute>
          }
        />

        {/* ── Protected + Location-Required Operations ────────── */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <LocationRequiredRoute>
                <DashboardPage />
              </LocationRequiredRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <LocationRequiredRoute>
                <ReportIncidentPage />
              </LocationRequiredRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/live-map"
          element={
            <ProtectedRoute>
              <LocationRequiredRoute>
                <LiveCityMapPage />
              </LocationRequiredRoute>
            </ProtectedRoute>
          }
        />
        <Route path="/analytics" element={<Navigate to="/dashboard" replace />} />

        {/* Fallback Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    <GlassNotificationCapsule notifications={toasts} onDismiss={removeToast} />
  </>
  );
};

export default App;
