import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';

export interface DockItem {
  id: string;
  label: string;
  icon: string;
  to: string;
  badge?: string | number;
}

export const GlassDock: React.FC = () => {
  const location = useLocation();
  const { resolvedTheme, toggleTheme } = useThemeStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const navItems: DockItem[] = [
    { id: 'overview', label: 'City Vision', icon: 'buildings', to: '/' },
    { id: 'twin', label: '3D City Twin', icon: 'box-seam', to: '/live-map' },
    { id: 'report', label: 'Report Issue', icon: 'megaphone-fill', to: '/report' },
    { id: 'analytics', label: 'Intelligence', icon: 'pie-chart', to: '/analytics' },
    { id: 'dashboard', label: 'Command Center', icon: 'grid-1x2-fill', to: '/dashboard' },
  ];

  return (
    <header
      className="position-fixed bottom-0 start-50 translate-middle-x mb-4 d-flex d-lg-none"
      style={{ zIndex: 1000 }}
    >
      <div className="glass-dock d-flex align-items-center gap-1 shadow-lg">
        {/* Brand Icon */}
        <Link
          to="/"
          className="d-flex align-items-center justify-content-center p-2 rounded-circle me-1"
          style={{
            background: 'linear-gradient(135deg, #527FC7, #9FC9FF)',
            width: '38px',
            height: '38px',
            color: '#fff',
            boxShadow: '0 0 16px rgba(159, 201, 255, 0.45)',
          }}
          title="Civiora Civic Intelligence"
        >
          <i className="bi bi-shield-shaded fs-5" />
        </Link>

        {/* Navigation Items */}
        <nav aria-label="Main Navigation" className="d-flex align-items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const isHovered = hoveredId === item.id;

            return (
              <Link
                key={item.id}
                to={item.to}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="position-relative d-flex flex-column align-items-center justify-content-center px-3 py-2 rounded-pill text-decoration-none"
                style={{
                  color: isActive ? '#fff' : 'var(--cp-text-secondary)',
                  background: isActive
                    ? 'radial-gradient(100% 100% at 50% 0%, rgba(82, 127, 199, 0.45) 0%, rgba(16, 33, 58, 0.7) 100%)'
                    : isHovered
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'transparent',
                  border: isActive
                    ? '1px solid rgba(159, 201, 255, 0.45)'
                    : '1px solid transparent',
                  transform: isHovered ? 'scale(1.08) translateY(-2px)' : 'scale(1)',
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <i className={`bi bi-${item.icon} fs-5`} />
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: '0.01em',
                    lineHeight: 1.1,
                  }}
                >
                  {item.label}
                </span>

                {/* Active Underline Glow */}
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-3px',
                      width: '14px',
                      height: '3px',
                      borderRadius: '999px',
                      backgroundColor: 'var(--cp-accent-ice)',
                      boxShadow: '0 0 10px var(--cp-accent-ice)',
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--cp-glass-border)', margin: '0 4px' }} />

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="btn btn-sm text-secondary d-flex align-items-center justify-content-center rounded-circle p-2"
          style={{
            width: '36px',
            height: '36px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--cp-glass-border)',
            color: 'var(--cp-text-primary)',
          }}
          title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          <i className={`bi bi-${resolvedTheme === 'dark' ? 'sun' : 'moon-stars'} fs-6`} />
        </button>

        {/* User Account Capsule */}
        {isAuthenticated ? (
          <div className="d-flex align-items-center gap-1 ms-1">
            <Link
              to="/dashboard"
              className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill text-decoration-none"
              style={{
                background: 'rgba(10, 132, 255, 0.15)',
                border: '1px solid rgba(10, 132, 255, 0.3)',
                color: 'var(--cp-text-primary)',
                fontSize: '0.8rem',
              }}
            >
              <i className="bi bi-person-circle text-primary" />
              <span className="fw-semibold small d-none d-sm-inline">
                {user?.profile?.firstName || 'Staff'}
              </span>
            </Link>
            <button
              onClick={() => logout()}
              className="btn btn-sm btn-outline-secondary rounded-circle p-1"
              style={{ width: '32px', height: '32px' }}
              title="Sign Out"
            >
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="d-flex align-items-center gap-1 px-3 py-1 rounded-pill text-decoration-none ms-1 fw-semibold small"
            style={{
              background: 'linear-gradient(135deg, #0A84FF, #0066CC)',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(10, 132, 255, 0.4)',
            }}
          >
            <i className="bi bi-box-arrow-in-right me-1" />
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
