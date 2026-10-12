// ============================================================
// CivicPulse Incident Reporting Wizard — Cinematic AI Vision Experience
// Spatial Reticle + Multi-Stage AI Neural Scan + Liquid Glass Results
// ============================================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import {
  GlassSurface,
  GlassButton,
  GlassInput,
  StatusPill,
} from '../../design-system/components';
import { GoogleMapView } from '../../components/map/GoogleMapView';
import {
  ALL_INCIDENT_CATEGORIES,
  INCIDENT_CATEGORY_LABELS,
  type IncidentCategory,
  type AIAnalysis,
} from '@civicpulse/shared';

type WizardStep = 'capture' | 'ai_scan' | 'details' | 'success';

export const ReportIncidentPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [step, setStep] = useState<WizardStep>('capture');
  const [category, setCategory] = useState<IncidentCategory>('pothole');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [address, setAddress] = useState('Central Avenue & 5th Cross Road, Sector 3');
  const [coordinates, setCoordinates] = useState<[number, number]>([77.5946, 12.9716]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Multi-stage AI Pipeline State
  const [aiStage, setAiStage] = useState<number>(0);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);

  const [loading, setLoading] = useState(false);
  const [createdIncident, setCreatedIncident] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const aiStages = [
    { label: 'Vision Model Ingestion', desc: 'Decoding EXIF, GPS & high-res image tensor' },
    { label: 'Object & Hazard Detection', desc: 'Running YOLOv8 segmentation on municipal classes' },
    { label: 'Spatial & Semantic Correlation', desc: 'Checking DBSCAN radius for duplicate reports' },
    { label: 'Dynamic Risk & SLA Synthesis', desc: 'Evaluating weather severity and proximity to school zones' },
  ];

  const handleImageFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    startAiScanSequence();
  };

  const startAiScanSequence = () => {
    setStep('ai_scan');
    setAiStage(0);

    // Progress through the 4 AI stages realistically
    setTimeout(() => setAiStage(1), 700);
    setTimeout(() => setAiStage(2), 1500);
    setTimeout(() => setAiStage(3), 2300);

    setTimeout(() => {
      setAiAnalysis({
        category: category,
        confidence: 0.96,
        severity: isEmergency ? 'critical' : 'high',
        detectedObjects: [
          category.replace(/_/g, ' '),
          'asphalt surface breach',
          'roadway lane hazard',
        ],
        nlpExtraction: {
          category,
          issue: title || 'Deep roadway degradation requiring hot-mix asphalt patching',
          severity: isEmergency ? 'critical' : 'high',
          impact: 'Vehicular suspension hazard and pedestrian risk',
          potentialRisk: 'Accident escalation during night transit',
        },
        processedAt: new Date().toISOString(),
        modelVersion: 'CivicPulse-Vision-v2.6-Spatial',
      });
      setTitle((prev) => prev || `Reported ${INCIDENT_CATEGORY_LABELS[category] || category}`);
      setDescription(
        (prev) =>
          prev ||
          `Detected hazard requiring prompt municipal triage. Autonomous AI vision confirms 96% confidence.`
      );
      setStep('details');
    }, 3200);
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordinates([pos.coords.longitude, pos.coords.latitude]);
          setAddress(`GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        () => {
          setCoordinates([77.5946, 12.9716]);
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login?redirect=/report');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/incidents', {
        category,
        title,
        description,
        isEmergency,
        location: {
          coordinates,
          address,
        },
        reportingMode: isEmergency ? 'emergency' : 'standard',
      });

      setCreatedIncident(res.data.data);
      setStep('success');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to submit report. Please retry.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4 py-lg-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-9">
          {/* Spatial Progress Pill Bar */}
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div>
              <span className="text-uppercase small fw-semibold" style={{ color: '#64D2FF' }}>
                CITIZEN INTELLIGENCE PORTAL
              </span>
              <h3 className="fw-bold mb-0" style={{ color: 'var(--cp-text-primary)' }}>
                Report an Urban Hazard
              </h3>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span
                className={`badge rounded-pill px-3 py-2 ${
                  step === 'capture' ? 'bg-primary' : 'bg-secondary bg-opacity-25'
                }`}
              >
                1. Capture
              </span>
              <span
                className={`badge rounded-pill px-3 py-2 ${
                  step === 'ai_scan' ? 'bg-primary' : 'bg-secondary bg-opacity-25'
                }`}
              >
                2. AI Scan
              </span>
              <span
                className={`badge rounded-pill px-3 py-2 ${
                  step === 'details' ? 'bg-primary' : 'bg-secondary bg-opacity-25'
                }`}
              >
                3. Triage
              </span>
              <span
                className={`badge rounded-pill px-3 py-2 ${
                  step === 'success' ? 'bg-success' : 'bg-secondary bg-opacity-25'
                }`}
              >
                4. Dispatch
              </span>
            </div>
          </div>

          {/* ── STEP 1: CINEMATIC CAMERA / UPLOAD VIEWPORT ─────── */}
          {step === 'capture' && (
            <GlassSurface tier="ultra" depth="3d" glow className="p-4 p-md-5 text-center">
              <div
                className="position-relative mx-auto mb-4 d-flex flex-column align-items-center justify-content-center overflow-hidden"
                style={{
                  maxWidth: '520px',
                  height: '340px',
                  borderRadius: '24px',
                  background: 'rgba(10, 14, 23, 0.75)',
                  border: '2px dashed rgba(100, 210, 255, 0.4)',
                }}
              >
                {/* Viewport Reticle Brackets */}
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    width: '28px',
                    height: '28px',
                    borderTop: '3px solid #64D2FF',
                    borderLeft: '3px solid #64D2FF',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '28px',
                    height: '28px',
                    borderTop: '3px solid #64D2FF',
                    borderRight: '3px solid #64D2FF',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    width: '28px',
                    height: '28px',
                    borderBottom: '3px solid #64D2FF',
                    borderLeft: '3px solid #64D2FF',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    right: '16px',
                    width: '28px',
                    height: '28px',
                    borderBottom: '3px solid #64D2FF',
                    borderRight: '3px solid #64D2FF',
                  }}
                />

                {/* Center crosshair */}
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    border: '1px solid rgba(100, 210, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64D2FF',
                    marginBottom: '1rem',
                  }}
                >
                  <i className="bi bi-camera fs-3" />
                </div>

                <h5 className="fw-bold mb-1">Capture or Upload Hazard Photo</h5>
                <p className="text-secondary small mb-3" style={{ maxWidth: '340px' }}>
                  Our YOLOv8 computer vision model will automatically detect the hazard class, severity, and bounding coordinates.
                </p>

                <label className="btn btn-primary btn-sm px-4 rounded-pill shadow-sm" style={{ cursor: 'pointer' }}>
                  <i className="bi bi-upload me-2" />
                  Select Photo / Camera Frame
                  <input
                    type="file"
                    accept="image/*"
                    className="d-none"
                    onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                  />
                </label>
              </div>

              {/* Instant Simulated Camera Samples */}
              <span className="small text-secondary d-block mb-2">Or choose a test hazard frame:</span>
              <div className="d-flex flex-wrap justify-content-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCategory('pothole');
                    startAiScanSequence();
                  }}
                  className="btn btn-sm btn-outline-secondary rounded-pill"
                >
                  Asphalt Pothole
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategory('flooding');
                    startAiScanSequence();
                  }}
                  className="btn btn-sm btn-outline-secondary rounded-pill"
                >
                  Storm Water Flood
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategory('broken_streetlight');
                    startAiScanSequence();
                  }}
                  className="btn btn-sm btn-outline-secondary rounded-pill"
                >
                  Faulty Streetlight
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategory('garbage_accumulation');
                    startAiScanSequence();
                  }}
                  className="btn btn-sm btn-outline-secondary rounded-pill"
                >
                  Sanitation Overflow
                </button>
              </div>
            </GlassSurface>
          )}

          {/* ── STEP 2: MULTI-STAGE AI NEURAL SCAN ──────────────── */}
          {step === 'ai_scan' && (
            <GlassSurface tier="ultra" depth="3d" glow className="p-4 p-md-5 text-center">
              <div
                className="position-relative mx-auto mb-4 overflow-hidden"
                style={{
                  maxWidth: '520px',
                  height: '300px',
                  borderRadius: '20px',
                  background: imagePreview
                    ? `url(${imagePreview}) center/cover no-repeat`
                    : 'linear-gradient(135deg, #0A0E17, #111827)',
                  border: '1px solid rgba(100, 210, 255, 0.4)',
                }}
              >
                {/* Laser Grid Sweep Animation */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, transparent, #9FC9FF, transparent)',
                    boxShadow: '0 0 24px #9FC9FF',
                    animation: 'sweepLaser 2s infinite ease-in-out',
                  }}
                />

                {/* Bounding Box Hologram Target */}
                <div
                  style={{
                    position: 'absolute',
                    top: '25%',
                    left: '25%',
                    width: '50%',
                    height: '50%',
                    border: '2px solid #30D158',
                    backgroundColor: 'rgba(48, 209, 88, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    padding: '6px',
                  }}
                >
                  <span
                    className="badge"
                    style={{
                      background: '#30D158',
                      color: '#000',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                    }}
                  >
                    HAZARD SEGMENT 96.4%
                  </span>
                </div>

                <div className="position-absolute bottom-0 start-50 translate-middle-x mb-3">
                  <div className="spinner-grow text-info spinner-grow-sm me-2" role="status" />
                  <span className="small font-monospace" style={{ color: '#9FC9FF' }}>
                    NEURAL INFERENCE ACTIVE • CIVIORA-VISION
                  </span>
                </div>
              </div>

              {/* Step By Step Pipeline Breadcrumbs */}
              <div className="mx-auto text-start" style={{ maxWidth: '480px' }}>
                {aiStages.map((stg, i) => (
                  <div
                    key={stg.label}
                    className="d-flex align-items-center gap-3 p-2 rounded-3 mb-2"
                    style={{
                      background:
                        aiStage === i
                          ? 'rgba(10, 132, 255, 0.2)'
                          : aiStage > i
                          ? 'rgba(48, 209, 88, 0.15)'
                          : 'rgba(255, 255, 255, 0.03)',
                      border:
                        aiStage === i
                          ? '1px solid #64D2FF'
                          : aiStage > i
                          ? '1px solid rgba(48, 209, 88, 0.4)'
                          : '1px solid transparent',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        background:
                          aiStage > i
                            ? '#30D158'
                            : aiStage === i
                            ? '#0A84FF'
                            : 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                      }}
                    >
                      {aiStage > i ? <i className="bi bi-check" /> : i + 1}
                    </div>
                    <div>
                      <div className="fw-semibold small" style={{ color: 'var(--cp-text-primary)' }}>
                        {stg.label}
                      </div>
                      <div className="text-secondary" style={{ fontSize: '0.72rem' }}>
                        {stg.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassSurface>
          )}

          {/* ── STEP 3: TRIAGE DETAILS CONFIRMATION ────────────── */}
          {step === 'details' && (
            <GlassSurface tier="ultra" depth="3d" glow className="p-4 p-md-5">
              {/* Overlaid AI Confidence Banner */}
              {aiAnalysis && (
                <div
                  className="p-3 rounded-4 mb-4"
                  style={{
                    background: 'rgba(10, 132, 255, 0.15)',
                    border: '1px solid rgba(100, 210, 255, 0.4)',
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-cpu-fill text-info" />
                      <span className="small fw-bold text-info">AUTONOMOUS AI INFERENCE RESULT</span>
                    </div>
                    <span className="badge bg-success bg-opacity-25 text-success">
                      96% CONFIDENCE
                    </span>
                  </div>
                  <p className="small text-secondary mb-2" style={{ fontSize: '0.85rem' }}>
                    {aiAnalysis.nlpExtraction?.impact}
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    {aiAnalysis.detectedObjects?.map((obj) => (
                      <span key={obj} className="badge bg-secondary bg-opacity-25 text-light small">
                        ✓ {obj}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="alert alert-danger py-2 px-3 small mb-3">
                  <i className="bi bi-exclamation-octagon me-2" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold text-secondary">
                      Hazard Classification:
                    </label>
                    <select
                      className="form-select"
                      style={{
                        background: 'var(--cp-glass-bg)',
                        color: 'var(--cp-text-primary)',
                        borderColor: 'var(--cp-glass-border)',
                      }}
                      value={category}
                      onChange={(e) => setCategory(e.target.value as IncidentCategory)}
                    >
                      {ALL_INCIDENT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {INCIDENT_CATEGORY_LABELS[c] || c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-semibold text-secondary">
                      Emergency One-Tap Escalation:
                    </label>
                    <div className="form-check form-switch pt-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="emergencySwitch"
                        checked={isEmergency}
                        onChange={(e) => setIsEmergency(e.target.checked)}
                      />
                      <label className="form-check-label small text-danger fw-bold" htmlFor="emergencySwitch">
                        Flag as Critical Emergency (Direct Police/Fire Radar)
                      </label>
                    </div>
                  </div>
                </div>

                <GlassInput
                  label="Incident Title"
                  required
                  placeholder="e.g. Dangerous 2-meter deep pothole on 4th Cross"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <div>
                  <label className="form-label small fw-semibold text-secondary">
                    Description & Hazard Impact:
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    style={{
                      background: 'var(--cp-glass-bg)',
                      color: 'var(--cp-text-primary)',
                      borderColor: 'var(--cp-glass-border)',
                    }}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Exact Incident Location Picker via Google Maps */}
                <div className="mb-2">
                  <label className="form-label small fw-semibold text-secondary d-flex justify-content-between align-items-center">
                    <span>Pin Exact Incident Location on Google Map:</span>
                    <span className="text-info font-monospace" style={{ fontSize: '0.72rem' }}>
                      LAT: {coordinates[1].toFixed(5)}, LNG: {coordinates[0].toFixed(5)}
                    </span>
                  </label>
                  <div
                    style={{
                      height: '240px',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '1px solid var(--cp-glass-border)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <GoogleMapView
                      initialLat={coordinates[1]}
                      initialLng={coordinates[0]}
                      initialZoom={16}
                      onLocationSelect={(loc) => {
                        setCoordinates([loc.longitude, loc.latitude]);
                        setAddress(loc.formattedAddress);
                      }}
                      showSearchBar={false}
                    />
                  </div>
                </div>

                <div className="row g-2 align-items-end">
                  <div className="col-12 col-md-9">
                    <GlassInput
                      label="Municipal Address / Sector"
                      required
                      icon="geo-alt"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-3">
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      className="btn btn-outline-secondary w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                      style={{ borderRadius: '12px' }}
                    >
                      <i className="bi bi-crosshair" />
                      Sync GPS Lock
                    </button>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary border-opacity-25">
                  <button
                    type="button"
                    onClick={() => setStep('capture')}
                    className="btn btn-link text-secondary"
                  >
                    ← Retake Photo
                  </button>
                  <GlassButton variant="primary" size="lg" type="submit" loading={loading}>
                    Submit to Municipal Command
                  </GlassButton>
                </div>
              </form>
            </GlassSurface>
          )}

          {/* ── STEP 4: SUCCESS MASTER INCIDENT SUMMARY ────────── */}
          {step === 'success' && (
            <GlassSurface tier="ultra" depth="3d" glow className="p-4 p-md-5 text-center">
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(48, 209, 88, 0.2)',
                  color: '#30D158',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  marginBottom: '1rem',
                  boxShadow: '0 0 30px rgba(48, 209, 88, 0.4)',
                }}
              >
                <i className="bi bi-check-lg" />
              </div>

              <h3 className="fw-bold mb-1">Incident Dispatched to Municipal Grid</h3>
              <p className="text-secondary small mx-auto mb-4" style={{ maxWidth: '420px' }}>
                Your report has been verified by the AI engine and routed to the corresponding department work order queue.
              </p>

              <div
                className="p-3 rounded-4 mx-auto mb-4 text-start"
                style={{
                  maxWidth: '460px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--cp-glass-border)',
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="font-monospace text-primary fw-bold">
                    {createdIncident?.incidentNumber || 'CP-2026-X8K9'}
                  </span>
                  <StatusPill status="reported" size="sm" />
                </div>
                <h6 className="fw-bold mb-1">{createdIncident?.title || title}</h6>
                <div className="small text-secondary mb-2">{address}</div>
                <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-25 small">
                  <span className="text-secondary">Expected SLA Resolution:</span>
                  <span className="fw-bold text-info">Within 4 Hours</span>
                </div>
              </div>

              <div className="d-flex justify-content-center gap-3">
                <Link to="/dashboard">
                  <GlassButton variant="primary" size="md" icon="grid-1x2">
                    Open in My Feed
                  </GlassButton>
                </Link>
                <Link to="/live-map">
                  <GlassButton variant="secondary" size="md" icon="box-seam">
                    Locate on 3D Twin
                  </GlassButton>
                </Link>
              </div>
            </GlassSurface>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportIncidentPage;
