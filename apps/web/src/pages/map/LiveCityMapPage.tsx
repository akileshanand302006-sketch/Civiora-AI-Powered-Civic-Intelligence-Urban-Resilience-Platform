// ============================================================
// CivicPulse 3D Live Digital Twin & City Intelligence Center
// Fullscreen Spatial Canvas + Multi-Mode Toggle (2D / 3D / Digital Twin)
// ============================================================

import React, { useState, useEffect } from 'react';
import { CityScene } from '../../three/CityScene';
import { UrbanRiskGlobe } from '../../three/UrbanRiskGlobe';
import { GoogleMapView } from '../../components/map/GoogleMapView';
import { api } from '../../services/api';
import { subscribeToLiveCityMap } from '../../services/socketService';
import { useAuthStore } from '../../stores/authStore';
import { useLocationStore } from '../../stores/locationStore';
import {
  GlassSurface,
  GlassButton,
  GlassSegmentedControl,
  StatusPill,
  RiskBadge,
} from '../../design-system/components';
import {
  INCIDENT_CATEGORY_LABELS,
  ALL_INCIDENT_CATEGORIES,
  type IncidentStatus,
} from '@civicpulse/shared';

type ViewMode = '2d_google' | '3d_city' | 'digital_twin' | 'urban_globe';

