// ============================================================
// CivicPulse Location Access Authentication Gate Modal
// Liquid Glass Auth Gate before granting access to civic operations
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocationStore } from '../../stores/locationStore';
import { GlassSurface, GlassButton } from '../../design-system/components';

export const AuthGateModal: React.FC = () => {
  const { isAuthGateOpen, authGateMessage, authGateRedirectUrl, closeAuthGate } = useLocationStore();
  const navigate = useNavigate();

  if (!isAuthGateOpen) return null;

  const handleSignIn = () => {
    closeAuthGate();
    navigate(`/login?redirect=${encodeURIComponent(authGateRedirectUrl || '/setup-location')}`);
  };

  const handleRegister = () => {
    closeAuthGate();
    navigate(`/register?redirect=${encodeURIComponent(authGateRedirectUrl || '/setup-location')}`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 10, 16, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={closeAuthGate}
    >
      <div
        style={{ width: '100%', maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <GlassSurface
          tier="ultra"
          depth="3d"
          glow
          style={{
            borderRadius: '28px',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 30px 90px rgba(0, 0, 0, 0.8), 0 0 60px rgba(10, 132, 255, 0.3)',
          }}
        >
          {/* Hologram Shield & Location Beacon Icon */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #0A84FF, #64D2FF)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              marginBottom: '1.25rem',
              boxShadow: '0 0 25px rgba(10, 132, 255, 0.5)',
            }}
          >
            <i className="bi bi-geo-alt-fill fs-3" />
          </div>

          <span
            className="text-uppercase small fw-bold d-block mb-1"
            style={{ color: '#64D2FF', letterSpacing: '0.12em', fontSize: '0.78rem' }}
          >
            LOCATION ACCESS GATE
          </span>

          <h3 className="fw-extrabold mb-3 tracking-tight" style={{ color: 'var(--cp-text-primary)' }}>
            Sign In to Focus CivicPulse
          </h3>

          <p className="text-secondary small mb-4" style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>
            {authGateMessage ||
              'Sign in to CivicPulse before selecting your civic area. Your selected location helps CivicPulse provide relevant municipal alerts, real-time response times, and localized 3D digital twin services.'}
          </p>

          <div className="d-flex flex-column gap-2 mb-3">
            <GlassButton
              variant="primary"
              size="lg"
              icon="shield-lock-fill"
              onClick={handleSignIn}
              className="w-100"
            >
              Sign In to CivicPulse
            </GlassButton>
            <GlassButton
              variant="secondary"
              size="lg"
              icon="person-plus"
              onClick={handleRegister}
              className="w-100"
            >
              Create Account
            </GlassButton>
          </div>

          <button
            type="button"
            onClick={closeAuthGate}
            className="btn btn-sm btn-link text-secondary"
            style={{ textDecoration: 'none', fontSize: '0.82rem' }}
          >
            Cancel and Return
          </button>
        </GlassSurface>
      </div>
    </div>
  );
};

export default AuthGateModal;
