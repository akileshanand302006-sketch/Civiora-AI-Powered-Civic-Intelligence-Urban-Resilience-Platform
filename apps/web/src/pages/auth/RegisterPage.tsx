// ============================================================
// CivicPulse Register Page
// ============================================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { GlassPanel, GlassButton, GlassInput } from '../../design-system/components';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [orgSlug, setOrgSlug] = useState('metropolis');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/register', {
        firstName,
        lastName,
        email,
        password,
        phone: phone || undefined,
        organizationSlug: orgSlug,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <GlassPanel glow className="p-4 p-md-5">
            <div className="text-center mb-4">
              <h3 className="fw-bold mb-1">Create Citizen Account</h3>
              <p className="text-secondary small">
                Join your city's civic intelligence network to report and track municipal issues
              </p>
            </div>

            {error && (
              <div
                className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3"
                role="alert"
                style={{ background: 'rgba(255, 69, 58, 0.15)', borderColor: 'rgba(255, 69, 58, 0.3)', color: '#FF453A' }}
              >
                <i className="bi bi-exclamation-octagon-fill" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                className="alert alert-success py-2 px-3 small d-flex align-items-center gap-2 mb-3"
                role="alert"
                style={{ background: 'rgba(48, 209, 88, 0.15)', borderColor: 'rgba(48, 209, 88, 0.3)', color: '#30D158' }}
              >
                <i className="bi bi-check-circle-fill" />
                <span>Account created successfully! Redirecting to sign in...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
              <div className="row g-2">
                <div className="col-6">
                  <GlassInput
                    label="First Name"
                    type="text"
                    required
                    placeholder="Priya"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <GlassInput
                    label="Last Name"
                    type="text"
                    required
                    placeholder="Sharma"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <GlassInput
                label="Email Address"
                type="email"
                required
                icon="envelope"
                placeholder="priya@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <GlassInput
                label="Phone Number (Optional)"
                type="tel"
                icon="telephone"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <GlassInput
                label="Password"
                type="password"
                required
                icon="key"
                placeholder="Min 8 chars, 1 uppercase, 1 symbol"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="Must contain uppercase, lowercase, number, and special character"
              />

              <GlassInput
                label="City / Organization Slug"
                type="text"
                required
                icon="buildings"
                placeholder="metropolis"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
              />

              <GlassButton variant="primary" size="md" type="submit" loading={loading} className="w-100 mt-2">
                Create Citizen Account
              </GlassButton>
            </form>

            <div className="text-center mt-4 small text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="fw-semibold">
                Sign In
              </Link>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};
