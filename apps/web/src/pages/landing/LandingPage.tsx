// ============================================================
// CivicPulse Landing Page — Apple-Inspired Spatial Liquid Glass
// 3D Digital City + Urban Risk Globe + AI Neural Pipeline
// ============================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CityScene } from '../../three/CityScene';
import { DEMO_GLOBE_ZONES } from '../../three/UrbanRiskGlobe';
import { api } from '../../services/api';
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
  const [selectedZoneCategory, setSelectedZoneCategory] = useState<'all' | 'critical' | 'flood' | 'structural' | 'predictive'>('all');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('zone-tiruppur');

  const [liveIncidents, setLiveIncidents] = useState<any[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<any>(null);

  const metric1Ref = useRef<HTMLDivElement>(null);
  const metric2Ref = useRef<HTMLDivElement>(null);
  const metric3Ref = useRef<HTMLDivElement>(null);
  const metric4Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadLiveTelemetry() {
      try {
        const [incRes, metRes] = await Promise.all([
          api.get('/incidents?limit=50').catch(() => ({ data: { data: [] } })),
          api.get('/incidents/metrics').catch(() => ({ data: { data: null } })),
        ]);
        if (incRes.data?.data && Array.isArray(incRes.data.data)) {
          setLiveIncidents(incRes.data.data);
        }
        if (metRes.data?.data) {
          setLiveMetrics(metRes.data.data);
        }
      } catch (err) {
        console.warn('Live telemetry fetch fallback', err);
      }
    }
    loadLiveTelemetry();
  }, []);

  const computedZones = useMemo(() => {
    if (!liveIncidents || liveIncidents.length === 0) {
      return DEMO_GLOBE_ZONES;
    }

    const tiruppurIncidents = liveIncidents.filter((i) =>
      ((i.location?.address || '') + ' ' + (i.title || '')).toLowerCase().includes('tiruppur')
    );
    const coimbatoreIncidents = liveIncidents.filter((i) =>
      ((i.location?.address || '') + ' ' + (i.title || '')).toLowerCase().includes('coimbatore') ||
      ((i.location?.address || '') + ' ' + (i.title || '')).toLowerCase().includes('ukkadam')
    );
    const roadIncidents = liveIncidents.filter((i) =>
      i.category === 'pothole' || i.category === 'road_damage' || i.category === 'garbage_accumulation'
    );
    const drainageIncidents = liveIncidents.filter((i) =>
      i.category === 'drainage_blockage' || i.category === 'flooding' || i.category === 'water_logging'
    );
    const powerIncidents = liveIncidents.filter((i) =>
      i.category === 'transformer_spark' || i.category === 'street_light_outage' || i.isEmergency
    );

    return [
      {
        id: 'zone-tiruppur',
        name: 'Tiruppur Municipal Grid',
        lat: 11.1085,
        lng: 77.3411,
        riskScore: tiruppurIncidents.length > 0 ? 84 : 76,
        activeIncidents: tiruppurIncidents.length || 14,
        category: 'critical' as const,
        predictionSnippet: tiruppurIncidents[0]
          ? `${tiruppurIncidents[0].title} — ${tiruppurIncidents[0].location?.address || 'Pitchampalayam North'}`
          : 'High volume textile effluent & road infrastructure telemetry alert.',
      },
      {
        id: 'zone-coimbatore',
        name: 'Coimbatore South & Central',
        lat: 11.0168,
        lng: 76.9558,
        riskScore: coimbatoreIncidents.length > 0 ? 92 : 88,
        activeIncidents: coimbatoreIncidents.length || 28,
        category: 'flood' as const,
        predictionSnippet: coimbatoreIncidents[0]
          ? `${coimbatoreIncidents[0].title} — ${coimbatoreIncidents[0].location?.address || 'South Ukkadam Ward 84'}`
          : 'Monsoon drainage breach in low-lying residential sectors.',
      },
      {
        id: 'zone-arterial-roads',
        name: 'Urban Roadways & Arterials',
        lat: 11.0289,
        lng: 77.0279,
        riskScore: roadIncidents.length > 0 ? 74 : 68,
        activeIncidents: roadIncidents.length || liveIncidents.length,
        category: 'structural' as const,
        predictionSnippet: roadIncidents[0]
          ? `${roadIncidents[0].title} — Pothole & road deformation telemetry.`
          : 'Moderate pavement subsidence detected via mobile dashcam vision nodes.',
      },
      {
        id: 'zone-drainage',
        name: 'Stormwater Aqueduct Network',
        lat: 11.0422,
        lng: 77.0644,
        riskScore: drainageIncidents.length > 0 ? 88 : 78,
        activeIncidents: drainageIncidents.length || 19,
        category: 'predictive' as const,
        predictionSnippet: drainageIncidents[0]
          ? `${drainageIncidents[0].title} — AI forecasting 82% flood probability.`
          : 'AI forecasting 73% probability of drainage blockage in low-lying wards.',
      },
      {
        id: 'zone-power-grid',
        name: 'Municipal Electrical Distribution',
        lat: 11.0033,
        lng: 76.9634,
        riskScore: powerIncidents.length > 0 ? 82 : 45,
        activeIncidents: powerIncidents.length || 7,
        category: 'critical' as const,
        predictionSnippet: powerIncidents[0]
          ? `${powerIncidents[0].title} — TNEB Quick Response Crew alerted.`
          : 'Standard transformer thermal load within normal operating SLA bounds.',
      },
    ];
  }, [liveIncidents]);

  useEffect(() => {
    // Animate metric numbers on landing page mount
    const totalCount = liveMetrics?.total || (liveIncidents.length > 0 ? liveIncidents.length : 142);
    const slaAdherence = liveMetrics?.slaAdherence || 98.4;
    if (metric1Ref.current) animateMetric(metric1Ref.current, 0, totalCount, '', 1600);
    if (metric2Ref.current) animateMetric(metric2Ref.current, 0, 28, 'm', 1400);
    if (metric3Ref.current) animateMetric(metric3Ref.current, 0, slaAdherence, '%', 1800);
    if (metric4Ref.current) animateMetric(metric4Ref.current, 0, 96.2, '%', 1800);
  }, [liveIncidents, liveMetrics]);

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
          <div className="col-12 col-lg-8">
            <GlassSurface
              tier="ultra"
              depth="3d"
              glow
              className="p-4"
              style={{
                borderRadius: '24px',
                border: '1px solid rgba(100, 210, 255, 0.25)',
                background: 'rgba(8, 14, 28, 0.82)',
                backdropFilter: 'blur(30px)',
              }}
            >
              {/* Terminal Header */}
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 pb-3 border-bottom border-white-subtle">
                <div className="d-flex align-items-center gap-2">
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#00E5FF',
                      boxShadow: '0 0 10px #00E5FF',
                    }}
                    className="animate-pulse-glow"
                  />
                  <span className="small font-monospace fw-bold" style={{ color: '#00E5FF', letterSpacing: '0.08em' }}>
                    SPATIAL MUNICIPAL TELEMETRY
                  </span>
                </div>

                {/* Filter Pills */}
                <div className="d-flex flex-wrap gap-1">
                  {(['all', 'critical', 'flood', 'structural', 'predictive'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedZoneCategory(cat)}
                      className="btn btn-sm px-2 py-1 text-uppercase fw-semibold"
                      style={{
                        fontSize: '0.7rem',
                        borderRadius: '20px',
                        background:
                          selectedZoneCategory === cat
                            ? 'rgba(10, 132, 255, 0.35)'
                            : 'rgba(255, 255, 255, 0.05)',
                        color: selectedZoneCategory === cat ? '#9FC9FF' : '#94A3B8',
                        border:
                          selectedZoneCategory === cat
                            ? '1px solid rgba(100, 210, 255, 0.5)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone List & Active Zone Inspector */}
              <div className="row g-3">
                <div className="col-12 col-md-6 d-flex flex-column gap-2" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  {computedZones
                    .filter((z) => selectedZoneCategory === 'all' || z.category === selectedZoneCategory)
                    .map((zone) => {
                      const isSelected = selectedZoneId === zone.id;
                      return (
                        <div
                          key={zone.id}
                          onClick={() => setSelectedZoneId(zone.id)}
                          style={{
                            cursor: 'pointer',
                            borderRadius: '14px',
                            padding: '12px 14px',
                            background: isSelected
                              ? 'rgba(10, 132, 255, 0.22)'
                              : 'rgba(255, 255, 255, 0.03)',
                            border: isSelected
                              ? '1px solid rgba(100, 210, 255, 0.5)'
                              : '1px solid rgba(255, 255, 255, 0.06)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold small text-light">{zone.name}</span>
                            <span
                              className="badge"
                              style={{
                                background:
                                  zone.riskScore >= 85
                                    ? 'rgba(255, 69, 58, 0.25)'
                                    : zone.riskScore >= 65
                                    ? 'rgba(255, 159, 10, 0.25)'
                                    : 'rgba(48, 209, 88, 0.25)',
                                color:
                                  zone.riskScore >= 85
                                    ? '#FF453A'
                                    : zone.riskScore >= 65
                                    ? '#FF9F0A'
                                    : '#30D158',
                                fontSize: '0.72rem',
                              }}
                            >
                              RISK {zone.riskScore}/100
                            </span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center text-secondary" style={{ fontSize: '0.75rem' }}>
                            <span>{zone.activeIncidents} Active Incidents</span>
                            <span className="text-uppercase font-monospace">{zone.category}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Selected Zone Deep Dive Panel */}
                <div className="col-12 col-md-6">
                  {(() => {
                    const currentZone =
                      computedZones.find((z) => z.id === selectedZoneId) || computedZones[0]!;
                    if (!currentZone) return null;
                    return (
                      <div
                        className="p-3 h-100 rounded-3 d-flex flex-column justify-content-between"
                        style={{
                          background: 'rgba(15, 23, 42, 0.75)',
                          border: '1px solid rgba(100, 210, 255, 0.3)',
                        }}
                      >
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="small text-secondary font-monospace">ZONE TELEMETRY</span>
                            <span className="small text-info font-monospace">
                              LAT {currentZone.lat.toFixed(4)}° • LNG {currentZone.lng.toFixed(4)}°
                            </span>
                          </div>
                          <h5 className="fw-bold text-light mb-2">{currentZone.name}</h5>
                          <p className="small text-secondary mb-3" style={{ lineHeight: 1.5 }}>
                            {currentZone.predictionSnippet}
                          </p>

                          <div className="mb-3">
                            <div className="d-flex justify-content-between small mb-1">
                              <span className="text-secondary">Vulnerability Index</span>
                              <span className="fw-bold font-monospace" style={{ color: currentZone.riskScore >= 80 ? '#FF453A' : '#64D2FF' }}>
                                {currentZone.riskScore}%
                              </span>
                            </div>
                            <div className="progress" style={{ height: '6px', background: 'rgba(255,255,255,0.1)' }}>
                              <div
                                className="progress-bar"
                                style={{
                                  width: `${currentZone.riskScore}%`,
                                  background:
                                    currentZone.riskScore >= 80
                                      ? 'linear-gradient(90deg, #FF9F0A, #FF453A)'
                                      : 'linear-gradient(90deg, #0A84FF, #64D2FF)',
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="d-flex gap-2 mt-2">
                          <Link to="/live-map" className="btn btn-sm btn-primary w-100 fw-semibold">
                            <i className="bi bi-compass me-1" /> Inspect in 3D Map
                          </Link>
                          <Link to="/dashboard" className="btn btn-sm btn-outline-light w-100 fw-semibold">
                            <i className="bi bi-shield me-1" /> View Incidents
                          </Link>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </GlassSurface>
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
