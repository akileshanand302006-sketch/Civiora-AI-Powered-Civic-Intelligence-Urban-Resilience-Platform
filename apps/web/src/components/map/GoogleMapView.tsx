// ============================================================
// Civiora High-Fidelity Interactive Google Map Component
// Official Google Maps Platform + Liquid Glass HUD Controls
// High-Contrast Bright Rendering + Statewide Tamil Nadu 38 Districts Engine
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  getGoogleMaps,
  reverseGeocode,
  getCurrentBrowserPosition,
  forwardGeocode,
} from '../../services/googleMapsService';
import type { CivicLocation } from '../../stores/locationStore';
import { GlassSurface } from '../../design-system/components';
import {
  TAMIL_NADU_DISTRICTS,
  TAMIL_NADU_STATE_BOUNDS,
  TAMIL_NADU_CENTER,
  TAMIL_NADU_DEFAULT_ZOOM,
  resolveTamilNaduDistrict,
} from '@civicpulse/shared';

export interface ViewportBounds {
  sw: [number, number]; // [lng, lat]
  ne: [number, number]; // [lng, lat]
}

export interface GoogleMapViewProps {
  initialLat?: number;
  initialLng?: number;
  initialZoom?: number;
  selectedDistrictId?: string;
  onLocationSelect?: (location: CivicLocation) => void;
  onBoundsChange?: (bounds: ViewportBounds) => void;
  incidents?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title: string;
    category: string;
    isEmergency?: boolean;
    status?: string;
  }>;
  onIncidentSelect?: (incidentId: string) => void;
  interactive?: boolean;
  showSearchBar?: boolean;
  showDistrictSelector?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

