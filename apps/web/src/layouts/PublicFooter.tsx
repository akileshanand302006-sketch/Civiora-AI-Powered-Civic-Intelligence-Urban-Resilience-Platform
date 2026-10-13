// ============================================================
// Civiora Premium Liquid Glass Spatial Footer
// Apple-Inspired GovTech Design System + Semantic SPA Navigation
// Multi-Column Responsive + Dynamic Copyright + Statewide Coverage
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';

export const PublicFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      id="civiora-global-footer"
      className="position-relative mt-auto border-top"
      style={{
        zIndex: 10,
        backgroundColor: 'rgba(5, 10, 22, 0.82)',
        backdropFilter: 'blur(28px) saturate(190%)',
        WebkitBackdropFilter: 'blur(28px) saturate(190%)',
        borderColor: 'rgba(159, 201, 255, 0.14)',
        boxShadow: '0 -20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Subtle Top Ambient Glow Accent */}
      <div
        className="position-absolute top-0 start-50 translate-middle-x pointer-events-none"
        style={{
          width: '60%',
          height: '1px',
          background:
            'radial-gradient(ellipse at center, rgba(159, 201, 255, 0.45) 0%, rgba(82, 127, 199, 0) 70%)',
          filter: 'blur(1px)',
        }}
        aria-hidden="true"
      />

      <div
        className="container py-5 px-3 px-sm-4 px-lg-5"
        style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="row g-4 g-lg-5 justify-content-between">
          {/* ── COLUMN 1: Brand & Civic Mission ─────────────────── */}
          <div className="col-12 col-md-5 col-lg-4">
            <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none mb-3">
              {/* Miniature Pulsating 3D Orb Glyph */}
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #9FC9FF 0%, #527FC7 60%, #050A14 100%)',
                  boxShadow: '0 0 16px rgba(159, 201, 255, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
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

              <div className="d-flex align-items-center gap-2">
                <span
                  className="fw-extrabold tracking-tight text-white fs-5 lh-1"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  CIVIORA
                </span>
                <span
                  className="badge rounded-pill text-uppercase"
                  style={{
                    fontSize: '0.62rem',
                    background: 'rgba(82, 127, 199, 0.22)',
                    color: '#9FC9FF',
                    border: '1px solid rgba(159, 201, 255, 0.35)',
                    padding: '2px 7px',
                  }}
                >
                  AI OS
                </span>
              </div>
            </Link>

            <p
              className="small mb-4"
              style={{
                color: 'rgba(226, 232, 240, 0.72)',
                lineHeight: 1.6,
                fontSize: '0.88rem',
              }}
            >
              Intelligent civic infrastructure for more responsive, resilient communities.
              Bridging citizens, municipal responders, and administrative leadership with real-time
              spatial intelligence and automated risk mitigation.
            </p>

            {/* Social / Developer Ecosystem Badges */}
            <div className="d-flex align-items-center gap-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center text-decoration-none"
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#9FC9FF',
                  transition: 'all 0.2s ease',
                }}
                title="GitHub Repository"
                aria-label="GitHub Repository"
              >
                <i className="bi bi-github fs-6" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center text-decoration-none"
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#9FC9FF',
                  transition: 'all 0.2s ease',
                }}
                title="Official Updates on X"
                aria-label="Official Updates on X"
              >
                <i className="bi bi-twitter-x fs-6" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center text-decoration-none"
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#9FC9FF',
                  transition: 'all 0.2s ease',
                }}
                title="Civiora Network"
                aria-label="Civiora Network"
              >
                <i className="bi bi-linkedin fs-6" />
              </a>
            </div>
          </div>

          {/* ── COLUMN 2: Core SPA Navigation ────────────────────── */}
          <div className="col-6 col-md-3 col-lg-2">
            <h6
              className="fw-bold small text-uppercase mb-3 tracking-wider"
              style={{ color: '#9FC9FF', letterSpacing: '0.06em', fontSize: '0.78rem' }}
            >
              Navigation
            </h6>
            <ul className="list-unstyled d-flex flex-column gap-2 mb-0" style={{ fontSize: '0.85rem' }}>
              <li>
                <Link
                  to="/"
                  className="text-decoration-none d-inline-flex align-items-center gap-1.5 transition-all"
                  style={{ color: 'rgba(226, 232, 240, 0.7)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(226, 232, 240, 0.7)')}
                >
                  <i className="bi bi-house-door text-secondary me-1" style={{ fontSize: '0.8rem' }} />
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  to="/live-map"
                  className="text-decoration-none d-inline-flex align-items-center gap-1.5 transition-all"
                  style={{ color: 'rgba(226, 232, 240, 0.7)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(226, 232, 240, 0.7)')}
                >
                  <i className="bi bi-map text-secondary me-1" style={{ fontSize: '0.8rem' }} />
                  Live City Map
                </Link>
              </li>
              <li>
                <Link
                  to="/report"
                  className="text-decoration-none d-inline-flex align-items-center gap-1.5 transition-all"
                  style={{ color: 'rgba(226, 232, 240, 0.7)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(226, 232, 240, 0.7)')}
                >
                  <i className="bi bi-megaphone text-secondary me-1" style={{ fontSize: '0.8rem' }} />
                  Report Issue
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="text-decoration-none d-inline-flex align-items-center gap-1.5 transition-all"
                  style={{ color: 'rgba(226, 232, 240, 0.7)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(226, 232, 240, 0.7)')}
                >
                  <i className="bi bi-speedometer2 text-secondary me-1" style={{ fontSize: '0.8rem' }} />
                  Command Center
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-decoration-none d-inline-flex align-items-center gap-1.5 transition-all"
                  style={{ color: 'rgba(226, 232, 240, 0.7)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(226, 232, 240, 0.7)')}
                >
                  <i className="bi bi-envelope text-secondary me-1" style={{ fontSize: '0.8rem' }} />
                  Contact Center
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-decoration-none d-inline-flex align-items-center gap-1.5 transition-all"
                  style={{ color: 'rgba(226, 232, 240, 0.7)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(226, 232, 240, 0.7)')}
                >
                  <i className="bi bi-person-circle text-secondary me-1" style={{ fontSize: '0.8rem' }} />
                  Citizen Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* ── COLUMN 3: Platform Capabilities ─────────────────── */}
          <div className="col-6 col-md-4 col-lg-3">
            <h6
              className="fw-bold small text-uppercase mb-3 tracking-wider"
              style={{ color: '#9FC9FF', letterSpacing: '0.06em', fontSize: '0.78rem' }}
            >
              Platform
            </h6>
            <ul className="list-unstyled d-flex flex-column gap-2 mb-0" style={{ fontSize: '0.85rem' }}>
              <li>
                <Link
                  to="/live-map"
                  className="text-decoration-none d-inline-flex align-items-center gap-1.5 transition-all"
                  style={{ color: 'rgba(226, 232, 240, 0.7)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(226, 232, 240, 0.7)')}
                >
                  <i className="bi bi-buildings text-secondary me-1" style={{ fontSize: '0.8rem' }} />
                  3D Digital Twin Mesh
                </Link>
              </li>
              <li>
                <Link
                  to="/report"
                  className="text-decoration-none d-inline-flex align-items-center gap-1.5 transition-all"
                  style={{ color: 'rgba(226, 232, 240, 0.7)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(226, 232, 240, 0.7)')}
                >
                  <i className="bi bi-eye text-secondary me-1" style={{ fontSize: '0.8rem' }} />
                  AI Vision & YOLO11 Pipeline
                </Link>
              </li>
              <li>
                <Link
                  to="/report"
                  className="text-decoration-none d-inline-flex align-items-center gap-1.5 transition-all"
                  style={{ color: 'rgba(226, 232, 240, 0.7)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(226, 232, 240, 0.7)')}
                >
                  <i className="bi bi-shield-check text-secondary me-1" style={{ fontSize: '0.8rem' }} />
                  Automated Incident Verification
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="text-decoration-none d-inline-flex align-items-center gap-1.5 transition-all"
                  style={{ color: 'rgba(226, 232, 240, 0.7)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(226, 232, 240, 0.7)')}
                >
                  <i className="bi bi-graph-up-arrow text-secondary me-1" style={{ fontSize: '0.8rem' }} />
                  Spatial Risk Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* ── COLUMN 4: Coverage & Operational Status ──────────── */}
          <div className="col-12 col-md-12 col-lg-3">
            <h6
              className="fw-bold small text-uppercase mb-3 tracking-wider"
              style={{ color: '#9FC9FF', letterSpacing: '0.06em', fontSize: '0.78rem' }}
            >
              Statewide Coverage
            </h6>

            {/* Tamil Nadu Coverage Glass Capsule */}
            <div
              className="p-3 rounded-4 mb-3"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(159, 201, 255, 0.18)',
                boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.08)',
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="fw-semibold text-white small d-flex align-items-center gap-1.5">
                  <i className="bi bi-geo-alt-fill" style={{ color: '#9FC9FF' }} />
                  Tamil Nadu, India
                </span>
                <span
                  className="badge rounded-pill"
                  style={{
                    fontSize: '0.65rem',
                    background: 'rgba(48, 209, 88, 0.15)',
                    color: '#30D158',
                    border: '1px solid rgba(48, 209, 88, 0.3)',
                  }}
                >
                  38 Districts Active
                </span>
              </div>
              <p
                className="mb-0"
                style={{
                  fontSize: '0.74rem',
                  color: 'rgba(226, 232, 240, 0.65)',
                  lineHeight: 1.45,
                }}
              >
                Coimbatore • Chennai • Madurai • Salem • Tiruchirappalli • Tirunelveli & All Statewide Municipalities.
              </p>
            </div>

            {/* Operational Telemetry Pulse */}
            <div
              className="px-3 py-2 rounded-pill d-flex align-items-center justify-content-between"
              style={{
                background: 'rgba(16, 33, 58, 0.65)',
                border: '1px solid rgba(82, 127, 199, 0.3)',
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#30D158',
                    boxShadow: '0 0 10px #30D158',
                  }}
                  className="animate-pulse-glow"
                />
                <span className="small fw-semibold text-white" style={{ fontSize: '0.78rem' }}>
                  Municipal Mesh Operational
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#9FC9FF' }}>99.98% SLA</span>
            </div>
          </div>
        </div>

        {/* ── BOTTOM STRIP: Dynamic Copyright & Standards ───────── */}
        <div
          className="border-top mt-5 pt-4 d-flex flex-column flex-md-row justify-content-between align-items-center gap-2"
          style={{ borderColor: 'rgba(159, 201, 255, 0.12)' }}
        >
          <span
            className="small"
            style={{ color: 'rgba(226, 232, 240, 0.6)', fontSize: '0.8rem' }}
          >
            © {currentYear} Civiora Platform. Apple-Inspired Spatial Liquid Glass GovTech Architecture.
          </span>

          <div className="d-flex align-items-center gap-3 small" style={{ fontSize: '0.78rem' }}>
            <span style={{ color: 'rgba(226, 232, 240, 0.5)' }}>Privacy Charter</span>
            <span style={{ color: 'rgba(159, 201, 255, 0.25)' }}>•</span>
            <span style={{ color: 'rgba(226, 232, 240, 0.5)' }}>Security Disclosure</span>
            <span style={{ color: 'rgba(159, 201, 255, 0.25)' }}>•</span>
            <span style={{ color: 'rgba(226, 232, 240, 0.5)' }}>GovTech AI Standards</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
