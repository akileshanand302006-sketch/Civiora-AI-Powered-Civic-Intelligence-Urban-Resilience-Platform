// ============================================================
// Civiora Premium Contact Center
// "Let's Make Our Cities Better."
// Responsive Liquid Glass UI + Multi-Channel Coordination
// Rate-Limited Secure Backend Integration (Resend Email Provider)
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import {
  GlassSurface,
  GlassButton,
  GlassInput,
} from '../../design-system/components';

type ContactCategory = 'general' | 'support' | 'municipal' | 'partnership' | 'incident_report';

interface FormState {
  name: string;
  email: string;
  phone: string;
  category: ContactCategory;
  subject: string;
  message: string;
  incidentReference: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  general?: string;
}

export const ContactPage: React.FC = () => {
  const { user } = useAuthStore();

  const userDisplayName = (user as any)?.profile?.firstName
    ? `${(user as any).profile.firstName} ${(user as any).profile.lastName || ''}`.trim()
    : (user as any)?.name || '';

  const [formData, setFormData] = useState<FormState>({
    name: userDisplayName,
    email: user?.email || '',
    phone: '',
    category: 'general',
    subject: '',
    message: '',
    incidentReference: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);
  const [submissionReceipt, setSubmissionReceipt] = useState<{
    inquiryId: string;
    message: string;
    emailNotified?: boolean;
  } | null>(null);

  // Validate form
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Full name must be at least 2 characters long.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email address.';
    }

    if (!formData.subject.trim() || formData.subject.trim().length < 3) {
      newErrors.subject = 'Subject must be at least 3 characters long.';
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters long.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setErrors({});

    try {
      const response = await api.post('/contact', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        category: formData.category,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        incidentReference: formData.incidentReference.trim() || undefined,
      });

      if (response.data?.success) {
        setSubmittedSuccess(true);
        setSubmissionReceipt({
          inquiryId: response.data.inquiryId,
          message: response.data.message || 'Inquiry successfully transmitted.',
          emailNotified: response.data.emailNotified,
        });
      } else {
        throw new Error(response.data?.error?.message || 'Transmission failed.');
      }
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to connect to municipal contact gateway. Please try again.';
      setErrors({ general: serverMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedSuccess(false);
    setSubmissionReceipt(null);
    setFormData({
      name: userDisplayName,
      email: user?.email || '',
      phone: '',
      category: 'general',
      subject: '',
      message: '',
      incidentReference: '',
    });
    setErrors({});
  };

  return (
    <div className="container-fluid px-3 px-sm-4 px-lg-5 py-5" style={{ minHeight: '85vh', marginTop: '64px' }}>
      <div className="mx-auto" style={{ maxWidth: '1180px' }}>
        {/* ── A. HERO SECTION ─────────────────────────────────── */}
        <div className="text-center mb-5">
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill mb-3"
            style={{
              background: 'rgba(82, 127, 199, 0.16)',
              border: '1px solid rgba(159, 201, 255, 0.3)',
              color: '#9FC9FF',
              fontSize: '0.82rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            <i className="bi bi-shield-check" />
            <span>OFFICIAL CIVIC CONTACT CENTER</span>
          </div>

          <h1
            className="display-5 fw-extrabold text-white tracking-tight mb-3"
            style={{
              letterSpacing: '-0.03em',
              textShadow: '0 4px 20px rgba(0,0,0,0.6)',
            }}
          >
            Let&apos;s Make Our Cities Better.
          </h1>

          <p
            className="lead text-secondary mx-auto mb-0"
            style={{
              maxWidth: '680px',
              fontSize: '1.1rem',
              lineHeight: 1.6,
              color: 'rgba(226, 232, 240, 0.85)',
            }}
          >
            Connect with Civiora for civic assistance, platform support, partnerships, and municipal coordination.
          </p>
        </div>

        {/* ── B. CONFIGURABLE CONTACT CARDS ────────────────────── */}
        <div className="row g-3 g-md-4 mb-5">
          {/* Card 1: General Inquiries */}
          <div className="col-12 col-sm-6 col-lg">
            <GlassSurface
              tier="medium"
              depth="subtle"
              glow
              className="p-3.5 h-100 d-flex flex-column justify-content-between"
              style={{ borderRadius: '16px' }}
            >
              <div>
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3"
                  style={{
                    width: '42px',
                    height: '42px',
                    background: 'rgba(59, 130, 246, 0.18)',
                    color: '#60A5FA',
                    fontSize: '1.2rem',
                  }}
                >
                  <i className="bi bi-chat-dots" />
                </div>
                <h6 className="fw-bold text-white mb-1">General Inquiries</h6>
                <p className="small text-secondary mb-3" style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                  Public feedback, citizen inquiries, and statewide program information.
                </p>
              </div>
              <div className="pt-2 border-top border-secondary border-opacity-25 small text-primary fw-semibold">
                Online Portal Active
              </div>
            </GlassSurface>
          </div>

          {/* Card 2: Technical Support */}
          <div className="col-12 col-sm-6 col-lg">
            <GlassSurface
              tier="medium"
              depth="subtle"
              glow
              className="p-3.5 h-100 d-flex flex-column justify-content-between"
              style={{ borderRadius: '16px' }}
            >
              <div>
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3"
                  style={{
                    width: '42px',
                    height: '42px',
                    background: 'rgba(168, 85, 247, 0.18)',
                    color: '#C084FC',
                    fontSize: '1.2rem',
                  }}
                >
                  <i className="bi bi-cpu" />
                </div>
                <h6 className="fw-bold text-white mb-1">Technical Support</h6>
                <p className="small text-secondary mb-3" style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                  Assistance with camera scanning, GPS locks, 3D digital twins, and app bugs.
                </p>
              </div>
              <div className="pt-2 border-top border-secondary border-opacity-25 small text-info fw-semibold">
                Telemetry Diagnostics
              </div>
            </GlassSurface>
          </div>

          {/* Card 3: Municipal Coordination */}
          <div className="col-12 col-sm-6 col-lg">
            <GlassSurface
              tier="medium"
              depth="subtle"
              glow
              className="p-3.5 h-100 d-flex flex-column justify-content-between"
              style={{ borderRadius: '16px' }}
            >
              <div>
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3"
                  style={{
                    width: '42px',
                    height: '42px',
                    background: 'rgba(34, 197, 94, 0.18)',
                    color: '#4ADE80',
                    fontSize: '1.2rem',
                  }}
                >
                  <i className="bi bi-building-check" />
                </div>
                <h6 className="fw-bold text-white mb-1">Municipal Command</h6>
                <p className="small text-secondary mb-3" style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                  Direct liaison for ward commissioners, highway authorities, and police dispatch.
                </p>
              </div>
              <div className="pt-2 border-top border-secondary border-opacity-25 small text-success fw-semibold">
                Direct Dispatch Channel
              </div>
            </GlassSurface>
          </div>

          {/* Card 4: Partnership & Research */}
          <div className="col-12 col-sm-6 col-lg">
            <GlassSurface
              tier="medium"
              depth="subtle"
              glow
              className="p-3.5 h-100 d-flex flex-column justify-content-between"
              style={{ borderRadius: '16px' }}
            >
              <div>
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3"
                  style={{
                    width: '42px',
                    height: '42px',
                    background: 'rgba(234, 179, 8, 0.18)',
                    color: '#FACC15',
                    fontSize: '1.2rem',
                  }}
                >
                  <i className="bi bi-briefcase" />
                </div>
                <h6 className="fw-bold text-white mb-1">Partnerships &amp; Research</h6>
                <p className="small text-secondary mb-3" style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                  Smart city grants, university urban research labs, and civic technology data pilots.
                </p>
              </div>
              <div className="pt-2 border-top border-secondary border-opacity-25 small text-warning fw-semibold">
                GovTech Collaborations
              </div>
            </GlassSurface>
          </div>

          {/* Card 5: Civic Incident Reporting */}
          <div className="col-12 col-sm-6 col-lg">
            <GlassSurface
              tier="medium"
              depth="subtle"
              glow
              className="p-3.5 h-100 d-flex flex-column justify-content-between"
              style={{
                borderRadius: '16px',
                borderColor: 'rgba(10, 132, 255, 0.4)',
                background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.12) 0%, rgba(5, 10, 20, 0.6) 100%)',
              }}
            >
              <div>
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3"
                  style={{
                    width: '42px',
                    height: '42px',
                    background: 'rgba(10, 132, 255, 0.3)',
                    color: '#9FC9FF',
                    fontSize: '1.2rem',
                  }}
                >
                  <i className="bi bi-megaphone-fill" />
                </div>
                <h6 className="fw-bold text-white mb-1">Report An Incident</h6>
                <p className="small text-secondary mb-3" style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                  Immediate pothole, water leak, or electrical hazard identification with AI vision.
                </p>
              </div>
              <Link to="/report" className="text-decoration-none">
                <GlassButton variant="primary" size="sm" className="w-100 py-1.5" icon="camera">
                  Launch Reporter
                </GlassButton>
              </Link>
            </GlassSurface>
          </div>
        </div>

        {/* ── C. PREMIUM CONTACT FORM CONTAINER ────────────────── */}
        <div className="row g-4 justify-content-center">
          <div className="col-12 col-lg-10 col-xl-9">
            <GlassSurface
              tier="ultra"
              depth="3d"
              glow
              className="p-4 p-md-5 position-relative overflow-hidden"
              style={{ borderRadius: '24px' }}
            >
              {/* Submission Success State */}
              {submittedSuccess && submissionReceipt ? (
                <div className="text-center py-5">
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      background: 'rgba(34, 197, 94, 0.2)',
                      color: '#4ADE80',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.4rem',
                      marginBottom: '1.5rem',
                      boxShadow: '0 0 35px rgba(34, 197, 94, 0.45)',
                    }}
                  >
                    <i className="bi bi-check2-circle" />
                  </div>

                  <h3 className="fw-bold text-white mb-2">Message Successfully Dispatched</h3>
                  <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '520px', lineHeight: 1.6 }}>
                    {submissionReceipt.message}
                  </p>

                  <div
                    className="p-3 rounded-4 mx-auto mb-4 text-start font-monospace small"
                    style={{
                      maxWidth: '480px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(159, 201, 255, 0.2)',
                    }}
                  >
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-secondary">Inquiry Reference:</span>
                      <span className="text-info fw-bold">{submissionReceipt.inquiryId}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-secondary">Sender Contact:</span>
                      <span className="text-light">{formData.email}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary">Delivery Status:</span>
                      <span className="text-success fw-semibold">
                        {submissionReceipt.emailNotified
                          ? 'Transmitted to Municipal Inbox'
                          : 'Logged in Central Civic Registry'}
                      </span>
                    </div>
                  </div>

                  <div className="d-flex justify-content-center gap-3">
                    <GlassButton variant="primary" size="md" onClick={handleReset} icon="arrow-counterclockwise">
                      Send Another Inquiry
                    </GlassButton>
                    <Link to="/">
                      <GlassButton variant="secondary" size="md" icon="house">
                        Back to Overview
                      </GlassButton>
                    </Link>
                  </div>
                </div>
              ) : (
                /* Main Interactive Form */
                <form onSubmit={handleSubmit} noValidate>
                  <div className="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom border-secondary border-opacity-25">
                    <div>
                      <h4 className="fw-bold text-white mb-1">Transmit Official Inquiry</h4>
                      <p className="text-secondary small mb-0">
                        All communications are securely logged and forwarded to the municipal coordination desk.
                      </p>
                    </div>
                    <span className="badge rounded-pill bg-primary bg-opacity-25 text-primary border border-primary border-opacity-30 px-3 py-2">
                      <i className="bi bi-lock-fill me-1" />
                      Encrypted Channel
                    </span>
                  </div>

                  {errors.general && (
                    <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
                      <i className="bi bi-exclamation-triangle-fill fs-5" />
                      <div>{errors.general}</div>
                    </div>
                  )}

                  <div className="row g-3 g-md-4">
                    {/* Full Name */}
                    <div className="col-12 col-md-6">
                      <GlassInput
                        label="Full Name *"
                        placeholder="e.g. Anandha Kumar"
                        icon="person"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        error={errors.name}
                        disabled={submitting}
                        required
                      />
                    </div>

                    {/* Email Address */}
                    <div className="col-12 col-md-6">
                      <GlassInput
                        type="email"
                        label="Email Address *"
                        placeholder="e.g. anand@civicpulse.org"
                        icon="envelope"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        error={errors.email}
                        disabled={submitting}
                        required
                      />
                    </div>

                    {/* Contact Number (Optional) */}
                    <div className="col-12 col-md-6">
                      <GlassInput
                        type="tel"
                        label="Contact Number (Optional)"
                        placeholder="e.g. +91 98765 43210"
                        icon="telephone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={submitting}
                      />
                    </div>

                    {/* Inquiry Category */}
                    <div className="col-12 col-md-6">
                      <div className="d-flex flex-column gap-1">
                        <label
                          htmlFor="contact-category-select"
                          className="form-label mb-0"
                          style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--cp-text-secondary)' }}
                        >
                          Inquiry Category *
                        </label>
                        <select
                          id="contact-category-select"
                          className="glass-input w-100"
                          value={formData.category}
                          onChange={(e) =>
                            setFormData({ ...formData, category: e.target.value as ContactCategory })
                          }
                          disabled={submitting}
                          style={{
                            height: '42px',
                            background: 'rgba(10, 20, 36, 0.7)',
                            color: '#FFFFFF',
                            borderRadius: '10px',
                            border: '1px solid rgba(159, 201, 255, 0.25)',
                            padding: '0 12px',
                          }}
                        >
                          <option value="general">General Civic Inquiry</option>
                          <option value="support">Technical &amp; Telemetry Support</option>
                          <option value="municipal">Municipal Coordination &amp; Dispatch</option>
                          <option value="partnership">Partnership &amp; Smart City Grants</option>
                          <option value="incident_report">Specific Incident Follow-Up</option>
                        </select>
                      </div>
                    </div>

                    {/* Related Incident Reference (Optional) */}
                    <div className="col-12">
                      <GlassInput
                        label="Related Incident Reference / Dossier ID (Optional)"
                        placeholder="e.g. INC-2026-X8K9 or 670cd..."
                        icon="hash"
                        helperText="Provide if your inquiry pertains to an already submitted civic report."
                        value={formData.incidentReference}
                        onChange={(e) => setFormData({ ...formData, incidentReference: e.target.value })}
                        disabled={submitting}
                      />
                    </div>

                    {/* Subject */}
                    <div className="col-12">
                      <GlassInput
                        label="Subject Line *"
                        placeholder="Summary of your inquiry or request"
                        icon="card-heading"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        error={errors.subject}
                        disabled={submitting}
                        required
                      />
                    </div>

                    {/* Message */}
                    <div className="col-12">
                      <div className="d-flex flex-column gap-1">
                        <label
                          htmlFor="contact-message-textarea"
                          className="form-label mb-0"
                          style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--cp-text-secondary)' }}
                        >
                          Detailed Message *
                        </label>
                        <textarea
                          id="contact-message-textarea"
                          rows={5}
                          className="glass-input w-100"
                          placeholder="Provide all relevant details, locations, municipal authorities involved, or technical concerns..."
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          disabled={submitting}
                          style={{
                            background: 'rgba(10, 20, 36, 0.7)',
                            color: '#FFFFFF',
                            borderRadius: '12px',
                            border: errors.message
                              ? '1px solid var(--cp-accent-danger)'
                              : '1px solid rgba(159, 201, 255, 0.25)',
                            padding: '12px 16px',
                            resize: 'vertical',
                            lineHeight: 1.6,
                          }}
                          required
                        />
                        {errors.message && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--cp-accent-danger)' }}>
                            {errors.message}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submission Row */}
                  <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 mt-4 pt-3 border-top border-secondary border-opacity-25">
                    <span className="small text-secondary">
                      <i className="bi bi-info-circle me-1" />
                      Inquiries are processed in accordance with the Civiora Privacy Charter.
                    </span>

                    <GlassButton
                      variant="primary"
                      size="lg"
                      type="submit"
                      loading={submitting}
                      icon="send-fill"
                      className="w-100 w-sm-auto px-4"
                    >
                      Transmit to Civiora
                    </GlassButton>
                  </div>
                </form>
              )}
            </GlassSurface>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
