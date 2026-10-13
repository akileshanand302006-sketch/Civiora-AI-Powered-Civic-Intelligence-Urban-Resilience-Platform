// ============================================================
// Civiora 3D Live Digital Twin & City Intelligence Center
// Fullscreen Spatial Canvas + Multi-Mode Toggle (2D Google / 3D / Digital Twin)
// Statewide Tamil Nadu 38-District Navigation & Viewport-Driven Refresh
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { CityScene } from '../../three/CityScene';
import { UrbanRiskGlobe } from '../../three/UrbanRiskGlobe';
import { GoogleMapView, type ViewportBounds } from '../../components/map/GoogleMapView';
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
  TAMIL_NADU_DISTRICTS,
  type IncidentStatus,
} from '@civicpulse/shared';

type ViewMode = '2d_google' | '3d_city' | 'digital_twin' | 'urban_globe';

export const LiveCityMapPage: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedLocation, selectedDistrictId, setSelectedDistrictId } = useLocationStore();
  const orgId = user?.organizationId || 'demo-org';

  const [viewMode, setViewMode] = useState<ViewMode>('2d_google');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterEmergencyOnly, setFilterEmergencyOnly] = useState<boolean>(false);
  const [activeDistrict, setActiveDistrict] = useState<string>(selectedDistrictId || 'all');
  const [currentBounds, setCurrentBounds] = useState<ViewportBounds | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

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

  // Query incidents bounded by viewport or selected district
  const loadIncidents = useCallback(
    async (bounds?: ViewportBounds | null, districtId?: string) => {
      try {
        setIsRefreshing(true);
        let queryParams = '?limit=80';

        if (bounds) {
          queryParams += `&bounds=${bounds.sw[0]},${bounds.sw[1]},${bounds.ne[0]},${bounds.ne[1]}`;
        } else if (districtId && districtId !== 'all') {
          queryParams += `&districtId=${districtId}`;
        }

        const res = await api.get(`/incidents${queryParams}`);
        if (res.data?.data) {
          setIncidents(res.data.data);
          if (res.data.data.length > 0 && !selectedIncident) {
            setSelectedIncident(res.data.data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load live incidents', err);
      } finally {
        setIsRefreshing(false);
      }
    },
    [selectedIncident]
  );

  // Initial load and periodic non-intrusive 15s refresh
  useEffect(() => {
    loadIncidents(currentBounds, activeDistrict);

    const interval = setInterval(() => {
      loadIncidents(currentBounds, activeDistrict);
    }, 15000);

    const unsubscribe = subscribeToLiveCityMap(orgId, (eventData) => {
      setIncidents((prev) => [eventData, ...prev.filter((i) => i._id !== eventData._id)]);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [orgId, activeDistrict, loadIncidents]);

  // Handle map camera bounds change
  const handleBoundsChange = useCallback(
    (bounds: ViewportBounds) => {
      setCurrentBounds(bounds);
      loadIncidents(bounds, activeDistrict);
    },
    [activeDistrict, loadIncidents]
  );

  // Handle district switch
  const handleDistrictChange = (dId: string) => {
    setActiveDistrict(dId);
    setSelectedDistrictId(dId);
    loadIncidents(null, dId);
  };

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
        background: '#0B1321',
      }}
    >
      {/* ── MAIN SPATIAL CANVAS STAGE ───────────────────────── */}
      <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
        {viewMode === '2d_google' && (
          <GoogleMapView
            initialLat={selectedLocation?.latitude || 11.0289}
            initialLng={selectedLocation?.longitude || 77.0279}
            initialZoom={13}
            selectedDistrictId={activeDistrict}
            onBoundsChange={handleBoundsChange}
            incidents={filteredIncidents.map((i) => ({
              id: i._id || i.id,
              latitude: i.location?.coordinates?.[1] || 11.0289,
              longitude: i.location?.coordinates?.[0] || 77.0279,
              title: i.title,
              category: i.category,
              isEmergency: i.isEmergency,
              status: i.status,
            }))}
            onIncidentSelect={(id) => {
              const found = incidents.find((i) => (i._id || i.id) === id);
              if (found) setSelectedIncident(found);
            }}
            onLocationSelect={(loc) => {
              if (loc.districtId && loc.districtId !== activeDistrict) {
                setActiveDistrict(loc.districtId);
              }
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

      {/* ── FLOATING TOP HUD: MODE SWITCHER & FILTERS ────────── */}
      <div
        className="position-absolute top-0 start-0 m-2 m-md-3 d-flex flex-wrap align-items-center gap-2"
        style={{ zIndex: 100, maxWidth: 'calc(100vw - 16px)' }}
      >
        <GlassSurface
          tier="floating"
          depth="3d"
          className="py-1 py-sm-2 px-2 px-sm-3 d-flex flex-wrap align-items-center gap-2 gap-sm-3"
          style={{ borderRadius: '18px', maxWidth: '100%' }}
        >
          {/* Mode Switcher */}
          <GlassSegmentedControl
            value={viewMode}
            onChange={(val) => setViewMode(val as any)}
            options={[
              { value: '2d_google', label: '2D Map', icon: 'map-fill' },
              { value: '3d_city', label: '3D City', icon: 'buildings' },
              { value: 'digital_twin', label: 'Twin', icon: 'motherboard' },
              { value: 'urban_globe', label: 'Globe', icon: 'globe' },
            ]}
          />

          <span className="text-secondary small d-none d-sm-inline">|</span>

          {/* Category Dropdown */}
          <select
            className="form-select form-select-sm"
            style={{
              width: 'auto',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--cp-text-primary, #F8FAFC)',
              borderColor: 'var(--cp-glass-border)',
              fontSize: '0.78rem',
            }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all" style={{ background: '#0F172A' }}>All Incident Classes</option>
            {ALL_INCIDENT_CATEGORIES.map((c) => (
              <option key={c} value={c} style={{ background: '#0F172A' }}>
                {(INCIDENT_CATEGORY_LABELS as Record<string, string>)[c] || c}
              </option>
            ))}
          </select>

          {/* Emergency Radar Strobe */}
          <button
            onClick={() => setFilterEmergencyOnly(!filterEmergencyOnly)}
            className={`btn btn-sm rounded-pill px-2 px-sm-3 ${
              filterEmergencyOnly ? 'btn-danger text-white' : 'btn-outline-danger'
            }`}
            style={{ fontSize: '0.78rem' }}
          >
            <i className="bi bi-broadcast me-1" />
            <span className="d-none d-sm-inline">Critical </span>Emergencies
          </button>
        </GlassSurface>
      </div>

      {/* ── FLOATING TAMIL NADU 38-DISTRICT QUICK SELECTOR CHIP ─ */}
      <div
        className="position-absolute top-0 end-0 m-3 me-5 d-none d-lg-block"
        style={{ zIndex: 90 }}
      >
        <GlassSurface
          tier="floating"
          depth="subtle"
          className="p-1 px-3 d-flex align-items-center gap-2"
          style={{ borderRadius: '14px', maxWidth: '320px' }}
        >
          <i className="bi bi-geo-alt-fill text-info" />
          <div className="d-flex flex-column" style={{ lineHeight: 1.1 }}>
            <span className="small text-secondary" style={{ fontSize: '0.68rem' }}>
              TAMIL NADU JURISDICTION
            </span>
            <select
              value={activeDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="form-select form-select-sm border-0 bg-transparent text-white fw-bold p-0"
              style={{ fontSize: '0.82rem', cursor: 'pointer', outline: 'none', boxShadow: 'none' }}
            >
              <option value="all" style={{ background: '#0F172A', color: '#64D2FF' }}>
                🌐 All 38 Districts (Statewide)
              </option>
              {TAMIL_NADU_DISTRICTS.map((d) => (
                <option key={d.id} value={d.id} style={{ background: '#0F172A', color: '#F8FAFC' }}>
                  {d.name} ({d.headquarters})
                </option>
              ))}
            </select>
          </div>
          {isRefreshing && (
            <div className="spinner-border spinner-border-sm text-info ms-2" style={{ width: '12px', height: '12px' }} />
          )}
        </GlassSurface>
      </div>

      {/* ── FLOATING INSPECTOR DRAWER (Responsive Sheet on Mobile) ── */}
      {(selectedIncident || (viewMode === 'digital_twin' && selectedInfra)) && (
        <div
          className="position-absolute end-0 m-2 m-md-3 d-flex flex-column gap-2"
          style={{
            zIndex: 100,
            maxWidth: 'calc(100vw - 16px)',
            width: window.innerWidth < 992 ? 'calc(100vw - 16px)' : '380px',
            bottom: window.innerWidth < 992 ? '68px' : 'auto',
            top: window.innerWidth < 992 ? 'auto' : '70px',
            maxHeight: window.innerWidth < 992 ? '42vh' : 'calc(100% - 90px)',
            overflowY: 'auto',
          }}
        >
          {/* Selected Incident Telemetry Panel */}
          {selectedIncident && (
            <GlassSurface
              tier="ultra"
              depth="3d"
              glow
              className="p-3"
              style={{ borderRadius: '20px', overflowY: 'auto' }}
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
                  title="Close Inspector"
                />
              </div>

              <div className="d-flex gap-2 my-2">
                <StatusPill status={(selectedIncident.status as IncidentStatus) || 'reported'} size="sm" />
                <RiskBadge
                  level={selectedIncident.risk?.level || selectedIncident.riskLevel || 'high'}
                  score={selectedIncident.risk?.score || selectedIncident.riskScore || 78}
                />
              </div>

              <p className="small text-secondary mb-2" style={{ fontSize: '0.8rem' }}>
                {selectedIncident.description || 'Verified infrastructure hazard with elevated SLA urgency.'}
              </p>

              <div
                className="p-2 rounded mb-2 small"
                style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid var(--cp-glass-border)' }}
              >
                <span className="text-secondary d-block font-monospace" style={{ fontSize: '0.72rem' }}>
                  LOCATION: {selectedIncident.location?.address || 'Tamil Nadu Sector'}
                </span>
                <span className="text-info d-block font-monospace" style={{ fontSize: '0.68rem' }}>
                  COORDS: {selectedIncident.location?.coordinates?.[1]?.toFixed(5)},{' '}
                  {selectedIncident.location?.coordinates?.[0]?.toFixed(5)}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-25 small">
                <span className="text-secondary">Assigned Crew:</span>
                <span className="fw-bold text-info">
                  {selectedIncident.assignedTo?.profile?.firstName
                    ? `${selectedIncident.assignedTo.profile.firstName} (${selectedIncident.assignedTo.role})`
                    : 'Civic Rapid Response Crew'}
                </span>
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
      )}

      {/* ── FLOATING BOTTOM TELEMETRY STATUS (Visible on >= md screens) ─ */}
      <div
        className="position-absolute bottom-0 start-0 m-3 d-none d-md-block"
        style={{ zIndex: 90 }}
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
            <span className="small fw-bold font-monospace">LIVE TAMIL NADU SYNC</span>
          </div>
          <span className="text-secondary small">|</span>
          <span className="small text-secondary">
            Active Incidents: <strong className="text-info">{filteredIncidents.length}</strong>
          </span>
          <span className="text-secondary small">|</span>
          <span className="small text-secondary">
            Coverage: <strong className="text-primary">All 38 Districts</strong>
          </span>
        </GlassSurface>
      </div>
    </div>
  );
};

export default LiveCityMapPage;
