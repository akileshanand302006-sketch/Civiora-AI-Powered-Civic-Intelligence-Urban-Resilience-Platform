// ============================================================
// CivicPulse Floating Glass Location Switcher Modal
// Quick Area Switcher + Saved Places + Map Setup Launcher
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocationStore, type CivicLocation } from '../../stores/locationStore';
import { getCurrentBrowserPosition, reverseGeocode } from '../../services/googleMapsService';
import { GlassSurface, GlassButton } from '../../design-system/components';

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

  if (!isLocationModalOpen) return null;

  const handleSelect = (loc: CivicLocation) => {
    setSelectedLocation(loc);
    closeLocationModal();
  };

  const handleUseCurrentGps = async () => {
    setIsLocating(true);
    try {
      const pos = await getCurrentBrowserPosition();
      const loc = await reverseGeocode(pos.latitude, pos.longitude);
      loc.accuracy = pos.accuracy;
      loc.source = 'CURRENT_GPS';
      setSelectedLocation(loc);
      closeLocationModal();
    } catch (err: any) {
      alert(err.message || 'GPS location unavailable. Please select on map.');
    } finally {
      setIsLocating(false);
    }
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
        backgroundColor: 'rgba(7, 10, 16, 0.72)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={closeLocationModal}
    >
      <div
        style={{ width: '100%', maxWidth: '520px', margin: '0 1rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <GlassSurface
          tier="ultra"
          depth="3d"
          glow
          style={{
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.7), 0 0 50px rgba(10, 132, 255, 0.25)',
          }}
        >
          {/* Header */}
          <div
            className="d-flex justify-content-between align-items-center p-3 px-4 border-bottom"
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

          <div className="p-4">
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

            {/* Quick GPS Action */}
            <button
              onClick={handleUseCurrentGps}
              disabled={isLocating}
              className="btn btn-sm w-100 p-2 mb-3 rounded-3 d-flex align-items-center justify-content-center gap-2"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--cp-glass-border)',
                color: '#64D2FF',
              }}
            >
              {isLocating ? (
                <div className="spinner-border spinner-border-sm text-info" />
              ) : (
                <i className="bi bi-crosshair fs-6" />
              )}
              <span className="fw-semibold">Detect My Current GPS Location</span>
            </button>

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
