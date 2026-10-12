// ============================================================
// CivicPulse Spatial Glass Modal Component
// ============================================================

import React, { useEffect } from 'react';
import { GlassSurface } from './GlassSurface';

export interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '580px',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 10, 16, 0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 9990,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <GlassSurface
          tier="ultra"
          depth="3d"
          glow
          style={{
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.7), 0 0 50px rgba(10, 132, 255, 0.25)',
          }}
        >
          {/* iOS Sheet Grabber Handle */}
          <div className="sheet-grabber mt-3 mb-1" />

          {/* Header */}
          {(title || subtitle) && (
            <div
              className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom"
              style={{ borderColor: 'var(--cp-glass-border)' }}
            >
              <div>
                {title && <h5 className="fw-bold mb-0 text-white tracking-tight">{title}</h5>}
                {subtitle && <p className="small text-secondary mb-0 mt-1">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="glass-icon-btn"
                style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}
                aria-label="Close"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
          )}

          {/* Body */}
          <div className="p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div
              className="p-3 px-4 border-top d-flex justify-content-end align-items-center gap-2"
              style={{
                borderColor: 'var(--cp-glass-border)',
                background: 'rgba(0, 0, 0, 0.15)',
              }}
            >
              {footer}
            </div>
          )}
        </GlassSurface>
      </div>
    </div>
  );
};

export default GlassModal;
