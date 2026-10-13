// ============================================================
// CivicPulse Landing Page — Apple-Inspired Spatial Liquid Glass
// 3D Digital City + Urban Risk Globe + AI Neural Pipeline
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CityScene } from '../../three/CityScene';
import { UrbanRiskGlobe } from '../../three/UrbanRiskGlobe';
import { useAuthStore } from '../../stores/authStore';
import { useLocationStore } from '../../stores/locationStore';
import {
  GlassSurface,
  GlassCard,
  GlassButton,
  GlassSegmentedControl,
  StatusPill,
  RiskBadge,
} from '../../design-system/components';
import { animateMetric } from '../../motion/motionSystem';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { selectedLocation, openAuthGate } = useLocationStore();

  const [activeTab, setActiveTab] = useState<'citizen' | 'worker' | 'officer' | 'admin'>('citizen');
  const [inspectedBeacon, setInspectedBeacon] = useState<string | null>(null);

  const metric1Ref = useRef<HTMLDivElement>(null);
  const metric2Ref = useRef<HTMLDivElement>(null);
  const metric3Ref = useRef<HTMLDivElement>(null);
  const metric4Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate metric numbers on landing page mount
    if (metric1Ref.current) animateMetric(metric1Ref.current, 0, 142, '', 1600);
    if (metric2Ref.current) animateMetric(metric2Ref.current, 0, 28, 'm', 1400);
    if (metric3Ref.current) animateMetric(metric3Ref.current, 0, 98.4, '%', 1800);
    if (metric4Ref.current) animateMetric(metric4Ref.current, 0, 96.2, '%', 1800);
  }, []);

  const handleSelectLocation = () => {
    if (!isAuthenticated) {
      openAuthGate(
        'Sign in to CivicPulse before selecting your civic area. Your selected location helps CivicPulse provide relevant municipal alerts and real-time response times.',
        '/setup-location'
      );
    } else {
      navigate('/setup-location');
    }
  };

  const handleEnterCivicPulse = () => {
    if (!isAuthenticated) {
      openAuthGate(
        'Sign in to access CivicPulse spatial intelligence and live operations.',
        selectedLocation ? '/dashboard' : '/setup-location'
      );
    } else if (!selectedLocation) {
      navigate('/setup-location');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="container-fluid px-3 px-lg-5 py-4">
      {/* ── SECTION 1: HERO & 3D CITY DIGITAL TWIN ──────────── */}
      <section className="row align-items-center g-5 py-3 py-lg-5 min-vh-75">
        <div className="col-12 col-xl-6">
          {/* Spatial Live Tag */}
          <div
            className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-3"
            style={{
              background: 'rgba(82, 127, 199, 0.18)',
              border: '1px solid rgba(159, 201, 255, 0.35)',
              boxShadow: '0 0 20px rgba(82, 127, 199, 0.25)',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#9FC9FF',
                boxShadow: '0 0 10px #9FC9FF',
              }}
              className="animate-pulse-glow"
            />
            <span
              className="small fw-semibold"
              style={{ color: '#9FC9FF', letterSpacing: '0.08em', fontSize: '0.78rem' }}
            >
              CIVIORA OS 2.0 • SPATIAL CIVIC INTELLIGENCE
            </span>
          </div>

          {/* Cinematic Title */}
          <h1
            className="display-4 fw-extrabold mb-3 tracking-tight"
            style={{
              lineHeight: 1.12,
              letterSpacing: '-0.03em',
              color: 'var(--cp-text-primary)',
            }}
          >
            Understand the city.{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #9FC9FF 0%, #527FC7 50%, #64B5F6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Respond intelligently.
            </span>
          </h1>

          <p
            className="lead text-secondary mb-4"
            style={{ fontSize: '1.15rem', maxWidth: '580px', lineHeight: 1.6 }}
          >
            Civiora unifies citizens, municipal departments, and field responders into an
            adaptive spatial intelligence platform. Powered by real-time computer vision, automated
            risk scoring, dynamic SLAs, and an interactive 3D digital twin.
          </p>

          {/* Action CTAs */}
          <div className="d-flex flex-wrap align-items-center gap-3 mb-5">
            <GlassButton
              variant="primary"
              size="lg"
              glow
              icon="geo-alt-fill"
              onClick={handleSelectLocation}
            >
              Select Your Location
            </GlassButton>
            <GlassButton
              variant="ice"
              size="lg"
              icon="box-arrow-in-right"
              onClick={handleEnterCivicPulse}
            >
              Enter Civiora
            </GlassButton>
            <Link to="/live-map">
              <GlassButton variant="secondary" size="lg" icon="box-seam">
                3D Digital Twin
              </GlassButton>
            </Link>
          </div>

          {/* Live Dynamic Telemetry Metrics */}
          <div className="row g-3">
            <div className="col-6 col-sm-3">
              <GlassCard tier="strong" depth="subtle" statusDot="warning" className="p-3 text-center">
                <span className="small text-secondary d-block mb-1">Active Incidents</span>
                <div
                  ref={metric1Ref}
                  className="fs-3 fw-bold font-monospace"
                  style={{ color: '#FF9F0A' }}
                >
                  142
                </div>
                <span className="small fw-semibold" style={{ color: '#FF9F0A', fontSize: '0.72rem' }}>
                  ↓ 8% this week
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-sm-3">
              <GlassCard tier="strong" depth="subtle" statusDot="success" className="p-3 text-center">
                <span className="small text-secondary d-block mb-1">Avg Response</span>
                <div
                  ref={metric2Ref}
                  className="fs-3 fw-bold font-monospace"
                  style={{ color: '#30D158' }}
                >
                  28m
                </div>
                <span className="small text-success fw-semibold" style={{ fontSize: '0.72rem' }}>
                  ↓ 14m faster
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-sm-3">
              <GlassCard tier="strong" depth="subtle" statusDot="primary" className="p-3 text-center">
                <span className="small text-secondary d-block mb-1">SLA Adherence</span>
                <div
                  ref={metric3Ref}
                  className="fs-3 fw-bold font-monospace"
                  style={{ color: '#527FC7' }}
                >
                  98.4%
                </div>
                <span className="small fw-semibold" style={{ color: '#9FC9FF', fontSize: '0.72rem' }}>
                  ↑ 1.2% high
                </span>
              </GlassCard>
            </div>
            <div className="col-6 col-sm-3">
              <GlassCard tier="strong" depth="subtle" statusDot="ice" className="p-3 text-center">
                <span className="small text-secondary d-block mb-1">AI Accuracy</span>
                <div
                  ref={metric4Ref}
                  className="fs-3 fw-bold font-monospace"
                  style={{ color: '#9FC9FF' }}
                >
                  96.2%
                </div>
                <span className="small fw-semibold" style={{ color: '#9FC9FF', fontSize: '0.72rem' }}>
                  YOLOv8 & ResNet
                </span>
              </GlassCard>
            </div>
          </div>
        </div>

        {/* ── 3D Digital Twin Hero Scene Canvas ──────────────── */}
        <div className="col-12 col-xl-6">
          <GlassSurface
            tier="ultra"
            depth="3d"
            glow
            style={{
              height: 'clamp(340px, 48vh, 580px)',
              borderRadius: '28px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 24px 70px rgba(0, 0, 0, 0.5), 0 0 50px rgba(10, 132, 255, 0.2)',
            }}
          >
            <CityScene onSelectIncident={(id) => setInspectedBeacon(id)} />

            {/* Overlaid Live Spatial Inspector */}
            {inspectedBeacon && (
              <div
                className="position-absolute p-3 rounded-4 glass-surface"
                style={{
                  top: '1rem',
                  right: '1rem',
                  maxWidth: 'calc(100% - 2rem)',
                  width: '300px',
                  background: 'rgba(10, 14, 23, 0.88)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(100, 210, 255, 0.4)',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
                  zIndex: 20,
                  animation: 'fadeIn 0.2s ease-out',
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small text-secondary fw-semibold font-monospace">
                    NODE INSPECTOR
                  </span>
                  <button
                    onClick={() => setInspectedBeacon(null)}
                    className="btn btn-sm btn-close btn-close-white"
                  />
                </div>
                <h6 className="fw-bold mb-1" style={{ color: 'var(--cp-text-primary)' }}>
                  Monsoon Drainage Breach
                </h6>
                <div className="d-flex gap-2 my-2">
                  <StatusPill status="in_progress" size="sm" />
                  <RiskBadge level="high" score={88} />
                </div>
                <p className="small text-secondary mb-3" style={{ fontSize: '0.8rem' }}>
                  Sector 4, Central Storm Runoff. Dispatched to Quick Response Water Board crew.
                </p>
                <Link to="/live-map" className="btn btn-sm btn-primary w-100 fw-semibold">
                  Inspect in 3D Center
                </Link>
              </div>
            )}
          </GlassSurface>
        </div>
      </section>

      {/* ── SECTION 2: 3D URBAN RISK GLOBE ─────────────────── */}
      <section className="py-5 my-3">
        <div className="text-center mb-5">
          <span
            className="text-uppercase fw-semibold small"
            style={{ color: '#64D2FF', letterSpacing: '0.12em' }}
          >
            GLOBAL & MUNICIPAL RISK TOPOLOGY
          </span>
          <h2 className="fw-bold mt-1 display-6">Spatial Risk Globe & Predictive Zones</h2>
          <p className="text-secondary mx-auto" style={{ maxWidth: '640px' }}>
            Interactive 3D geospatial risk visualization modeling cross-sector infrastructure
            vulnerabilities, historical storm water levels, and predicted road fatigue.
          </p>
        </div>

        <div className="row g-4 align-items-center">
          <div className="col-12 col-lg-8" style={{ height: 'clamp(320px, 45vh, 540px)' }}>
            <UrbanRiskGlobe />
          </div>

          <div className="col-12 col-lg-4 d-flex flex-column gap-3">
            <GlassCard tier="strong" depth="subtle" className="p-4">
              <div className="d-flex align-items-center gap-3 mb-2">
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(255, 69, 58, 0.2)',
                    color: '#FF453A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                  }}
                >
                  <i className="bi bi-exclamation-triangle" />
                </div>
                <div>
                  <h6 className="fw-bold mb-0">Automated Risk Scoring</h6>
                  <span className="small text-secondary">Multi-Factor Vulnerability Index</span>
                </div>
              </div>
              <p className="small text-secondary mb-0">
                Aggregates weather radar feeds, traffic density heatmaps, and proximity to critical
                assets (schools, hospitals, fire stations) to dynamically compute incident urgency.
              </p>
            </GlassCard>

            <GlassCard tier="strong" depth="subtle" className="p-4">
              <div className="d-flex align-items-center gap-3 mb-2">
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(10, 132, 255, 0.2)',
                    color: '#0A84FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                  }}
                >
                  <i className="bi bi-bezier2" />
                </div>
                <div>
                  <h6 className="fw-bold mb-0">Great-Circle Data Arcs</h6>
                  <span className="small text-secondary">Cross-Zone Interdependency</span>
                </div>
              </div>
              <p className="small text-secondary mb-0">
                Visualizes cascade failure pathways between municipal water grids, power
                substations, and arterial transportation corridors across city zones.
              </p>
            </GlassCard>

            <GlassCard tier="strong" depth="subtle" className="p-4">
              <div className="d-flex align-items-center gap-3 mb-2">
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(191, 90, 242, 0.2)',
                    color: '#BF5AF2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                  }}
                >
                  <i className="bi bi-cpu" />
                </div>
                <div>
                  <h6 className="fw-bold mb-0">Predictive Maintenance</h6>
                  <span className="small text-secondary">InSAR & Sensor Analytics</span>
                </div>
              </div>
              <p className="small text-secondary mb-0">
                Highlights 7-day predicted maintenance hotspots before catastrophic pipe ruptures or
                sinkholes disrupt municipal commerce.
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: MULTI-MODAL AI PIPELINE ───────────────── */}
      <section className="py-5 my-4">
        <div className="text-center mb-5">
          <span
            className="text-uppercase fw-semibold small"
            style={{ color: '#64D2FF', letterSpacing: '0.12em' }}
          >
            AUTONOMOUS TRIAGE ENGINE
          </span>
          <h2 className="fw-bold mt-1 display-6">Multi-Modal AI Built for Municipal Velocity</h2>
          <p className="text-secondary mx-auto" style={{ maxWidth: '640px' }}>
            From camera sensor to field work order in seconds. Eliminating manual dispatch delays
            with state-of-the-art vision models and perceptual clustering.
          </p>
        </div>

        <div className="row g-4">
          <div className="col-12 col-md-4">
            <GlassCard tier="strong" depth="3d" stepNumber="01" statusDot="primary" className="p-4 h-100">
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: 'rgba(82, 127, 199, 0.2)',
                  color: '#9FC9FF',
                  border: '1px solid rgba(159, 201, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginBottom: '1.25rem',
                }}
              >
                <i className="bi bi-camera-viewfinder" />
              </div>
              <h5 className="fw-bold mb-2 text-white">Autonomous Visual Triage</h5>
              <p className="text-secondary small mb-3">
                Classifies 17+ municipal hazard classes from citizen photos with 96%+ accuracy.
                Calculates bounding boxes, surface degradation, and severity indices automatically.
              </p>
              <div className="d-flex flex-wrap gap-1">
                <span className="badge bg-secondary bg-opacity-25 text-secondary small">YOLOv8</span>
                <span className="badge bg-secondary bg-opacity-25 text-secondary small">
                  Transfer Learning
                </span>
                <span className="badge bg-secondary bg-opacity-25 text-secondary small">
                  Image Hash Dedup
                </span>
              </div>
            </GlassCard>
          </div>

          <div className="col-12 col-md-4">
            <GlassCard tier="strong" depth="3d" stepNumber="02" statusDot="ice" className="p-4 h-100">
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: 'rgba(159, 201, 255, 0.18)',
                  color: '#9FC9FF',
                  border: '1px solid rgba(159, 201, 255, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginBottom: '1.25rem',
                }}
              >
                <i className="bi bi-diagram-3" />
              </div>
              <h5 className="fw-bold mb-2 text-white">Duplicate & Cluster Engine</h5>
              <p className="text-secondary small mb-3">
                Eliminates ticket flooding during storm surges. Groups spatially and semantically
                similar reports into unified incident clusters with a single master dispatch.
              </p>
              <div className="d-flex flex-wrap gap-1">
                <span className="badge bg-secondary bg-opacity-25 text-secondary small">DBSCAN</span>
                <span className="badge bg-secondary bg-opacity-25 text-secondary small">
                  Sentence-BERT
                </span>
                <span className="badge bg-secondary bg-opacity-25 text-secondary small">
                  Perceptual Hashing
                </span>
              </div>
            </GlassCard>
          </div>

          <div className="col-12 col-md-4">
            <GlassCard tier="strong" depth="3d" stepNumber="03" statusDot="warning" className="p-4 h-100">
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: 'rgba(255, 159, 10, 0.18)',
                  color: '#FF9F0A',
                  border: '1px solid rgba(255, 159, 10, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginBottom: '1.25rem',
                }}
              >
                <i className="bi bi-shield-check" />
              </div>
              <h5 className="fw-bold mb-2 text-white">Dynamic SLA & Auto-Escalation</h5>
              <p className="text-secondary small mb-3">
                Calculates risk scores based on weather warnings, school zones, and historical
                failure rates, enforcing rigorous SLA countdowns with real-time escalation.
              </p>
              <div className="d-flex flex-wrap gap-1">
                <span className="badge bg-secondary bg-opacity-25 text-secondary small">
                  Multi-Factor Risk
                </span>
                <span className="badge bg-secondary bg-opacity-25 text-secondary small">
                  Auto-Escalation
                </span>
                <span className="badge bg-secondary bg-opacity-25 text-secondary small">
                  BullMQ Queue
                </span>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: CONNECTED ECOSYSTEM ROLES ─────────────── */}
      <section className="py-5">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <span
              className="text-uppercase fw-semibold small"
              style={{ color: '#64D2FF', letterSpacing: '0.1em' }}
            >
              CONNECTED ECOSYSTEM
            </span>
            <h3 className="fw-bold mt-1">One Platform, Tailored for Every Persona</h3>
          </div>
          <GlassSegmentedControl
            value={activeTab}
            onChange={(val) => setActiveTab(val as any)}
            options={[
              { value: 'citizen', label: 'Citizens', icon: 'person' },
              { value: 'worker', label: 'Field Workers', icon: 'tools' },
              { value: 'officer', label: 'Command & Officers', icon: 'building-gear' },
              { value: 'admin', label: 'Admin & Security', icon: 'shield-lock' },
            ]}
          />
        </div>

        <div className="row g-4">
          <div className="col-12 col-md-6 col-lg-3">
            <GlassCard
              tier="strong"
              depth="3d"
              stepNumber="01"
              statusDot="ice"
              className="p-4 h-100"
              style={{
                borderColor: activeTab === 'citizen' ? 'rgba(159, 201, 255, 0.45)' : undefined,
                boxShadow: activeTab === 'citizen' ? '0 12px 36px rgba(82, 127, 199, 0.25)' : undefined,
              }}
            >
              <div className="d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-person-circle fs-3 text-primary" />
                <h6 className="fw-bold mb-0 text-white">Citizens</h6>
              </div>
              <ul className="text-secondary small ps-3 mb-0 d-flex flex-column gap-2">
                <li>Submit issues in &lt;15 seconds with GPS & photo</li>
                <li>Voice note and emergency one-tap SOS modes</li>
                <li>Real-time push status updates & timeline logs</li>
                <li>Community verification voting with trust scoring</li>
              </ul>
            </GlassCard>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <GlassCard
              tier="strong"
              depth="3d"
              stepNumber="02"
              statusDot="warning"
              className="p-4 h-100"
              style={{
                borderColor: activeTab === 'worker' ? 'rgba(255, 159, 10, 0.45)' : undefined,
                boxShadow: activeTab === 'worker' ? '0 12px 36px rgba(255, 159, 10, 0.25)' : undefined,
              }}
            >
              <div className="d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-tools fs-3 text-warning" />
                <h6 className="fw-bold mb-0 text-white">Field Workers</h6>
              </div>
              <ul className="text-secondary small ps-3 mb-0 d-flex flex-column gap-2">
                <li>Prioritized task queue with route navigation</li>
                <li>Offline sync with local SQLite caching</li>
                <li>Before & after photo proof with tamper hashes</li>
                <li>Real-time telemetry and location tracking</li>
              </ul>
            </GlassCard>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <GlassCard
              tier="strong"
              depth="3d"
              stepNumber="03"
              statusDot="primary"
              className="p-4 h-100"
              style={{
                borderColor: activeTab === 'officer' ? 'rgba(82, 127, 199, 0.45)' : undefined,
                boxShadow: activeTab === 'officer' ? '0 12px 36px rgba(82, 127, 199, 0.25)' : undefined,
              }}
            >
              <div className="d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-building-gear fs-3" style={{ color: '#527FC7' }} />
                <h6 className="fw-bold mb-0 text-white">Officers & Managers</h6>
              </div>
              <ul className="text-secondary small ps-3 mb-0 d-flex flex-column gap-2">
                <li>Departmental triage & work order dispatching</li>
                <li>Live SLA countdown boards & breach alerts</li>
                <li>Resource capacity & contractor productivity</li>
                <li>Cross-department escalations & emergency broadcasts</li>
              </ul>
            </GlassCard>
          </div>

          <div className="col-12 col-md-6 col-lg-3">
            <GlassCard
              tier="strong"
              depth="3d"
              stepNumber="04"
              statusDot="danger"
              className="p-4 h-100"
              style={{
                borderColor: activeTab === 'admin' ? 'rgba(255, 69, 58, 0.45)' : undefined,
                boxShadow: activeTab === 'admin' ? '0 12px 36px rgba(255, 69, 58, 0.25)' : undefined,
              }}
            >
              <div className="d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-shield-lock-fill fs-3 text-danger" />
                <h6 className="fw-bold mb-0 text-white">Admin & Security</h6>
              </div>
              <ul className="text-secondary small ps-3 mb-0 d-flex flex-column gap-2">
                <li>Full 3D City Digital Twin with GIS heatmaps</li>
                <li>Multi-tenant municipal organization manager</li>
                <li>RBAC/ABAC granular policy management</li>
                <li>Immutable security audit logs & fraud detection</li>
              </ul>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: 1-CLICK DEMO PERSONA LAUNCHPAD ────────── */}
      <section className="my-5">
        <GlassSurface tier="ultra" depth="3d" glow className="p-4 p-lg-5 text-center">
          <span
            className="text-uppercase fw-semibold small d-inline-block mb-2"
            style={{ color: '#9FC9FF', letterSpacing: '0.12em' }}
          >
            MUNICIPAL MULTI-TENANT SIMULATOR
          </span>
          <h3 className="fw-bold mb-2 text-white">Explore Civiora with Pre-Configured Demo Accounts</h3>
          <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '640px' }}>
            Experience the spatial command platform from any operational perspective. All demo accounts use the standard password{' '}
            <code
              className="px-2 py-1 rounded font-monospace"
              style={{
                color: '#9FC9FF',
                background: 'rgba(82, 127, 199, 0.15)',
                border: '1px solid rgba(159, 201, 255, 0.2)',
              }}
            >
              CivicPulse@2026
            </code>
            .
          </p>

          <div className="d-flex flex-wrap justify-content-center gap-2">
            <Link to="/login?email=citizen@civicpulse.demo">
              <GlassButton variant="secondary" size="sm" icon="person">
                Citizen (Priya)
              </GlassButton>
            </Link>
            <Link to="/login?email=worker@civicpulse.demo">
              <GlassButton variant="secondary" size="sm" icon="tools">
                Field Worker (Rajesh)
              </GlassButton>
            </Link>
            <Link to="/login?email=officer@civicpulse.demo">
              <GlassButton variant="secondary" size="sm" icon="person-badge">
                Officer (Anita)
              </GlassButton>
            </Link>
            <Link to="/login?email=manager@civicpulse.demo">
              <GlassButton variant="ice" size="sm" icon="speedometer2">
                Manager (Vikram)
              </GlassButton>
            </Link>
            <Link to="/login?email=emergency@civicpulse.demo">
              <GlassButton variant="danger" size="sm" icon="exclamation-triangle">
                Emergency (Meera)
              </GlassButton>
            </Link>
            <Link to="/login?email=admin@civicpulse.demo">
              <GlassButton variant="primary" size="sm" icon="shield-shaded" glow>
                System Admin (Suresh)
              </GlassButton>
            </Link>
          </div>
        </GlassSurface>
      </section>
    </div>
  );
};

export default LandingPage;
