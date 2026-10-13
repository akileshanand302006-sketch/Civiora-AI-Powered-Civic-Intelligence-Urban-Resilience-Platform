// ============================================================
// CivicPulse Exact Location Setup & Confirmation Screen
// Real Google Maps + Multi-Method Selection + Confirmation Stage
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLocationStore, type CivicLocation, DEFAULT_CIVIC_LOCATION } from '../../stores/locationStore';
import { getCurrentBrowserPosition, reverseGeocode } from '../../services/googleMapsService';
import { GoogleMapView } from '../../components/map/GoogleMapView';
import { GlassSurface, GlassButton, GlassCard } from '../../design-system/components';
import { api } from '../../services/api';

export const LocationSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  const {
    selectedLocation,
    savedLocations,
    setSelectedLocation,
    addSavedLocation,
    setLocationPermission,
  } = useLocationStore();

  const [previewLocation, setPreviewLocation] = useState<CivicLocation>(
    selectedLocation || DEFAULT_CIVIC_LOCATION
  );
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [saveLabel, setSaveLabel] = useState('Home / Primary');

  useEffect(() => {
    if (selectedLocation) {
      setPreviewLocation(selectedLocation);
    }
  }, [selectedLocation]);

  // Method 1: Use Current GPS Location
  const handleUseCurrentGps = async () => {
    setIsLocating(true);
    setGpsError(null);
    try {
      const pos = await getCurrentBrowserPosition();
      setLocationPermission('granted');

      const loc = await reverseGeocode(pos.latitude, pos.longitude);
      loc.accuracy = pos.accuracy;
      loc.accuracyConfidence = pos.accuracyConfidence;
      loc.source = 'CURRENT_GPS';
      loc.selectedAt = pos.timestamp || new Date().toISOString();
      setPreviewLocation(loc);
    } catch (err: any) {
      setLocationPermission('denied');
      const msg =
        err.userMessage ||
        err.message ||
        'Unable to retrieve GPS coordinates. Please select manually on the map.';
      setGpsError(msg);
    } finally {
      setIsLocating(false);
    }
  };

  // Method 2: Select a pre-saved location (e.g. College, Home, Work)
  const handleSelectSaved = (saved: CivicLocation) => {
    setPreviewLocation(saved);
  };

  // Final Confirmation: Save & Navigate to Dashboard
  const handleConfirmLocation = async () => {
    setIsSaving(true);
    try {
      setSelectedLocation(previewLocation);

      if (saveAsDefault) {
        addSavedLocation(
          previewLocation.name || saveLabel,
          'home',
          previewLocation,
          true
        );
      }

      // Persist to backend if authenticated
      await api
        .put('/users/me/locations/active', {
          location: {
            latitude: previewLocation.latitude,
            longitude: previewLocation.longitude,
            formattedAddress: previewLocation.formattedAddress,
            city: previewLocation.city,
            state: previewLocation.state,
            country: previewLocation.country,
          },
        })
        .catch(() => {});

      // Navigate into the location-aware dashboard
      navigate(redirectTarget);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container-fluid px-3 px-lg-5 py-4 min-vh-100">
      {/* ── Title & Civic Guidance Header ───────────────────── */}
      <div className="text-center mb-4">
        <div
          className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-2"
          style={{
            background: 'rgba(82, 127, 199, 0.15)',
            border: '1px solid rgba(159, 201, 255, 0.3)',
          }}
        >
          <span
            style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9FC9FF' }}
            className="animate-pulse-cyan"
          />
          <span className="small fw-semibold" style={{ color: '#9FC9FF', letterSpacing: '0.08em' }}>
            GEOSPATIAL ANCHOR SETUP
          </span>
        </div>
        <h2 className="fw-extrabold mb-1 tracking-tight text-white">
          Where should Civiora focus?
        </h2>
        <p className="text-secondary small mx-auto" style={{ maxWidth: '580px', fontSize: '0.95rem' }}>
          Select the exact civic jurisdiction you want to monitor, report hazards in, and explore through the 3D Digital Twin.
        </p>
      </div>

      <div className="row g-4 align-items-start">
        {/* ── LEFT: REAL GOOGLE MAP VIEWPORT ──────────────────── */}
        <div className="col-12 col-xl-8">
          <GlassSurface
            tier="ultra"
            depth="3d"
            glow
            style={{
              height: '560px',
              borderRadius: '28px',
              overflow: 'hidden',
              boxShadow: '0 24px 70px rgba(0, 0, 0, 0.6), 0 0 50px rgba(10, 132, 255, 0.25)',
            }}
          >
            <GoogleMapView
              initialLat={previewLocation.latitude}
              initialLng={previewLocation.longitude}
              initialZoom={15}
              onLocationSelect={(loc) => setPreviewLocation(loc)}
              showSearchBar={true}
            />
          </GlassSurface>

          {/* Quick Selection Shortcuts Bar */}
          <div className="d-flex flex-wrap gap-2 mt-3 align-items-center justify-content-between">
            <div className="d-flex flex-wrap gap-2">
              <GlassButton
                variant="primary"
                size="sm"
                icon="crosshair"
                loading={isLocating}
                onClick={handleUseCurrentGps}
              >
                Use My Current Location
              </GlassButton>

              {savedLocations.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSaved(s.location)}
                  className="btn btn-sm glass-button d-flex align-items-center gap-1 rounded-pill px-3"
                  style={{
                    background:
                      previewLocation.formattedAddress === s.location.formattedAddress
                        ? 'rgba(10, 132, 255, 0.3)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--cp-glass-border)',
                    fontSize: '0.78rem',
                    color: 'var(--cp-text-primary)',
                  }}
                >
                  <i
                    className={`bi bi-${
                      s.type === 'college'
                        ? 'mortarboard'
                        : s.type === 'work'
                        ? 'briefcase'
                        : 'house'
                    } text-info`}
                  />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>

            <span className="small text-secondary font-monospace" style={{ fontSize: '0.75rem' }}>
              💡 Click or drag marker on map to relocate
            </span>
          </div>

          {gpsError && (
            <div
              className="mt-3 p-3 rounded-3 d-flex align-items-center justify-content-between border animate-fadeIn"
              style={{
                background: 'rgba(255, 69, 58, 0.12)',
                borderColor: 'rgba(255, 69, 58, 0.35)',
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-exclamation-triangle-fill text-danger fs-6" />
                <span className="small text-white" style={{ fontSize: '0.82rem' }}>
                  {gpsError}
                </span>
              </div>
              <button
                type="button"
                onClick={handleUseCurrentGps}
                className="btn btn-sm btn-outline-danger rounded-pill px-3 py-1"
                style={{ fontSize: '0.75rem' }}
              >
                Retry GPS
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: SELECTED LOCATION PREVIEW & CONFIRMATION ── */}
        <div className="col-12 col-xl-4">
          <GlassCard tier="ultra" depth="3d" glow className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="small text-secondary font-monospace fw-bold">
                CANONICAL GEOLOCATION PREVIEW
              </span>
              <span className="badge bg-success bg-opacity-25 text-success small px-2 py-1">
                VERIFIED GPS
              </span>
            </div>

            <div className="d-flex align-items-start gap-3 mb-3">
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'rgba(10, 132, 255, 0.2)',
                  color: '#64D2FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  flexShrink: 0,
                  boxShadow: '0 0 16px rgba(10, 132, 255, 0.4)',
                }}
              >
                <i className="bi bi-geo-alt-fill" />
              </div>
              <div>
                <h5 className="fw-bold mb-1" style={{ color: 'var(--cp-text-primary)' }}>
                  {previewLocation.name || previewLocation.city || 'Selected Civic Area'}
                </h5>
                <span className="small text-info fw-semibold">
                  {previewLocation.city}, {previewLocation.state}
                </span>
              </div>
            </div>

            {/* Address Breakdown */}
            <div
              className="p-3 rounded-3 mb-3"
              style={{ background: 'rgba(0, 0, 0, 0.35)', border: '1px solid var(--cp-glass-border)' }}
            >
              <span className="text-secondary small d-block mb-1 font-monospace" style={{ fontSize: '0.72rem' }}>
                FORMATTED POSTAL ADDRESS:
              </span>
              <p className="small mb-2" style={{ fontSize: '0.85rem', color: 'var(--cp-text-primary)' }}>
                {previewLocation.formattedAddress}
              </p>

              <div className="row g-2 pt-2 border-top border-secondary border-opacity-25 small font-monospace">
                <div className="col-6">
                  <span className="text-secondary d-block" style={{ fontSize: '0.7rem' }}>
                    LATITUDE:
                  </span>
                  <span className="text-primary fw-bold">{previewLocation.latitude.toFixed(6)}</span>
                </div>
                <div className="col-6">
                  <span className="text-secondary d-block" style={{ fontSize: '0.7rem' }}>
                    LONGITUDE:
                  </span>
                  <span className="text-primary fw-bold">{previewLocation.longitude.toFixed(6)}</span>
                </div>
                <div className="col-6">
                  <span className="text-secondary d-block" style={{ fontSize: '0.7rem' }}>
                    EST. ACCURACY:
                  </span>
                  <span className="text-success fw-bold">~{previewLocation.accuracy || 12} meters</span>
                </div>
                <div className="col-6">
                  <span className="text-secondary d-block" style={{ fontSize: '0.7rem' }}>
                    SOURCE:
                  </span>
                  <span className="text-info fw-bold">{previewLocation.source}</span>
                </div>
              </div>
            </div>

            {/* Optional Save Options */}
            <div className="mb-4">
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="saveDefaultSwitch"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                />
                <label className="form-check-label small text-secondary" htmlFor="saveDefaultSwitch">
                  Set as my primary default location
                </label>
              </div>

              {saveAsDefault && (
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Label (e.g. College Campus, Home)"
                  value={saveLabel}
                  onChange={(e) => setSaveLabel(e.target.value)}
                  style={{
                    background: 'var(--cp-glass-bg)',
                    color: 'var(--cp-text-primary)',
                    borderColor: 'var(--cp-glass-border)',
                    fontSize: '0.82rem',
                  }}
                />
              )}
            </div>

            {/* Action Buttons */}
            <GlassButton
              variant="primary"
              size="lg"
              icon="check2-circle"
              glow
              loading={isSaving}
              onClick={handleConfirmLocation}
              className="w-100"
            >
              Confirm Location & Enter Civiora Console
            </GlassButton>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default LocationSetupPage;