export const LiveCityMapPage: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedLocation } = useLocationStore();
  const orgId = user?.organizationId || 'demo-org';

  const [viewMode, setViewMode] = useState<ViewMode>('2d_google');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterEmergencyOnly, setFilterEmergencyOnly] = useState<boolean>(false);

  // Digital Twin Infrastructure telemetry state
  const [selectedInfra] = useState<any | null>({
    assetId: 'INFRA-RD-402',
    name: 'Sector 4 Arterial Highway (Westbound)',
    type: 'Asphalt Roadway',
    condition: 'Moderate Degradation (68/100)',
    historicalRepairs: 4,
    lastInspected: '2026-08-14',
    predictedFailureRisk: 'Elevated - Pothole emergence within 14 days',
    sensorReadings: {
      vibrationStrain: '0.42g (Normal)',
      subsurfaceMoisture: '78% (High saturation)',
      trafficFlow: '1,420 vehicles/hour',
    },
  });

  useEffect(() => {
    async function loadIncidents() {
      try {
        const res = await api.get('/incidents?limit=30');
        if (res.data?.data) {
          setIncidents(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedIncident(res.data.data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load incidents', err);
      }
    }

    loadIncidents();

    const unsubscribe = subscribeToLiveCityMap(orgId, (eventData) => {
      setIncidents((prev) => [eventData, ...prev.filter((i) => i._id !== eventData._id)]);
    });

    return () => unsubscribe();
  }, [orgId]);

  const filteredIncidents = incidents.filter((inc) => {
    if (filterEmergencyOnly && !inc.isEmergency) return false;
    if (filterCategory !== 'all' && inc.category !== filterCategory) return false;
    return true;
  });

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: 'calc(100vh - 76px)',
        overflow: 'hidden',
        background: '#070A10',
      }}
    >
      {/* ── MAIN SPATIAL CANVAS STAGE ───────────────────────── */}
      <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
        {viewMode === '2d_google' && (
          <GoogleMapView
            initialLat={selectedLocation?.latitude || 11.0289}
            initialLng={selectedLocation?.longitude || 77.0279}
            initialZoom={14}
            incidents={filteredIncidents.map((i) => ({
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
        )}
        {viewMode === '3d_city' && (
          <CityScene
            onSelectIncident={(id) => {
              const found = incidents.find((i) => i.id === id || i._id === id);
              if (found) setSelectedIncident(found);
            }}
          />
        )}
        {viewMode === 'digital_twin' && (
          <CityScene
            role="emergency_operator"
            onSelectIncident={(id) => {
              const found = incidents.find((i) => i.id === id || i._id === id);
              if (found) setSelectedIncident(found);
            }}
          />
        )}
        {viewMode === 'urban_globe' && <UrbanRiskGlobe />}
      </div>

      {/* ── FLOATING TOP HUD: MODE SWITCHER & REAL-TIME FILTERS ─ */}
      <div
        className="position-absolute top-0 start-0 m-3 d-flex flex-wrap align-items-center gap-2"
        style={{ zIndex: 100 }}
      >
        <GlassSurface
          tier="floating"
          depth="3d"
          className="py-2 px-3 d-flex align-items-center gap-3"
          style={{ borderRadius: '18px' }}
        >
          {/* Mode Switcher */}
          <GlassSegmentedControl
            value={viewMode}
            onChange={(val) => setViewMode(val as any)}
            options={[
              { value: '2d_google', label: '2D Google Map', icon: 'map-fill' },
              { value: '3d_city', label: '3D City', icon: 'buildings' },
              { value: 'digital_twin', label: 'Digital Twin', icon: 'motherboard' },
              { value: 'urban_globe', label: 'Risk Globe', icon: 'globe' },
            ]}
          />

          <span className="text-secondary small">|</span>

          {/* Category Dropdown */}
          <select
            className="form-select form-select-sm"
            style={{
              width: 'auto',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--cp-text-primary)',
              borderColor: 'var(--cp-glass-border)',
              fontSize: '0.78rem',
            }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Incident Classes</option>
            {ALL_INCIDENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {(INCIDENT_CATEGORY_LABELS as Record<string, string>)[c] || c}
              </option>
            ))}
          </select>

          {/* Emergency Radar Strobe */}
          <button
            onClick={() => setFilterEmergencyOnly(!filterEmergencyOnly)}
            className={`btn btn-sm rounded-pill px-3 ${
              filterEmergencyOnly ? 'btn-danger text-white' : 'btn-outline-danger'
            }`}
            style={{ fontSize: '0.78rem' }}
          >
            <i className="bi bi-broadcast me-1" />
            Critical Emergencies
          </button>
        </GlassSurface>
      </div>

      {/* ── FLOATING RIGHT INSPECTOR DRAWER ─────────────────── */}
      <div
        className="position-absolute top-0 end-0 m-3 d-flex flex-column gap-3"
        style={{
          width: '380px',
          maxHeight: 'calc(100% - 2rem)',
          zIndex: 100,
        }}
      >
        {/* Selected Incident Telemetry Panel */}
        {selectedIncident && (
          <GlassSurface
            tier="ultra"
            depth="3d"
            glow
            className="p-3"
            style={{ borderRadius: '20px', maxHeight: '340px', overflowY: 'auto' }}
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <span className="font-monospace small text-primary fw-bold">
                  {selectedIncident.incidentNumber || 'CP-2026-X8K9'}
                </span>
                <h6 className="fw-bold mb-0 text-truncate" style={{ maxWidth: '240px' }}>
                  {selectedIncident.title}
                </h6>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="btn btn-sm btn-close btn-close-white"
              />
            </div>

            <div className="d-flex gap-2 my-2">
              <StatusPill status={(selectedIncident.status as IncidentStatus) || 'reported'} size="sm" />
              <RiskBadge
                level={selectedIncident.riskLevel || 'high'}
                score={selectedIncident.riskScore || 82}
              />
            </div>

            <p className="small text-secondary mb-2" style={{ fontSize: '0.8rem' }}>
              {selectedIncident.description || 'Verified infrastructure hazard with elevated SLA urgency.'}
            </p>

            <div
              className="p-2 rounded mb-2 small"
              style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--cp-glass-border)' }}
            >
              <span className="text-secondary d-block font-monospace" style={{ fontSize: '0.72rem' }}>
                GPS: {selectedIncident.location?.address || 'Central Avenue & 5th Cross'}
              </span>
            </div>

            <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-25 small">
              <span className="text-secondary">Assigned Crew:</span>
              <span className="fw-bold text-info">Water Works Team #4</span>
            </div>
          </GlassSurface>
        )}

        {/* Digital Twin Infrastructure Asset Inspector */}
        {viewMode === 'digital_twin' && selectedInfra && (
          <GlassSurface
            tier="ultra"
            depth="3d"
            glow
            className="p-3"
            style={{ borderRadius: '20px' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-secondary font-monospace">DIGITAL TWIN ASSET</span>
              <span className="badge bg-warning bg-opacity-25 text-warning small">
                {selectedInfra.assetId}
              </span>
            </div>
            <h6 className="fw-bold mb-1">{selectedInfra.name}</h6>
            <div className="small text-info mb-2">{selectedInfra.condition}</div>

            <div className="small text-secondary mb-3" style={{ fontSize: '0.78rem' }}>
              <strong>AI Failure Forecast:</strong> {selectedInfra.predictedFailureRisk}
            </div>

            <div
              className="p-2 rounded small mb-2"
              style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--cp-glass-border)' }}
            >
              <div className="d-flex justify-content-between mb-1">
                <span className="text-secondary">Vibration Strain:</span>
                <span className="font-monospace text-primary">{selectedInfra.sensorReadings.vibrationStrain}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-secondary">Subsurface Moisture:</span>
                <span className="font-monospace text-warning">{selectedInfra.sensorReadings.subsurfaceMoisture}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-secondary">Traffic Flow:</span>
                <span className="font-monospace text-success">{selectedInfra.sensorReadings.trafficFlow}</span>
              </div>
            </div>

            <GlassButton variant="primary" size="sm" className="w-100">
              Schedule Preventative Dispatch
            </GlassButton>
          </GlassSurface>
        )}
      </div>

      {/* ── FLOATING BOTTOM-LEFT TELEMETRY STATUS ───────────── */}
      <div
        className="position-absolute bottom-0 start-0 m-3"
        style={{ zIndex: 100 }}
      >
        <GlassSurface
          tier="floating"
          depth="subtle"
          className="py-2 px-3 d-flex align-items-center gap-3"
          style={{ borderRadius: '16px' }}
        >
          <div className="d-flex align-items-center gap-2">
            <span
              style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#30D158' }}
              className="animate-pulse-glow"
            />
            <span className="small fw-bold font-monospace">GEO-TWIN SYNCED</span>
          </div>
          <span className="text-secondary small">|</span>
          <span className="small text-secondary">
            Telemetry Rate: <strong className="text-primary">60 Hz</strong>
          </span>
          <span className="text-secondary small">|</span>
          <span className="small text-secondary">
            Loaded Nodes: <strong className="text-info">{filteredIncidents.length}</strong>
          </span>
        </GlassSurface>
      </div>
    </div>
  );
};

export default LiveCityMapPage;
