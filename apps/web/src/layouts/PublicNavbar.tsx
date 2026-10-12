// ============================================================
// CivicPulse Apple-Inspired Floating Liquid Glass Navbar
// Top-Center Floating Pill + Location Switcher + Scroll Morphing + 3D Orb Glyph
// ============================================================

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useThemeStore } from '../stores/themeStore';
import { useAuthStore } from '../stores/authStore';
import { useLocationStore } from '../stores/locationStore';
import { GlassSurface } from '../design-system/components';

export const PublicNavbar: React.FC = () => {
  const location = useLocation();
  const { resolvedTheme, toggleTheme } = useThemeStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { selectedLocation, openLocationModal, openAuthGate } = useLocationStore();

  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Overview', to: '/', icon: 'house-door' },
    { label: 'Live City Map', to: '/live-map', icon: 'map', badge: '3D' },
    { label: 'Report Issue', to: '/report', icon: 'megaphone' },
    { label: 'Command Center', to: '/dashboard', icon: 'speedometer2', requiresAuth: true },
  ];

  const handleProtectedClick = (e: React.MouseEvent, to: string, requiresAuth?: boolean) => {
    if (requiresAuth && !isAuthenticated) {
      e.preventDefault();
      openAuthGate('Please sign in to access the CivicPulse Command Center.', to);
    }
  };

  const currentCity = selectedLocation?.name || selectedLocation?.city || 'Select Area';

  return (
    <header
      className="fixed-top px-3 py-2 d-flex justify-content-center pointer-events-none"
      style={{ zIndex: 1000 }}
    >
      <div
        className="pointer-events-auto"
        style={{
          width: '100%',
          maxWidth: isScrolled ? '1080px' : '1180px',
          transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <GlassSurface
          tier="ultra"
          depth="3d"
          glow
          className="d-flex align-items-center justify-content-between px-3 px-md-4"
          style={{
            height: isScrolled ? '56px' : '64px',
            borderRadius: '999px',
            boxShadow: isScrolled
              ? '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(10, 132, 255, 0.2)'
              : '0 12px 35px rgba(0, 0, 0, 0.4), 0 0 20px rgba(10, 132, 255, 0.15)',
            transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* ── LEFT: 3D Mini Hologram Orb & Brand ─────────────── */}
          <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
            {/* Miniature Pulsating 3D Orb Glyph */}
            <div
              style={{
                width: isScrolled ? '32px' : '36px',
                height: isScrolled ? '32px' : '36px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #9FC9FF 0%, #527FC7 60%, #050A14 100%)',
                boxShadow: '0 0 16px rgba(159, 201, 255, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all 0.3s ease',
              }}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 0 8px #9FC9FF',
                }}
                className="animate-pulse-glow"
              />
            </div>

            <div>
              <div className="d-flex align-items-center gap-1">
                <span
                  className="fw-extrabold tracking-tight d-block lh-1 text-white"
                  style={{
                    fontSize: isScrolled ? '1rem' : '1.15rem',
                    letterSpacing: '-0.02em',
                  }}
                >
                  CIVIORA
                </span>
                <span
                  className="badge rounded-pill text-uppercase d-none d-sm-inline-block"
                  style={{
                    fontSize: '0.6rem',
                    background: 'rgba(82, 127, 199, 0.2)',
                    color: '#9FC9FF',
                    border: '1px solid rgba(159, 201, 255, 0.3)',
                    padding: '2px 6px',
                  }}
                >
                  AI OS
                </span>
              </div>
            </div>
          </Link>

          {/* ── CENTER: Fluid Active Indicator Navigation ───────── */}
          <nav className="d-none d-lg-flex align-items-center gap-1 position-relative p-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              const isHovered = hoveredPath === link.to;

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={(e) => handleProtectedClick(e, link.to, link.requiresAuth)}
                  onMouseEnter={() => setHoveredPath(link.to)}
                  onMouseLeave={() => setHoveredPath(null)}
                  className="position-relative d-flex align-items-center gap-2 px-3 py-1 text-decoration-none rounded-pill"
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#FFFFFF' : 'var(--cp-text-secondary)',
                    background: isActive
                      ? 'radial-gradient(100% 100% at 50% 0%, rgba(82, 127, 199, 0.35) 0%, rgba(16, 33, 58, 0.6) 100%)'
                      : isHovered
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'transparent',
                    border: isActive
                      ? '1px solid rgba(159, 201, 255, 0.35)'
                      : '1px solid transparent',
                    boxShadow: isActive
                      ? 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.35), 0 0 16px rgba(159, 201, 255, 0.22)'
                      : 'none',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <i className={`bi bi-${link.icon}`} style={{ fontSize: '0.9rem' }} />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: '#9FC9FF',
                        fontWeight: 'bold',
                      }}
                    >
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ── RIGHT: Location Switcher + Theme + Profile ──────── */}
          <div className="d-flex align-items-center gap-2">
            {/* 📍 Active Location Capsule Switcher */}
            <button
              onClick={openLocationModal}
              className="btn btn-sm d-flex align-items-center gap-2 rounded-pill px-3 py-1"
              style={{
                background: selectedLocation
                  ? 'rgba(82, 127, 199, 0.18)'
                  : 'rgba(255, 159, 10, 0.18)',
                border: `1px solid ${
                  selectedLocation ? 'rgba(159, 201, 255, 0.35)' : 'rgba(255, 159, 10, 0.4)'
                }`,
                color: selectedLocation ? '#9FC9FF' : '#FF9F0A',
                fontSize: '0.8rem',
                fontWeight: 600,
                maxWidth: '180px',
                transition: 'all 0.2s ease',
              }}
              title="Click to switch active civic area or saved places"
            >
              <i className="bi bi-geo-alt-fill" style={{ fontSize: '0.85rem' }} />
              <span className="text-truncate">{currentCity}</span>
              <i className="bi bi-chevron-down" style={{ fontSize: '0.65rem', opacity: 0.7 }} />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="btn btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center"
              style={{
                width: '34px',
                height: '34px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--cp-glass-border)',
                color: 'var(--cp-text-primary)',
              }}
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              <i className={`bi bi-${resolvedTheme === 'dark' ? 'sun' : 'moon-stars'} fs-6`} />
            </button>

            {/* User Session Profile / Sign In Capsule */}
            {isAuthenticated ? (
              <div className="d-flex align-items-center gap-1">
                <Link
                  to="/dashboard"
                  className="btn btn-sm rounded-pill px-2 py-1 d-flex align-items-center gap-2 text-decoration-none"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--cp-glass-border)',
                    color: 'var(--cp-text-primary)',
                    fontSize: '0.78rem',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(82, 127, 199, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      color: '#9FC9FF',
                    }}
                  >
                    {user?.profile?.firstName?.[0] || 'U'}
                  </div>
                  <span className="d-none d-md-inline fw-semibold">
                    {user?.profile?.firstName || 'User'}
                  </span>
                </Link>

                <button
                  onClick={() => logout()}
                  className="btn btn-sm rounded-circle p-1 text-secondary"
                  title="Sign Out"
                  style={{ width: '30px', height: '30px' }}
                >
                  <i className="bi bi-box-arrow-right fs-6" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="text-decoration-none">
                <button
                  className="btn btn-sm rounded-pill px-3 py-1 fw-semibold text-white"
                  style={{
                    fontSize: '0.82rem',
                    background: 'radial-gradient(100% 100% at 50% 0%, #6392DF 0%, #375994 100%)',
                    border: '1px solid rgba(159, 201, 255, 0.45)',
                    boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.4), 0 0 16px rgba(82, 127, 199, 0.3)',
                  }}
                >
                  Sign In
                </button>
              </Link>
            )}
          </div>
        </GlassSurface>
      </div>
    </header>
  );
};

export default PublicNavbar;
