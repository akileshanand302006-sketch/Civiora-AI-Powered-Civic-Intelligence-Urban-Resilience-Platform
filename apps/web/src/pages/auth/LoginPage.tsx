// ============================================================
// CivicPulse Spatial Login Experience — Fullscreen 3D City & Liquid Glass
// Dynamic Role Shift Lighting + Multi-Persona Authentication
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { CityScene, type RoleTheme } from '../../three/CityScene';
import { GlassSurface, GlassButton, GlassInput } from '../../design-system/components';

interface RoleOption {
  role: RoleTheme;
  title: string;
  defaultName: string;
  email: string;
  icon: string;
  color: string;
  themeDescription: string;
}

const ROLES: RoleOption[] = [
  {
    role: 'citizen',
    title: 'Citizen',
    defaultName: 'Priya Sharma',
    email: 'citizen@civicpulse.demo',
    icon: 'person-heart',
    color: '#0A84FF',
    themeDescription: 'Community Grid & Citizen Reporting',
  },
  {
    role: 'field_worker',
    title: 'Field Worker',
    defaultName: 'Rajesh Kumar',
    email: 'worker@civicpulse.demo',
    icon: 'tools',
    color: '#FF9F0A',
    themeDescription: 'Field Telemetry & Work Orders',
  },
  {
    role: 'department_officer',
    title: 'Department Officer',
    defaultName: 'Anita Patel',
    email: 'officer@civicpulse.demo',
    icon: 'person-badge',
    color: '#64D2FF',
    themeDescription: 'SLA Triage & Dispatch Control',
  },
  {
    role: 'department_manager',
    title: 'Department Manager',
    defaultName: 'Vikram Singh',
    email: 'manager@civicpulse.demo',
    icon: 'speedometer2',
    color: '#30D158',
    themeDescription: 'Operations, Hotspots & Analytics',
  },
  {
    role: 'emergency_operator',
    title: 'Emergency Operator',
    defaultName: 'Meera Nair',
    email: 'emergency@civicpulse.demo',
    icon: 'exclamation-octagon-fill',
    color: '#FF453A',
    themeDescription: 'Disaster Radar & Critical Broadcasts',
  },
  {
    role: 'moderator',
    title: 'Moderator',
    defaultName: 'Arjun Reddy',
    email: 'moderator@civicpulse.demo',
    icon: 'shield-check',
    color: '#32ADE6',
    themeDescription: 'Content Verification & Trust Scoring',
  },
  {
    role: 'tenant_admin',
    title: 'Tenant Admin',
    defaultName: 'Deepa Iyer',
    email: 'tenant.admin@civicpulse.demo',
    icon: 'building-gear',
    color: '#5E5CE6',
    themeDescription: 'Municipal Governance & Policies',
  },
  {
    role: 'system_admin',
    title: 'System Admin',
    defaultName: 'Suresh Menon',
    email: 'admin@civicpulse.demo',
    icon: 'cpu-fill',
    color: '#BF5AF2',
    themeDescription: 'Full Node Infrastructure & Security',
  },
  {
    role: 'security_auditor',
    title: 'Security Auditor',
    defaultName: 'Kavitha Rao',
    email: 'auditor@civicpulse.demo',
    icon: 'fingerprint',
    color: '#FF375F',
    themeDescription: 'Immutable Audit Trails & Threat Graph',
  },
];

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [selectedRole, setSelectedRole] = useState<RoleTheme>('citizen');
  const [fullName, setFullName] = useState('Priya Sharma');
  const [email, setEmail] = useState('citizen@civicpulse.demo');
  const [password, setPassword] = useState('CivicPulse@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [orgSlug, setOrgSlug] = useState('metropolis');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      const matched = ROLES.find((r) => r.email === emailParam);
      if (matched) {
        setSelectedRole(matched.role);
        setFullName(matched.defaultName);
      }
    }
  }, [searchParams]);

  const handleRoleSelect = (r: RoleOption) => {
    setSelectedRole(r.role);
    setFullName(r.defaultName);
    setEmail(r.email);
    setPassword('CivicPulse@2026');
    setOrgSlug('metropolis');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        email,
        password,
        organizationSlug: orgSlug,
      });

      const data = res.data.data;

      if (data.requiresMfa) {
        navigate(`/mfa?token=${encodeURIComponent(data.mfaToken)}`);
        return;
      }

      // Smooth spatial transition sequence before entering location setup / dashboard
      setIsTransitioning(true);
      setTimeout(() => {
        const accessToken = data.tokens?.accessToken || data.accessToken;
        const refreshToken = data.tokens?.refreshToken || data.refreshToken;
        const userPayload = {
          ...data.user,
          fullName: data.user?.fullName || fullName,
        };
        login(userPayload, accessToken, refreshToken);
        const redirectUrl = searchParams.get('redirect');
        const hasLocation = Boolean(localStorage.getItem('cp_selected_location'));

        if (redirectUrl && redirectUrl !== '/dashboard') {
          navigate(redirectUrl);
        } else if (!hasLocation) {
          navigate('/setup-location');
        } else {
          navigate('/dashboard');
        }
      }, 700);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        'Authentication failed. Please verify credentials.';
      setError(msg);
      setLoading(false);
    }
  };

  const activeRoleMeta = ROLES.find((r) => r.role === selectedRole) || ROLES[0]!;

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#070A10',
      }}
    >
      {/* ── Background Layer: Full Screen Interactive 3D City ─── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          opacity: isTransitioning ? 0.3 : 1,
          transform: isTransitioning ? 'scale(1.1)' : 'scale(1)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <CityScene role={selectedRole} />
      </div>

      {/* ── Atmosphere Vignette Overlay ─────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 50%, rgba(7, 10, 16, 0.4) 0%, rgba(7, 10, 16, 0.85) 100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* ── Foreground Layer: Floating Spatial Glass Auth Console */}
      <div
        className="d-flex align-items-center justify-content-center h-100 px-3 py-4"
        style={{ position: 'relative', zIndex: 10 }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '920px',
            transform: isTransitioning ? 'scale(0.95) translateY(-20px)' : 'none',
            opacity: isTransitioning ? 0 : 1,
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <GlassSurface
            tier="ultra"
            depth="3d"
            glow
            style={{
              borderRadius: '28px',
              padding: '2.5rem',
              boxShadow:
                '0 30px 90px rgba(0, 0, 0, 0.8), 0 0 60px rgba(10, 132, 255, 0.25)',
            }}
          >
            {/* Top Brand & Purpose Header */}
            <div className="text-center mb-4">
              <div className="d-inline-flex align-items-center gap-2 mb-2">
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #527FC7, #9FC9FF)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#050A14',
                    boxShadow: '0 0 20px rgba(159, 201, 255, 0.45)',
                  }}
                >
                  <i className="bi bi-shield-shaded fs-5 fw-bold" />
                </div>
                <div className="text-start">
                  <div className="d-flex align-items-center gap-2">
                    <h4
                      className="fw-extrabold mb-0 tracking-tight text-white"
                      style={{ letterSpacing: '0.04em' }}
                    >
                      CIVIORA
                    </h4>
                    <span
                      className="badge rounded-pill"
                      style={{
                        background: 'rgba(159, 201, 255, 0.15)',
                        border: '1px solid rgba(159, 201, 255, 0.35)',
                        color: '#9FC9FF',
                        fontSize: '0.65rem',
                        letterSpacing: '0.06em',
                      }}
                    >
                      AI OS
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-secondary small mb-1" style={{ fontSize: '0.92rem' }}>
                Spatial Urban Intelligence & Unified Civic Resilience Platform
              </p>
              <div
                className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mt-1"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${activeRoleMeta.color}40`,
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: activeRoleMeta.color,
                  }}
                  className="animate-pulse-glow"
                />
                <span
                  className="small fw-semibold"
                  style={{ color: activeRoleMeta.color, fontSize: '0.78rem' }}
                >
                  {activeRoleMeta.themeDescription}
                </span>
              </div>
            </div>

            <div className="row g-4 align-items-start">
              {/* Left Column: 9-Persona Spatial Immersion Switcher */}
              <div className="col-12 col-md-5 border-end border-secondary border-opacity-25 pe-md-4">
                <span
                  className="text-uppercase small fw-bold text-secondary d-block mb-3"
                  style={{ fontSize: '0.75rem', letterSpacing: '0.08em' }}
                >
                  SELECT OPERATIONAL PERSONA:
                </span>
                <div
                  className="d-flex flex-column gap-2"
                  style={{ maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}
                >
                  {ROLES.map((r) => {
                    const isSelected = selectedRole === r.role;
                    return (
                      <div
                        key={r.role}
                        onClick={() => handleRoleSelect(r)}
                        className="d-flex align-items-center justify-content-between p-2 rounded-3"
                        style={{
                          cursor: 'pointer',
                          background: isSelected
                            ? 'rgba(10, 132, 255, 0.2)'
                            : 'rgba(255, 255, 255, 0.03)',
                          border: isSelected
                            ? `1px solid ${r.color}`
                            : '1px solid rgba(255, 255, 255, 0.06)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '7px',
                              background: `${r.color}25`,
                              color: r.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.85rem',
                            }}
                          >
                            <i className={`bi bi-${r.icon}`} />
                          </div>
                          <div>
                            <div
                              className="fw-bold lh-1 text-truncate"
                              style={{
                                fontSize: '0.85rem',
                                color: isSelected ? '#fff' : 'var(--cp-text-primary)',
                              }}
                            >
                              {r.title}
                            </div>
                            <span
                              className="text-secondary"
                              style={{ fontSize: '0.7rem' }}
                            >
                              {r.email}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <i
                            className="bi bi-check-circle-fill"
                            style={{ color: r.color, fontSize: '0.9rem' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Liquid Glass Auth Form */}
              <div className="col-12 col-md-7 ps-md-4">
                {error && (
                  <div
                    className="alert py-2 px-3 small d-flex align-items-center gap-2 mb-3 rounded-3"
                    style={{
                      background: 'rgba(255, 69, 58, 0.15)',
                      border: '1px solid rgba(255, 69, 58, 0.4)',
                      color: '#FF453A',
                    }}
                  >
                    <i className="bi bi-exclamation-octagon-fill" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
                  <GlassInput
                    label="Full Name (Account Identity / Display Preference)"
                    type="text"
                    required={false}
                    icon="person"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    helperText="Canonical account name retrieved from database upon verification"
                  />

                  <GlassInput
                    label="Credential Identity"
                    type="email"
                    required
                    icon="envelope"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <GlassInput
                    label="Security Token / Password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    icon="key"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    rightElement={
                      <button
                        type="button"
                        className="btn btn-sm btn-link p-0 text-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ textDecoration: 'none' }}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <i className={`bi bi-${showPassword ? 'eye-slash' : 'eye'}`} />
                      </button>
                    }
                  />

                  <GlassInput
                    label="Municipal Tenant Slug (Optional)"
                    type="text"
                    required={false}
                    icon="buildings"
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value)}
                    helperText="Default: metropolis (auto-detected from your account)"
                  />

                  <GlassButton
                    variant="primary"
                    size="lg"
                    type="submit"
                    loading={loading || isTransitioning}
                    className="w-100 mt-2"
                  >
                    {isTransitioning ? 'Entering Spatial Console...' : 'Authenticate & Launch Console'}
                  </GlassButton>
                </form>

                <div className="mt-3 text-center d-flex flex-column gap-2">
                  <span className="text-secondary small">
                    All demo accounts use passcode:{' '}
                    <code className="text-primary font-monospace">CivicPulse@2026</code>
                  </span>
                  <div className="small text-secondary">
                    Need a new citizen account?{' '}
                    <span
                      onClick={() => navigate('/register')}
                      style={{ color: '#9FC9FF', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Create Citizen Profile
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </GlassSurface>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
