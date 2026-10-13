// ============================================================
// CivicPulse Floating Glass Location Switcher Modal
// Quick Area Switcher + Accurate GPS Detection + Saved Places
// Precision-Aware Location Confirmation + Tamil Nadu 38 Districts
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocationStore, type CivicLocation } from '../../stores/locationStore';
import { getCurrentBrowserPosition, reverseGeocode } from '../../services/googleMapsService';
import { GlassSurface, GlassButton } from '../../design-system/components';
import { api } from '../../services/api';

export const LocationSwitcherModal: React.FC = () => {
  const {
    selectedLocation,
    savedLocations,
    isLocationModalOpen,
    closeLocationModal,
    setSelectedLocation,
    setDefaultSavedLocation,
  } = useLocationStore();

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [detectedCandidate, setDetectedCandidate] = useState<CivicLocation | null>(null);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [detectionStage, setDetectionStage] = useState<
    'idle' | 'acquiring' | 'resolving' | 'detected' | 'error'
  >('idle');

  if (!isLocationModalOpen) return null;

  const handleSelect = async (loc: CivicLocation) => {
    setSelectedLocation(loc);
    // Persist to backend if authenticated
    await api
      .put('/users/me/locations/active', {
        location: {
          latitude: loc.latitude,
          longitude: loc.longitude,
          formattedAddress: loc.formattedAddress,
          city: loc.city,
          state: loc.state,
          district: loc.district,
          districtId: loc.districtId,
        },
      })
      .catch(() => {});
    closeLocationModal();
  };

  const handleUseCurrentGps = async () => {
    setIsLocating(true);
    setDetectionError(null);
    setDetectedCandidate(null);
    setDetectionStage('acquiring');

    try {
      // 1. Request fresh device geolocation with high-accuracy GNSS
      const pos = await getCurrentBrowserPosition();
      setDetectionStage('resolving');

      // 2. Structured Reverse Geocoding with Tamil Nadu district resolution
      const loc = await reverseGeocode(pos.latitude, pos.longitude);
      loc.accuracy = pos.accuracy;
      loc.accuracyConfidence = pos.accuracyConfidence;
      loc.source = 'CURRENT_GPS';
      loc.selectedAt = pos.timestamp || new Date().toISOString();

      setDetectedCandidate(loc);
      setDetectionStage('detected');
    } catch (err: any) {
      console.warn('[Civiora] GPS acquisition note:', err);
      const message =
        err.userMessage ||
        err.message ||
        'Unable to retrieve GPS coordinates. Please check location permissions or pick on map.';
      setDetectionError(message);
      setDetectionStage('error');
    } finally {
      setIsLocating(false);
    }
  };

  // User confirms the detected live GPS location
  const handleConfirmDetected = async () => {
    if (!detectedCandidate) return;
    await handleSelect(detectedCandidate);
  };

  const handleCancelDetected = () => {
    setDetectedCandidate(null);
    setDetectionError(null);
    setDetectionStage('idle');
  };

  const handleOpenMapSetup = () => {
    closeLocationModal();
    navigate('/setup-location');
  };

  const filteredSaved = savedLocations.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.location.formattedAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 10, 16, 0.75)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.75rem',
        overflowY: 'auto',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={closeLocationModal}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: 'min(90vh, 720px)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <GlassSurface
          tier="ultra"
          depth="3d"
          glow
          style={{
            borderRadius: '24px',
            overflow: 'hidden',
            maxHeight: 'min(90vh, 720px)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.7), 0 0 50px rgba(10, 132, 255, 0.25)',
          }}
        >
          {/* Header */}
          <div
            className="d-flex justify-content-between align-items-center p-3 px-4 border-bottom flex-shrink-0"
            style={{ borderColor: 'var(--cp-glass-border)' }}
          >
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-geo-alt-fill text-primary fs-5" />
              <h6 className="fw-bold mb-0">Switch Active Civic Area</h6>
            </div>
            <button
              onClick={closeLocationModal}
              className="btn btn-sm btn-close btn-close-white"
            />
          </div>

          <div className="p-3 p-sm-4" style={{ overflowY: 'auto' }}>
            {/* Active Area Banner */}
            {selectedLocation && (
              <div
                className="p-3 rounded-3 mb-3 d-flex align-items-center justify-content-between"
                style={{
                  background: 'rgba(10, 132, 255, 0.15)',
                  border: '1px solid rgba(100, 210, 255, 0.35)',
                }}
              >
                <div>
                  <span className="small text-secondary font-monospace d-block" style={{ fontSize: '0.72rem' }}>
                    CURRENTLY FOCUSED CIVIC AREA:
                  </span>
                  <div className="fw-bold" style={{ color: 'var(--cp-text-primary)' }}>
                    {selectedLocation.name || selectedLocation.city}
                  </div>
                  <span className="small text-secondary" style={{ fontSize: '0.78rem' }}>
                    {selectedLocation.city}, {selectedLocation.state}
                  </span>
                </div>
                <span className="badge bg-primary rounded-pill px-2 py-1 small">ACTIVE</span>
              </div>
            )}

            {/* Search filter input */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Filter saved places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control form-control-sm"
                style={{
                  background: 'var(--cp-glass-bg)',
                  color: 'var(--cp-text-primary)',
                  borderColor: 'var(--cp-glass-border)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                }}
              />
            </div>

            {/* Quick GPS Action Button */}
            <button
              onClick={handleUseCurrentGps}
              disabled={isLocating}
              className="btn btn-sm w-100 p-2 mb-2 rounded-3 d-flex align-items-center justify-content-center gap-2"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--cp-glass-border)',
                color: '#64D2FF',
                transition: 'all 0.2s ease',
              }}
            >
              {isLocating ? (
                <div className="spinner-border spinner-border-sm text-info" />
              ) : (
                <i className="bi bi-crosshair fs-6" />
              )}
              <span className="fw-semibold">
                {detectionStage === 'acquiring'
                  ? 'Acquiring GPS fix (satellite GNSS)...'
                  : detectionStage === 'resolving'
                  ? 'Resolving municipal district...'
                  : 'Detect My Current GPS Location'}
              </span>
            </button>

            {/* ── ACCURACY & CONFIRMATION PREVIEW CARD ───────────── */}
            {detectedCandidate && (
              <div
                className="p-3 rounded-3 mb-3 border animate-fadeIn"
                style={{
                  background: 'rgba(16, 33, 58, 0.75)',
                  borderColor:
                    detectedCandidate.accuracyConfidence === 'high'
                      ? 'rgba(48, 209, 88, 0.4)'
                      : 'rgba(159, 201, 255, 0.35)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                }}
              >
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span
                    className="small fw-semibold text-uppercase font-monospace"
                    style={{ fontSize: '0.7rem', color: '#9FC9FF' }}
                  >
                    <i className="bi bi-broadcast me-1" />
                    Detected Live Position
                  </span>

                  {/* Accuracy Badge */}
                  <span
                    className="badge rounded-pill"
                    style={{
                      fontSize: '0.68rem',
                      background:
                        detectedCandidate.accuracyConfidence === 'high'
                          ? 'rgba(48, 209, 88, 0.18)'
                          : detectedCandidate.accuracyConfidence === 'approximate'
                          ? 'rgba(255, 159, 10, 0.18)'
                          : 'rgba(255, 69, 58, 0.18)',
                      color:
                        detectedCandidate.accuracyConfidence === 'high'
                          ? '#30D158'
                          : detectedCandidate.accuracyConfidence === 'approximate'
                          ? '#FF9F0A'
                          : '#FF453A',
                      border: `1px solid ${
                        detectedCandidate.accuracyConfidence === 'high'
                          ? 'rgba(48, 209, 88, 0.35)'
                          : 'rgba(255, 159, 10, 0.35)'
                      }`,
                    }}
                  >
                    ±{detectedCandidate.accuracy || 10}m •{' '}
                    {detectedCandidate.accuracyConfidence === 'high'
                      ? 'High Confidence (GPS)'
                      : detectedCandidate.accuracyConfidence === 'approximate'
                      ? 'Approximate (Wi-Fi)'
                      : 'Low Confidence'}
                  </span>
                </div>

                <div className="fw-bold text-white mb-1" style={{ fontSize: '0.92rem' }}>
                  {detectedCandidate.name || detectedCandidate.city}
                </div>

                <p
                  className="small text-secondary mb-2 text-truncate"
                  style={{ fontSize: '0.78rem' }}
                  title={detectedCandidate.formattedAddress}
                >
                  {detectedCandidate.formattedAddress}
                </p>

                <div className="d-flex align-items-center gap-2 mb-3">
                  <span
                    className="badge rounded-pill"
                    style={{
                      fontSize: '0.68rem',
                      background: 'rgba(82, 127, 199, 0.25)',
                      color: '#9FC9FF',
                      border: '1px solid rgba(159, 201, 255, 0.3)',
                    }}
                  >
                    {detectedCandidate.district || 'Tamil Nadu'}
                  </span>
                  <span className="text-secondary small" style={{ fontSize: '0.72rem' }}>
                    Lat: {detectedCandidate.latitude.toFixed(4)}, Lng:{' '}
                    {detectedCandidate.longitude.toFixed(4)}
                  </span>
                </div>

                {/* Confirmation Actions */}
                <div className="d-flex align-items-center gap-2">
                  <button
                    onClick={handleConfirmDetected}
                    className="btn btn-sm btn-primary rounded-pill px-3 py-1 flex-grow-1 fw-semibold d-flex align-items-center justify-content-center gap-1.5"
                    style={{
                      fontSize: '0.82rem',
                      background: 'radial-gradient(100% 100% at 50% 0%, #6392DF 0%, #375994 100%)',
                      border: '1px solid rgba(159, 201, 255, 0.45)',
                    }}
                  >
                    <i className="bi bi-check-circle-fill" />
                    Confirm & Set as Active
                  </button>
                  <button
                    onClick={handleCancelDetected}
                    className="btn btn-sm btn-outline-secondary rounded-pill px-2.5 py-1"
                    style={{ fontSize: '0.78rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Error Message & Retry */}
            {detectionError && (
              <div
                className="p-3 rounded-3 mb-3 d-flex align-items-start gap-2 border"
                style={{
                  background: 'rgba(255, 69, 58, 0.1)',
                  borderColor: 'rgba(255, 69, 58, 0.3)',
                }}
              >
                <i className="bi bi-exclamation-triangle-fill text-danger fs-6 mt-0.5" />
                <div className="flex-grow-1">
                  <div className="fw-semibold text-danger small mb-1">
                    Location Detection Error
                  </div>
                  <p className="small text-secondary mb-2" style={{ fontSize: '0.78rem' }}>
                    {detectionError}
                  </p>
                  <button
                    onClick={handleUseCurrentGps}
                    className="btn btn-sm btn-outline-danger rounded-pill px-2 py-0.5"
                    style={{ fontSize: '0.72rem' }}
                  >
                    <i className="bi bi-arrow-clockwise me-1" />
                    Retry Detection
                  </button>
                </div>
              </div>
            )}

            {/* Saved Locations List */}
            <span className="small text-secondary font-monospace d-block mb-2" style={{ fontSize: '0.75rem' }}>
              SAVED CIVIC PLACES:
            </span>

            <div className="d-flex flex-column gap-2 mb-4" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {filteredSaved.length === 0 ? (
                <div className="py-3 text-center text-secondary small">No matching saved places.</div>
              ) : (
                filteredSaved.map((s) => {
                  const isCurrent = selectedLocation?.formattedAddress === s.location.formattedAddress;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelect(s.location)}
                      className="p-2 px-3 rounded-3 d-flex align-items-center justify-content-between"
                      style={{
                        cursor: 'pointer',
                        background: isCurrent ? 'rgba(10, 132, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        border: isCurrent
                          ? '1px solid rgba(100, 210, 255, 0.4)'
                          : '1px solid var(--cp-glass-border)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <i
                          className={`bi bi-${
                            s.type === 'college'
                              ? 'mortarboard-fill'
                              : s.type === 'work'
                              ? 'briefcase-fill'
                              : 'house-fill'
                          } text-info fs-6`}
                        />
                        <div>
                          <div className="fw-bold small lh-1">{s.name}</div>
                          <span className="text-secondary" style={{ fontSize: '0.72rem' }}>
                            {s.location.city} • Lat: {s.location.latitude.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      {isCurrent ? (
                        <i className="bi bi-check-circle-fill text-success" />
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDefaultSavedLocation(s.id);
                          }}
                          className="btn btn-sm btn-link text-secondary p-0"
                          style={{ textDecoration: 'none', fontSize: '0.72rem' }}
                        >
                          Make Default
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Launch Full Google Map Setup Button */}
            <GlassButton
              variant="primary"
              size="md"
              icon="map-fill"
              onClick={handleOpenMapSetup}
              className="w-100"
            >
              Select New Location on Google Map
            </GlassButton>
          </div>
        </GlassSurface>
      </div>
    </div>
  );
};

export default LocationSwitcherModal;
