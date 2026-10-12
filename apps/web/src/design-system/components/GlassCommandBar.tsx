// ============================================================
// CivicPulse Spatial Glass Command Bar (Cmd+K / Ctrl+K)
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassSurface } from './GlassSurface';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: string;
  action: () => void;
  shortcut?: string;
}

export const GlassCommandBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const commands: CommandItem[] = [
    {
      id: 'cmd-report',
      title: 'Report New Incident',
      category: 'Citizen Services',
      icon: 'megaphone-fill',
      shortcut: 'R',
      action: () => navigate('/report'),
    },
    {
      id: 'cmd-map',
      title: 'Open 3D Digital Twin & Live Map',
      category: 'Intelligence',
      icon: 'box-seam',
      shortcut: 'M',
      action: () => navigate('/live-map'),
    },
    {
      id: 'cmd-dash',
      title: 'Go to Command Center Dashboard',
      category: 'Navigation',
      icon: 'speedometer2',
      shortcut: 'D',
      action: () => navigate('/dashboard'),
    },
    {
      id: 'cmd-emergency',
      title: 'Trigger Emergency Radar Filter',
      category: 'Emergency',
      icon: 'exclamation-triangle-fill',
      shortcut: 'E',
      action: () => navigate('/live-map?filter=emergency'),
    },
    {
      id: 'cmd-signin',
      title: 'Sign In to Staff Console',
      category: 'Authentication',
      icon: 'shield-lock-fill',
      shortcut: 'L',
      action: () => navigate('/login'),
    },
    {
      id: 'cmd-theme',
      title: 'Toggle Spatial Dark/Light Theme',
      category: 'Preferences',
      icon: 'moon-stars',
      shortcut: 'T',
      action: () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
      },
    },
  ];

  const filtered = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (cmd: CommandItem) => {
    cmd.action();
    setIsOpen(false);
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 10, 16, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{ width: '100%', maxWidth: '600px', margin: '0 1rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <GlassSurface
          tier="ultra"
          depth="3d"
          glow
          style={{
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(10, 132, 255, 0.25)',
          }}
        >
          {/* Search Header */}
          <div
            className="d-flex align-items-center px-4 py-3 border-bottom"
            style={{ borderColor: 'var(--cp-glass-border)' }}
          >
            <i className="bi bi-search text-primary fs-5 me-3" />
            <input
              type="text"
              autoFocus
              placeholder="Search commands, zones, or actions... (Esc to close)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--cp-text-primary)',
                fontSize: '1.1rem',
                outline: 'none',
              }}
            />
            <span
              className="badge rounded-pill text-secondary"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
              }}
            >
              ESC
            </span>
          </div>

          {/* Results List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '0.5rem' }}>
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-secondary small">
                No matching civic commands found.
              </div>
            ) : (
              filtered.map((cmd, i) => (
                <div
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className="d-flex align-items-center justify-content-between px-3 py-2 rounded-3"
                  style={{
                    cursor: 'pointer',
                    backgroundColor:
                      selectedIndex === i
                        ? 'rgba(10, 132, 255, 0.18)'
                        : 'transparent',
                    border:
                      selectedIndex === i
                        ? '1px solid rgba(10, 132, 255, 0.3)'
                        : '1px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background:
                          selectedIndex === i
                            ? 'rgba(10, 132, 255, 0.3)'
                            : 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color:
                          selectedIndex === i ? '#64D2FF' : 'var(--cp-text-secondary)',
                      }}
                    >
                      <i className={`bi bi-${cmd.icon}`} />
                    </div>
                    <div>
                      <div className="fw-semibold text-truncate" style={{ fontSize: '0.95rem' }}>
                        {cmd.title}
                      </div>
                      <div className="small text-secondary" style={{ fontSize: '0.75rem' }}>
                        {cmd.category}
                      </div>
                    </div>
                  </div>
                  {cmd.shortcut && (
                    <span
                      className="badge font-monospace text-secondary"
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      {cmd.shortcut}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Quick Footer Navigation Hint */}
          <div
            className="px-4 py-2 small text-secondary d-flex justify-content-between align-items-center border-top"
            style={{
              borderColor: 'var(--cp-glass-border)',
              background: 'rgba(0, 0, 0, 0.2)',
              fontSize: '0.75rem',
            }}
          >
            <span>Navigation: ↑ ↓ Enter</span>
            <span>CivicPulse Spatial OS</span>
          </div>
        </GlassSurface>
      </div>
    </div>
  );
};

export default GlassCommandBar;
