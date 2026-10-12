// ============================================================
// CivicPulse Spatial Command Center Dashboard
// Central 3D Digital Twin + Floating Intelligence Docks + Glass Data Sheet
// ============================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useLocationStore } from '../../stores/locationStore';
import { api } from '../../services/api';
import { CityScene } from '../../three/CityScene';
import { GoogleMapView } from '../../components/map/GoogleMapView';
import {
  GlassSurface,
  GlassCard,
  GlassButton,
  GlassModal,
  GlassSegmentedControl,
  StatusPill,
  RiskBadge,
} from '../../design-system/components';
import {
  INCIDENT_CATEGORY_LABELS,
  type IncidentStatus,
} from '@civicpulse/shared';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedLocation, openLocationModal } = useLocationStore();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mapViewMode, setMapViewMode] = useState<'2d_google' | '3d_city'>('2d_google');

  // Status update modal & detail inspector
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [actionStatus, setActionStatus] = useState<IncidentStatus>('in_progress');
  const [actionNotes, setActionNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'in_progress' | 'resolved'>('all');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [incRes, metRes] = await Promise.all([
          api.get('/incidents?limit=25'),
          api.get('/incidents/metrics').catch(() => null),
        ]);

        if (incRes.data?.data) {
          setIncidents(incRes.data.data);
        }
        if (metRes?.data?.data) {
          setMetrics(metRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    setUpdating(true);
    try {
      const res = await api.patch(
        `/incidents/${selectedIncident._id || selectedIncident.id}/status`,
        {
          status: actionStatus,
          notes: actionNotes,
        }
      );

      setIncidents((prev) =>
        prev.map((inc) =>
          (inc._id || inc.id) === (selectedIncident._id || selectedIncident.id)
            ? res.data.data
            : inc
        )
      );

      setSelectedIncident(null);
      setActionNotes('');
    } catch (err) {
      alert('Failed to update incident status. Ensure proper permissions.');
    } finally {
      setUpdating(false);
    }
  };

  const role = user?.role || 'citizen';

  const filteredIncidents = incidents.filter((inc) => {
    if (activeFilter === 'critical') return inc.isEmergency || (inc.riskScore && inc.riskScore > 75);
    if (activeFilter === 'in_progress') return inc.status === 'in_progress';
    if (activeFilter === 'resolved') return inc.status === 'resolved';
    return true;
  });

  return (
    <div className="container-fluid px-3 px-lg-5 py-4">
      {/* ── Top Bar: Spatial Command Header ─────────────────── */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span
              className="badge text-uppercase"
              style={{
                background: 'rgba(10, 132, 255, 0.18)',
                color: '#64D2FF',
                border: '1px solid rgba(100, 210, 255, 0.3)',
                letterSpacing: '0.05em',
              }}
            >
              {role.replace(/_/g, ' ')}
            </span>
            <span className="text-secondary small font-monospace">
              MUNICIPAL GRID • METROPOLIS CORE
            </span>
          </div>
          <h2 className="fw-bold mb-0" style={{ color: 'var(--cp-text-primary)' }}>
            Welcome, {user?.profile?.firstName || 'Commander'} {user?.profile?.lastName || ''}
          </h2>

          {/* Active Civic Area Indicator */}
          <div className="d-flex align-items-center gap-2 mt-2">
            <button
              onClick={openLocationModal}
              className="btn btn-sm d-inline-flex align-items-center gap-2 rounded-pill px-3 py-1"
              style={{
                background: 'rgba(10, 132, 255, 0.18)',
                border: '1px solid rgba(100, 210, 255, 0.4)',
                color: '#64D2FF',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              <i className="bi bi-geo-alt-fill" />
              <span>Focused Area: {selectedLocation?.name || selectedLocation?.city || 'Coimbatore'}</span>
              <span className="badge bg-secondary bg-opacity-50 text-light ms-1">Change</span>
            </button>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* 2D Google Map / 3D Digital Twin Viewport Toggle */}
          <GlassSegmentedControl
            value={mapViewMode}
            onChange={(val) => setMapViewMode(val as any)}
            options={[
              { value: '2d_google', label: '2D Google Map', icon: 'map-fill' },
              { value: '3d_city', label: '3D Digital Twin', icon: 'buildings' },
            ]}
          />

          <Link to="/report">
            <GlassButton variant="primary" size="md" icon="plus-circle-fill">
              New Report
            </GlassButton>
          </Link>
          <Link to="/live-map">
            <GlassButton variant="secondary" size="md" icon="box-seam">
              Full Map Center
            </GlassButton>
          </Link>
        </div>
      </div>

      {/* ── CENTER STAGE: SPATIAL DUAL MAP & 3D DIGITAL TWIN ── */}
      <section className="position-relative mb-4">
        <GlassSurface
          tier="ultra"
          depth="3d"
          glow
          style={{
            height: '500px',
            borderRadius: '28px',
            overflow: 'hidden',
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.5), 0 0 40px rgba(10, 132, 255, 0.2)',
          }}
        >
          {mapViewMode === '2d_google' ? (
            <GoogleMapView
              initialLat={selectedLocation?.latitude || 11.0289}
              initialLng={selectedLocation?.longitude || 77.0279}
              initialZoom={14}
              incidents={incidents.map((i) => ({
                id: i._id || i.id,
                latitude: i.location?.coordinates?.[1] || 11.0289,
                longitude: i.location?.coordinates?.[0] || 77.0279,
                title: i.title,
                category: i.category,
                isEmergency: i.isEmergency,
              }))}
              onLocationSelect={(loc) => {
                const found = incidents.find((i) => i.title.toLowerCase().includes(loc.city.toLowerCase()));
                if (found) setSelectedIncident(found);
              }}
            />
          ) : (
            <CityScene
              onSelectIncident={(id) => {
                const found = incidents.find((i) => i.id === id || i._id === id);
                if (found) setSelectedIncident(found);
              }}
            />
          )}

          {/* Floating Top Left Telemetry HUD */}
          <div
            className="position-absolute top-0 start-0 m-3 p-3 glass-surface"
            style={{
              borderRadius: '16px',
              maxWidth: '320px',
              background: 'rgba(10, 14, 23, 0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(100, 210, 255, 0.3)',
              zIndex: 10,
            }}
          >
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
              <span className="small fw-bold">
                {mapViewMode === '2d_google' ? 'GOOGLE MAPS GEOSPATIAL RADAR' : '3D SPATIAL COMMAND RADAR'}
              </span>
            </div>
            <p className="small text-secondary mb-2" style={{ fontSize: '0.78rem' }}>
              Focused Area: <strong>{selectedLocation?.city || 'Coimbatore'}</strong>. Real-time synchronisation across municipal field sensors and dispatches.
            </p>
            <div className="d-flex gap-2">
              <span className="badge bg-primary bg-opacity-25 text-primary small">
                {incidents.length} Active Nodes
              </span>
              <span className="badge bg-warning bg-opacity-25 text-warning small">
                High Risk Zones: 3
              </span>
            </div>
          </div>

          {/* Floating Bottom Center Filter Toolbar */}
          <div
            className="position-absolute bottom-0 start-50 translate-middle-x mb-3"
            style={{ zIndex: 10 }}
          >
            <GlassSegmentedControl
              value={activeFilter}
              onChange={(val) => setActiveFilter(val as any)}
              options={[
                { value: 'all', label: `All (${incidents.length})` },
                { value: 'critical', label: 'Critical' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
              ]}
            />
          </div>
        </GlassSurface>
      </section>

      {/* ── FLOATING INTELLIGENCE PANELS ────────────────────── */}
      <section className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <GlassCard tier="strong" depth="3d" statusDot="primary" className="p-3">
            <span className="small text-secondary d-block mb-1">Total Reported Volume</span>
            <div className="fs-3 fw-bold font-monospace" style={{ color: '#9FC9FF' }}>
              {metrics?.total || incidents.length || 0}
            </div>
            <span className="small text-success fw-semibold" style={{ fontSize: '0.75rem' }}>
              ↑ 12 new this week
            </span>
          </GlassCard>
        </div>
        <div className="col-6 col-lg-3">
          <GlassCard tier="strong" depth="3d" statusDot="warning" className="p-3">
            <span className="small text-secondary d-block mb-1">Active Triage Queue</span>
            <div className="fs-3 fw-bold font-monospace" style={{ color: '#FF9F0A' }}>
              {metrics?.active || 8}
            </div>
            <span className="small text-warning fw-semibold" style={{ fontSize: '0.75rem' }}>
              4 approaching SLA
            </span>
          </GlassCard>
        </div>
        <div className="col-6 col-lg-3">
          <GlassCard tier="strong" depth="3d" statusDot="success" className="p-3">
            <span className="small text-secondary d-block mb-1">Resolution Rate</span>
            <div className="fs-3 fw-bold font-monospace" style={{ color: '#30D158' }}>
              94.2%
            </div>
            <span className="small text-success fw-semibold" style={{ fontSize: '0.75rem' }}>
              Avg resolution: 2.4h
            </span>
          </GlassCard>
        </div>
        <div className="col-6 col-lg-3">
          <GlassCard tier="strong" depth="3d" statusDot="danger" className="p-3">
            <span className="small text-secondary d-block mb-1">Emergency Alerts</span>
            <div className="fs-3 fw-bold font-monospace" style={{ color: '#FF453A' }}>
              {metrics?.emergency || 2}
            </div>
            <span className="small text-danger fw-semibold" style={{ fontSize: '0.75rem' }}>
              Hotline connected
            </span>
          </GlassCard>
        </div>
      </section>

      {/* ── TRANSLUCENT GLASS DATA SHEET ────────────────────── */}
      <section>
        <GlassSurface tier="strong" depth="subtle" className="p-4" style={{ borderRadius: '24px' }}>
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div>
              <h5 className="fw-bold mb-1" style={{ color: 'var(--cp-text-primary)' }}>
                {role === 'citizen' ? 'My Reported Incidents & Community Feed' : 'Live Work Order Triage Queue'}
              </h5>
              <span className="text-secondary small">
                Connected to Postgres, Redis Queue & Autonomous AI Classification Pipeline
              </span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="small text-secondary">
                Showing {filteredIncidents.length} of {incidents.length} incidents
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-5 text-center text-secondary">
              <div className="spinner-border text-primary mb-3" />
              <div>Synchronizing municipal nodes...</div>
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="py-5 text-center text-secondary">
              <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary opacity-50" />
              <h6 className="fw-semibold">No incidents found in current filter</h6>
              <p className="small mb-3">All clear in this operational quadrant.</p>
              <Link to="/report">
                <GlassButton variant="primary" size="sm" icon="megaphone-fill">
                  Submit New Report
                </GlassButton>
              </Link>
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {filteredIncidents.map((inc) => (
                <div
                  key={inc._id || inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className="p-3 rounded-3 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--cp-glass-border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(10, 132, 255, 0.12)';
                    e.currentTarget.style.borderColor = 'rgba(100, 210, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'var(--cp-glass-border)';
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <span className="font-monospace small fw-bold text-primary">
                      {inc.incidentNumber || 'CP-2026-X8K9'}
                    </span>
                    <div>
                      <div className="fw-semibold text-truncate" style={{ maxWidth: '320px' }}>
                        {inc.title}
                      </div>
                      <span className="small text-secondary">
                        {(INCIDENT_CATEGORY_LABELS as Record<string, string>)[inc.category] || inc.category}
                      </span>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    <StatusPill status={(inc.status as IncidentStatus) || 'reported'} size="sm" />
                    <RiskBadge
                      level={inc.riskLevel || (inc.riskScore > 75 ? 'critical' : inc.riskScore > 50 ? 'high' : 'medium')}
                      score={inc.riskScore || 65}
                    />
                    <div className="text-secondary small d-none d-md-block" style={{ fontSize: '0.8rem' }}>
                      {new Date(inc.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <GlassButton variant="secondary" size="sm" icon="eye">
                      Inspect
                    </GlassButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassSurface>
      </section>

      {/* ── INCIDENT ACTION MODAL / INSPECTOR ───────────────── */}
      <GlassModal
        isOpen={Boolean(selectedIncident)}
        onClose={() => setSelectedIncident(null)}
        title={selectedIncident?.title || 'Incident Detail Inspector'}
        subtitle={`ID: ${selectedIncident?.incidentNumber || 'CP-2026'} • Category: ${(INCIDENT_CATEGORY_LABELS as Record<string, string>)[selectedIncident?.category] || selectedIncident?.category}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelectedIncident(null)}
              className="btn btn-sm btn-outline-secondary"
            >
              Cancel
            </button>
            <GlassButton
              variant="primary"
              size="sm"
              loading={updating}
              onClick={handleUpdateStatus}
            >
              Save Dispatch Update
            </GlassButton>
          </>
        }
      >
        {selectedIncident && (
          <form onSubmit={handleUpdateStatus} className="d-flex flex-column gap-3">
            <div className="d-flex gap-2">
              <StatusPill status={selectedIncident.status || 'reported'} size="md" />
              <RiskBadge level={selectedIncident.riskLevel || 'high'} score={selectedIncident.riskScore || 78} />
            </div>

            <p className="small text-secondary mb-0">
              {selectedIncident.description || 'Citizen reported severe infrastructure impairment requiring immediate dispatch.'}
            </p>

            <div className="p-3 rounded-3" style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--cp-glass-border)' }}>
              <span className="small text-secondary fw-semibold d-block mb-1">Location Coordinates:</span>
              <span className="small font-monospace text-primary">
                {selectedIncident.location?.address || 'Central Avenue & 5th Cross Road, Sector 3'}
              </span>
            </div>

            {/* Role-based status transition control */}
            <div>
              <label className="form-label small fw-semibold text-secondary">
                Transition Operational Status:
              </label>
              <select
                className="form-select form-select-sm"
                style={{
                  background: 'var(--cp-glass-bg)',
                  color: 'var(--cp-text-primary)',
                  borderColor: 'var(--cp-glass-border)',
                }}
                value={actionStatus}
                onChange={(e) => setActionStatus(e.target.value as IncidentStatus)}
              >
                <option value="reported">Reported</option>
                <option value="verified">Verified</option>
                <option value="assigned">Assigned to Field Crew</option>
                <option value="in_progress">In Progress</option>
                <option value="pending_review">Pending Verification</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected / Duplicate</option>
              </select>
            </div>

            <div>
              <label className="form-label small fw-semibold text-secondary">
                Field Dispatch / Triage Notes:
              </label>
              <textarea
                className="form-control form-control-sm"
                rows={3}
                style={{
                  background: 'var(--cp-glass-bg)',
                  color: 'var(--cp-text-primary)',
                  borderColor: 'var(--cp-glass-border)',
                }}
                placeholder="Log dispatch actions, contractor details or resolution proof..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
              />
            </div>
          </form>
        )}
      </GlassModal>
    </div>
  );
};

export default DashboardPage;
