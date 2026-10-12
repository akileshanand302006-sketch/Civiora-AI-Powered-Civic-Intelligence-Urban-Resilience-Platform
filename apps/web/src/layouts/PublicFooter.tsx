import React from 'react';
import { Link } from 'react-router-dom';

export const PublicFooter: React.FC = () => {
  return (
    <footer
      className="border-top py-5 px-3 px-lg-5"
      style={{
        borderColor: 'var(--cp-glass-border)',
        background: 'var(--cp-glass-bg-subtle)',
        marginTop: 'auto',
      }}
    >
      <div className="container">
        <div className="row g-4 justify-content-between">
          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #527FC7, #9FC9FF)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 0 16px rgba(159, 201, 255, 0.4)',
                }}
              >
                <i className="bi bi-shield-shaded fs-6" />
              </div>
              <span className="fw-bold tracking-tight text-white fs-5">CIVIORA</span>
            </div>
            <p className="text-secondary small mb-3">
              AI-Powered Civic Intelligence & Urban Resilience Platform. Bridging citizens,
              field response forces, and smart city administration through real-time computer vision and 3D digital twins.
            </p>
            <div className="d-flex gap-3 text-secondary">
              <a href="#" className="text-secondary"><i className="bi bi-github fs-5" /></a>
              <a href="#" className="text-secondary"><i className="bi bi-twitter-x fs-5" /></a>
              <a href="#" className="text-secondary"><i className="bi bi-linkedin fs-5" /></a>
            </div>
          </div>

          <div className="col-6 col-md-2">
            <h6 className="fw-semibold small text-uppercase mb-3" style={{ color: 'var(--cp-accent-cyan)' }}>
              Platform
            </h6>
            <ul className="list-unstyled small d-flex flex-column gap-2 text-secondary">
              <li><Link to="/live-map" className="text-secondary">3D Digital Twin</Link></li>
              <li><Link to="/features" className="text-secondary">AI Vision & NLP</Link></li>
              <li><Link to="/report" className="text-secondary">Citizen Portal</Link></li>
              <li><Link to="/analytics" className="text-secondary">SLA Tracking</Link></li>
            </ul>
          </div>

          <div className="col-6 col-md-2">
            <h6 className="fw-semibold small text-uppercase mb-3" style={{ color: 'var(--cp-accent-cyan)' }}>
              GovTech Hub
            </h6>
            <ul className="list-unstyled small d-flex flex-column gap-2 text-secondary">
              <li><Link to="/login" className="text-secondary">Field Worker Queue</Link></li>
              <li><Link to="/login" className="text-secondary">Command Center</Link></li>
              <li><Link to="/login" className="text-secondary">Emergency Dispatch</Link></li>
              <li><Link to="/login" className="text-secondary">Auditing & Security</Link></li>
            </ul>
          </div>

          <div className="col-12 col-md-3">
            <h6 className="fw-semibold small text-uppercase mb-3" style={{ color: 'var(--cp-accent-cyan)' }}>
              Operational Status
            </h6>
            <div className="p-3 rounded" style={{ background: 'var(--cp-glass-bg)', border: '1px solid var(--cp-glass-border)' }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#30D158',
                  }}
                  className="animate-pulse-glow"
                />
                <span className="small fw-semibold">All Systems Operational</span>
              </div>
              <p className="text-secondary mb-0" style={{ fontSize: '0.75rem' }}>
                AI Vision Pipeline: 99.98% uptime<br />
                Geospatial Gateway: 14ms latency<br />
                Socket Streams: Synchronized
              </p>
            </div>
          </div>
        </div>

        <div className="border-top mt-4 pt-3 d-flex flex-column flex-md-row justify-content-between align-items-center text-secondary small" style={{ borderColor: 'var(--cp-glass-border)' }}>
          <span>© 2026 Civiora Platform. Apple-Inspired Spatial Liquid Glass GovTech Architecture.</span>
          <div className="d-flex gap-3 mt-2 mt-md-0">
            <a href="#" className="text-secondary">Privacy Charter</a>
            <a href="#" className="text-secondary">Security Disclosure</a>
            <a href="#" className="text-secondary">API Docs</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