// ── CRISP HIGH-CONTRAST READABLE MAP STYLING ────────────────
// Preserves road illumination, crisp text labels & distinct geography
const CRISP_CIVIC_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#182436' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B1321' }, { weight: 3 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#F1F5F9' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64D2FF' }, { weight: 1.5 }],
  },
  {
    featureType: 'administrative.province',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0A84FF' }, { weight: 2 }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2C3E55' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1B2838' }, { weight: 1 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#0A84FF' }, { weight: 2.2 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#053E78' }, { weight: 1 }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#38BDF8' }, { weight: 1.5 }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#93C5FD' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0E3B33' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0B3B60' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38BDF8' }],
  },
];

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  initialLat = 11.0289,
  initialLng = 77.0279,
  initialZoom = 13,
  selectedDistrictId,
  onLocationSelect,
  onBoundsChange,
  incidents = [],
  onIncidentSelect,
  interactive = true,
  showSearchBar = true,
  showDistrictSelector = true,
  style,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const mainMarkerRef = useRef<google.maps.Marker | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const incidentMarkersRef = useRef<google.maps.Marker[]>([]);
  const boundsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const [mapTheme, setMapTheme] = useState<'crisp_dark' | 'standard_light' | 'satellite'>(
    'crisp_dark'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CivicLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [accuracyConfidence, setAccuracyConfidence] = useState<string>('high');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [resolvedDistrictName, setResolvedDistrictName] = useState<string>('Tamil Nadu');

  // Handle location update and reverse geocoding
  const handleCoordUpdate = useCallback(
    async (lat: number, lng: number, accuracyMeters = 15, source: CivicLocation['source'] = 'MAP_SELECTION') => {
      setCurrentCoords({ lat, lng });

      if (mainMarkerRef.current) {
        mainMarkerRef.current.setPosition({ lat, lng });
      }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setCenter({ lat, lng });
        accuracyCircleRef.current.setRadius(accuracyMeters);
      }

      try {
        const loc = await reverseGeocode(lat, lng);
        loc.accuracy = accuracyMeters;
        loc.source = source;
        setResolvedDistrictName(loc.district || 'Tamil Nadu');
        if (loc.accuracyConfidence) {
          setAccuracyConfidence(loc.accuracyConfidence);
        }
        onLocationSelect?.(loc);
      } catch (err) {
        console.warn('[Civiora] Reverse geocoding notice:', err);
      }
    },
    [onLocationSelect]
  );

  // Initialize Google Maps instance ONCE
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      try {
        const g = await getGoogleMaps();
        if (!isMounted || !containerRef.current) return;

        // If map already initialized, skip recreate
        if (mapInstanceRef.current) return;

        const map = new g.maps.Map(containerRef.current, {
          center: { lat: initialLat, lng: initialLng },
          zoom: initialZoom,
          styles: CRISP_CIVIC_MAP_STYLES,
          disableDefaultUI: !interactive,
          zoomControl: interactive,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          restriction: {
            latLngBounds: {
              south: TAMIL_NADU_STATE_BOUNDS.south - 0.5,
              west: TAMIL_NADU_STATE_BOUNDS.west - 0.5,
              north: TAMIL_NADU_STATE_BOUNDS.north + 0.5,
              east: TAMIL_NADU_STATE_BOUNDS.east + 0.5,
            },
            strictBounds: false,
          },
        });

        mapInstanceRef.current = map;

        // Main Selected Civic Location Pin Marker
        const pin = new g.maps.Marker({
          position: { lat: initialLat, lng: initialLng },
          map,
          draggable: interactive,
          animation: g.maps.Animation.DROP,
          title: 'Selected Civic Focus Point',
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#0A84FF',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
          },
        });
        mainMarkerRef.current = pin;

        // Accuracy Halo Circle
        const circle = new g.maps.Circle({
          map,
          center: { lat: initialLat, lng: initialLng },
          radius: 120,
          fillColor: '#0A84FF',
          fillOpacity: 0.15,
          strokeColor: '#64D2FF',
          strokeOpacity: 0.6,
          strokeWeight: 1.5,
        });
        accuracyCircleRef.current = circle;

        if (interactive) {
          // Click on map moves pin & reverse geocodes
          map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            handleCoordUpdate(e.latLng.lat(), e.latLng.lng(), 20, 'MAP_SELECTION');
          });

          // Drag pin updates location
          pin.addListener('dragend', () => {
            const pos = pin.getPosition();
            if (!pos) return;
            handleCoordUpdate(pos.lat(), pos.lng(), 15, 'MAP_SELECTION');
          });

          // Viewport bounds changed listener with 350ms debouncing
          map.addListener('idle', () => {
            if (boundsTimeoutRef.current) {
              clearTimeout(boundsTimeoutRef.current);
            }
            boundsTimeoutRef.current = setTimeout(() => {
              const bounds = map.getBounds();
              if (bounds && onBoundsChange) {
                const sw = bounds.getSouthWest();
                const ne = bounds.getNorthEast();
                onBoundsChange({
                  sw: [sw.lng(), sw.lat()],
                  ne: [ne.lng(), ne.lat()],
                });
              }
            }, 350);
          });
        }
      } catch (err: any) {
        console.warn('[Civiora] Google Maps initialization notice:', err);
        setMapError('Google Maps JavaScript loaded with fallback renderer.');
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (boundsTimeoutRef.current) clearTimeout(boundsTimeoutRef.current);
    };
  }, [interactive, handleCoordUpdate, onBoundsChange]);

  // Synchronize pin and map center when initialLat / initialLng change from external source (e.g. GPS Sync)
  useEffect(() => {
    if (initialLat === undefined || initialLng === undefined) return;
    if (!Number.isFinite(initialLat) || !Number.isFinite(initialLng)) return;

    const latDiff = Math.abs(currentCoords.lat - initialLat);
    const lngDiff = Math.abs(currentCoords.lng - initialLng);
    if (latDiff > 0.00001 || lngDiff > 0.00001) {
      setCurrentCoords({ lat: initialLat, lng: initialLng });
      if (mainMarkerRef.current) {
        mainMarkerRef.current.setPosition({ lat: initialLat, lng: initialLng });
      }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setCenter({ lat: initialLat, lng: initialLng });
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({ lat: initialLat, lng: initialLng });
      }
    }
  }, [initialLat, initialLng, currentCoords.lat, currentCoords.lng]);

  // Handle selectedDistrictId prop updates: smoothly fly to district bounds
  useEffect(() => {
    if (!selectedDistrictId || !mapInstanceRef.current || !window.google?.maps) return;

    if (selectedDistrictId === 'all') {
      // Zoom out to Tamil Nadu Statewide View
      mapInstanceRef.current.setCenter({ lat: TAMIL_NADU_CENTER[1], lng: TAMIL_NADU_CENTER[0] });
      mapInstanceRef.current.setZoom(TAMIL_NADU_DEFAULT_ZOOM);
      setResolvedDistrictName('All Tamil Nadu');
      return;
    }

    const dist = TAMIL_NADU_DISTRICTS.find((d) => d.id === selectedDistrictId);
    if (dist && mapInstanceRef.current) {
      const g = window.google;
      const bounds = new g.maps.LatLngBounds(
        { lat: dist.bounds.south, lng: dist.bounds.west },
        { lat: dist.bounds.north, lng: dist.bounds.east }
      );
      mapInstanceRef.current.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
      handleCoordUpdate(dist.center[1], dist.center[0], 100, 'MAP_SELECTION');
      setResolvedDistrictName(dist.name);
    }
  }, [selectedDistrictId, handleCoordUpdate]);

  // Synchronize Incident Markers on map
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    const g = window.google;

    // Clear previous incident markers
    incidentMarkersRef.current.forEach((m) => m.setMap(null));
    incidentMarkersRef.current = [];

    incidents.forEach((inc) => {
      const markerColor = inc.isEmergency ? '#FF453A' : '#FF9F0A';
      const m = new g.maps.Marker({
        position: { lat: inc.latitude, lng: inc.longitude },
        map: mapInstanceRef.current,
        title: inc.title,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: markerColor,
          fillOpacity: 0.95,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      const infoWindow = new g.maps.InfoWindow({
        content: `
          <div style="color: #0F172A; font-family: -apple-system, sans-serif; padding: 6px; min-width: 180px;">
            <div style="font-size: 13px; font-weight: 700; margin-bottom: 4px;">${inc.title}</div>
            <div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">
              Class: <strong>${inc.category.replace('_', ' ')}</strong>
            </div>
            ${
              inc.isEmergency
                ? '<span style="background: #FEE2E2; color: #DC2626; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 9999px;">CRITICAL EMERGENCY</span>'
                : '<span style="background: #FEF3C7; color: #D97706; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 9999px;">ACTIVE HAZARD</span>'
            }
          </div>
        `,
      });

      m.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, m);
        onIncidentSelect?.(inc.id);
      });

      incidentMarkersRef.current.push(m);
    });
  }, [incidents, onIncidentSelect]);

  // "Locate Me" GPS Button Handler
  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const pos = await getCurrentBrowserPosition();
      setCurrentCoords({ lat: pos.latitude, lng: pos.longitude });
      setAccuracyConfidence(pos.accuracyConfidence);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({ lat: pos.latitude, lng: pos.longitude });
        mapInstanceRef.current.setZoom(16);
      }

      await handleCoordUpdate(pos.latitude, pos.longitude, pos.accuracy, 'CURRENT_GPS');
    } catch (err: any) {
      console.warn('[Civiora Map] GPS location note:', err);
      alert(err.userMessage || err.message || 'Unable to retrieve your GPS location.');
    } finally {
      setIsLocating(false);
    }
  };

  // Statewide Tamil Nadu Overview Button
  const handleStateOverview = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: TAMIL_NADU_CENTER[1], lng: TAMIL_NADU_CENTER[0] });
      mapInstanceRef.current.setZoom(TAMIL_NADU_DEFAULT_ZOOM);
    }
  };

  // Map Theme Switcher Handler
  const handleThemeChange = (theme: 'crisp_dark' | 'standard_light' | 'satellite') => {
    setMapTheme(theme);
    if (!mapInstanceRef.current) return;

    if (theme === 'satellite') {
      mapInstanceRef.current.setMapTypeId('hybrid');
      mapInstanceRef.current.setOptions({ styles: [] });
    } else if (theme === 'standard_light') {
      mapInstanceRef.current.setMapTypeId('roadmap');
      // Bright, standard clean Google Maps styling
      mapInstanceRef.current.setOptions({ styles: [] });
    } else {
      mapInstanceRef.current.setMapTypeId('roadmap');
      mapInstanceRef.current.setOptions({ styles: CRISP_CIVIC_MAP_STYLES });
    }
  };

  // Search input change & forward geocoding
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Check if user searched for a district name directly
      const districtMatch = resolveTamilNaduDistrict(searchQuery);
      if (districtMatch && mapInstanceRef.current) {
        const bounds = new window.google.maps.LatLngBounds(
          { lat: districtMatch.bounds.south, lng: districtMatch.bounds.west },
          { lat: districtMatch.bounds.north, lng: districtMatch.bounds.east }
        );
        mapInstanceRef.current.fitBounds(bounds);
        handleCoordUpdate(districtMatch.center[1], districtMatch.center[0], 50, 'PLACE_SEARCH');
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      const results = await forwardGeocode(searchQuery);
      setSearchResults(results);
      if (results.length > 0) {
        const first = results[0]!;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo({ lat: first.latitude, lng: first.longitude });
          mapInstanceRef.current.setZoom(15);
        }
        handleCoordUpdate(first.latitude, first.longitude, 25, 'PLACE_SEARCH');
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '400px',
        overflow: 'hidden',
        borderRadius: '24px',
        background: '#131D2D',
        ...style,
      }}
      className={className}
    >
      {/* ── Main Google Map Viewport Container ───────────────── */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: 0,
        }}
      />

      {/* ── Floating Top Search & District Navigation HUD ────── */}
      {showSearchBar && (
        <div
          className="position-absolute top-0 start-50 translate-middle-x m-3 d-flex flex-column align-items-center gap-2"
          style={{ width: '92%', maxWidth: '640px', zIndex: 10 }}
        >
          <div className="w-100 d-flex gap-2">
            <GlassSurface
              tier="ultra"
              depth="3d"
              className="p-1 px-3 d-flex align-items-center gap-2 flex-grow-1"
              style={{ borderRadius: '16px' }}
            >
              <i className="bi bi-search text-primary fs-6" />
              <form onSubmit={handleSearchSubmit} className="flex-grow-1 m-0">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search Tamil Nadu location, landmark, district (e.g. Coimbatore, Marina Beach)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--cp-text-primary, #F8FAFC)',
                    outline: 'none',
                    fontSize: '0.88rem',
                    padding: '6px 0',
                  }}
                />
              </form>
              {isSearching && <div className="spinner-border spinner-border-sm text-primary" />}
            </GlassSurface>

            {/* Quick District Selector Dropdown */}
            {showDistrictSelector && (
              <GlassSurface
                tier="ultra"
                depth="3d"
                className="p-1 px-2 d-flex align-items-center"
                style={{ borderRadius: '16px', minWidth: '150px' }}
              >
                <select
                  value={selectedDistrictId || 'all'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'all') {
                      handleStateOverview();
                    } else {
                      const d = TAMIL_NADU_DISTRICTS.find((item) => item.id === val);
                      if (d && mapInstanceRef.current && window.google?.maps) {
                        const bounds = new window.google.maps.LatLngBounds(
                          { lat: d.bounds.south, lng: d.bounds.west },
                          { lat: d.bounds.north, lng: d.bounds.east }
                        );
                        mapInstanceRef.current.fitBounds(bounds);
                        handleCoordUpdate(d.center[1], d.center[0], 50, 'MAP_SELECTION');
                        setResolvedDistrictName(d.name);
                      }
                    }
                  }}
                  className="form-select form-select-sm border-0 bg-transparent text-white fw-semibold"
                  style={{
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: 'none',
                  }}
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
              </GlassSurface>
            )}
          </div>

          {/* Autocomplete suggestions dropdown */}
          {searchResults.length > 1 && (
            <GlassSurface
              tier="ultra"
              depth="3d"
              className="p-2 w-100 d-flex flex-column gap-1"
              style={{ borderRadius: '14px', maxHeight: '180px', overflowY: 'auto' }}
            >
              {searchResults.slice(0, 5).map((r, i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.panTo({ lat: r.latitude, lng: r.longitude });
                      mapInstanceRef.current.setZoom(16);
                    }
                    handleCoordUpdate(r.latitude, r.longitude, 20, 'PLACE_SEARCH');
                    setSearchResults([]);
                    setSearchQuery(r.formattedAddress);
                  }}
                  className="p-2 rounded-2 small d-flex align-items-center justify-content-between text-truncate"
                  style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.04)' }}
                >
                  <span className="text-white text-truncate">{r.formattedAddress}</span>
                  <span className="badge bg-primary bg-opacity-25 text-info ms-2">{r.city}</span>
                </div>
              ))}
            </GlassSurface>
          )}
        </div>
      )}

      {/* ── Floating Controls: Locate Me, Overview, Theme Switcher */}
      <div
        className="position-absolute bottom-0 end-0 m-3 d-flex flex-column gap-2"
        style={{ zIndex: 10 }}
      >
        {/* Locate Me GPS Button */}
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className="btn btn-sm glass-button d-flex align-items-center justify-content-center p-2 rounded-circle"
          style={{
            width: '44px',
            height: '44px',
            background: 'rgba(10, 132, 255, 0.35)',
            border: '1.5px solid rgba(100, 210, 255, 0.6)',
            color: '#64D2FF',
            boxShadow: '0 4px 16px rgba(10, 132, 255, 0.35)',
          }}
          title="Detect Current GPS Location (Tamil Nadu)"
        >
          {isLocating ? (
            <div className="spinner-border spinner-border-sm text-info" />
          ) : (
            <i className="bi bi-crosshair fs-5" />
          )}
        </button>

        {/* Tamil Nadu Statewide Overview Button */}
        <button
          onClick={handleStateOverview}
          className="btn btn-sm glass-button d-flex align-items-center justify-content-center p-2 rounded-circle"
          style={{
            width: '44px',
            height: '44px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#F8FAFC',
          }}
          title="Reset to Tamil Nadu Statewide Overview"
        >
          <i className="bi bi-compass fs-5" />
        </button>

        {/* Map Theme Switcher Pill */}
        <div
          className="btn-group-vertical btn-group-sm rounded-pill p-1 glass-surface"
          role="group"
          style={{ border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <button
            onClick={() => handleThemeChange('crisp_dark')}
            className={`btn btn-sm rounded-circle p-2 ${
              mapTheme === 'crisp_dark' ? 'btn-primary' : 'btn-link text-secondary'
            }`}
            style={{ width: '38px', height: '38px' }}
            title="High-Contrast Crisp Dark"
          >
            <i className="bi bi-moon-stars" />
          </button>
          <button
            onClick={() => handleThemeChange('standard_light')}
            className={`btn btn-sm rounded-circle p-2 ${
              mapTheme === 'standard_light' ? 'btn-primary' : 'btn-link text-secondary'
            }`}
            style={{ width: '38px', height: '38px' }}
            title="Standard Bright Vector Map"
          >
            <i className="bi bi-sun" />
          </button>
          <button
            onClick={() => handleThemeChange('satellite')}
            className={`btn btn-sm rounded-circle p-2 ${
              mapTheme === 'satellite' ? 'btn-primary' : 'btn-link text-secondary'
            }`}
            style={{ width: '38px', height: '38px' }}
            title="Satellite Imagery Hybrid"
          >
            <i className="bi bi-globe2" />
          </button>
        </div>
      </div>

      {/* ── Floating Telemetry & District Capsule (Bottom-Left) ─ */}
      <div
        className="position-absolute bottom-0 start-0 m-3"
        style={{ zIndex: 10 }}
      >
        <div
          className="glass-panel py-1 px-3 d-flex align-items-center gap-2 small font-monospace"
          style={{
            borderRadius: '14px',
            fontSize: '0.76rem',
            color: '#64D2FF',
            background: 'rgba(11, 19, 33, 0.85)',
            border: '1px solid rgba(100, 210, 255, 0.3)',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: accuracyConfidence === 'high' ? '#30D158' : '#FFD60A',
            }}
          />
          <span className="fw-bold text-white">{resolvedDistrictName}</span>
          <span className="text-secondary">|</span>
          <span>LAT: {currentCoords.lat.toFixed(5)}</span>
          <span className="text-secondary">|</span>
          <span>LNG: {currentCoords.lng.toFixed(5)}</span>
          <span className="text-secondary">|</span>
          <span
            className="badge rounded-pill px-2 py-0"
            style={{
              fontSize: '0.68rem',
              backgroundColor:
                accuracyConfidence === 'high'
                  ? 'rgba(48, 209, 88, 0.2)'
                  : 'rgba(255, 214, 10, 0.2)',
              color: accuracyConfidence === 'high' ? '#30D158' : '#FFD60A',
            }}
          >
            {accuracyConfidence.toUpperCase()} CONFIDENCE
          </span>
        </div>
      </div>

      {/* Error or Fallback Notice */}
      {mapError && (
        <div
          className="position-absolute top-0 start-0 m-3 small p-2 rounded-3 text-warning"
          style={{ background: 'rgba(0,0,0,0.8)', zIndex: 5, fontSize: '0.72rem' }}
        >
          {mapError}
        </div>
      )}
    </div>
  );
};

export default GoogleMapView;
