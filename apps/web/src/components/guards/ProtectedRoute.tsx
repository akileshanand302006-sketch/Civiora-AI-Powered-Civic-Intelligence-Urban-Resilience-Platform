// ============================================================
// CivicPulse Protected Route Guards
// Enforces Authentication and Location Selection Requirements
// ============================================================

import React, { useEffect } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useLocationStore } from '../../stores/locationStore';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { openAuthGate } = useLocationStore();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      openAuthGate(
        'Please sign in to access protected CivicPulse municipal operations.',
        location.pathname
      );
    }
  }, [isLoading, isAuthenticated, location.pathname, openAuthGate]);

  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-50 py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const LocationRequiredRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { selectedLocation } = useLocationStore();
  const location = useLocation();

  if (!selectedLocation && location.pathname !== '/setup-location') {
    return <Navigate to={`/setup-location?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
