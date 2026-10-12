// ============================================================
// CivicPulse Real Interactive Google Map Component
// Official Google Maps Platform + Liquid Glass HUD Controls
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { getGoogleMaps, reverseGeocode, getCurrentBrowserPosition } from '../../services/googleMapsService';
import type { CivicLocation } from '../../stores/locationStore';
import { GlassSurface } from '../../design-system/components';

export interface GoogleMapViewProps {
  initialLat?: number;
  initialLng?: number;
  initialZoom?: number;
  onLocationSelect?: (location: CivicLocation) => void;
  incidents?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title: string;
    category: string;
    isEmergency?: boolean;
  }>;
  interactive?: boolean;
  showSearchBar?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

// Sleek dark-mode GovTech Google Map theme styling
const GOVTECH_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0F172A' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#070A10' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94A3B8' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64D2FF' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38BDF8' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#064E3B' }, { opacity: 0.4 }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1E293B' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0A84FF' }, { opacity: 0.2 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#0A84FF' }, { opacity: 0.35 }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#082F49' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#0284C7' }],
  },
];

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  initialLat = 11.0289, // Default: Coimbatore
  initialLng = 77.0279,
  initialZoom = 14,
  onLocationSelect,
  incidents = [],
  interactive = true,
  showSearchBar = true,
  style,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const mainMarkerRef = useRef<google.maps.Marker | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const incidentMarkersRef = useRef<google.maps.Marker[]>([]);

  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      try {
        const g = await getGoogleMaps();
        if (!isMounted || !containerRef.current) return;

        const map = new g.maps.Map(containerRef.current, {
          center: { lat: initialLat, lng: initialLng },
          zoom: initialZoom,
          styles: GOVTECH_MAP_STYLES,
          disableDefaultUI: !interactive,
          zoomControl: interactive,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapInstanceRef.current = map;

        // Custom main pin marker
        const pin = new g.maps.Marker({
          position: { lat: initialLat, lng: initialLng },
          map,
          draggable: interactive,
          animation: g.maps.Animation.DROP,
          title: 'Selected Civic Area',
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#0A84FF',
            fillOpacity: 1,
            strokeColor: '#64D2FF',
            strokeWeight: 3,
          },
        });

        mainMarkerRef.current = pin;

        // Subtle accuracy halo
        const circle = new g.maps.Circle({
          map,
          center: { lat: initialLat, lng: initialLng },
          radius: 120,
          fillColor: '#0A84FF',
          fillOpacity: 0.12,
          strokeColor: '#64D2FF',
          strokeOpacity: 0.4,
          strokeWeight: 1,
        });
        accuracyCircleRef.current = circle;

        if (interactive) {
          // Click to relocate pin
          map.addListener('click', async (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            pin.setPosition({ lat, lng });
            circle.setCenter({ lat, lng });
            setCurrentCoords({ lat, lng });

            const loc = await reverseGeocode(lat, lng);
            onLocationSelect?.(loc);
          });

          // Drag pin to relocate
          pin.addListener('dragend', async () => {
            const pos = pin.getPosition();
            if (!pos) return;
            const lat = pos.lat();
            const lng = pos.lng();
            circle.setCenter({ lat, lng });
            setCurrentCoords({ lat, lng });

            const loc = await reverseGeocode(lat, lng);
            onLocationSelect?.(loc);
          });

          // Google Places Autocomplete integration
          if (searchInputRef.current && g.maps.places) {
            const autocomplete = new g.maps.places.Autocomplete(searchInputRef.current, {
              types: ['geocode', 'establishment'],
            });

            autocomplete.addListener('place_changed', () => {
              const place = autocomplete.getPlace();
              if (!place.geometry || !place.geometry.location) return;

              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();

              map.setCenter({ lat, lng });
              map.setZoom(16);
              pin.setPosition({ lat, lng });
              circle.setCenter({ lat, lng });
              setCurrentCoords({ lat, lng });

              const loc: CivicLocation = {
                latitude: lat,
                longitude: lng,
                accuracy: 10,
                formattedAddress: place.formatted_address || place.name || `${lat}, ${lng}`,
                name: place.name || undefined,
                city: 'Coimbatore',
                state: 'Tamil Nadu',
                country: 'India',
                placeId: place.place_id,
                source: 'PLACE_SEARCH',
                selectedAt: new Date().toISOString(),
              };

              onLocationSelect?.(loc);
            });
          }
        }
      } catch (err: any) {
        console.warn('[CivicPulse] Google Maps Loader notice:', err);
        setMapError('Google Maps API key is not active. Using fallback spatial map.');
      }
    }

    initMap();

    return () => {
      isMounted = false;
    };
  }, [initialLat, initialLng, initialZoom, interactive]);

  // Update incident markers when list changes
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    const g = window.google;

    // Clear existing incident markers
    incidentMarkersRef.current.forEach((m) => m.setMap(null));
    incidentMarkersRef.current = [];

    // Add new incident markers
    incidents.forEach((inc) => {
      const markerColor = inc.isEmergency ? '#FF453A' : '#FF9F0A';
      const m = new g.maps.Marker({
        position: { lat: inc.latitude, lng: inc.longitude },
        map: mapInstanceRef.current,
        title: inc.title,
        icon: {
          path: g.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: markerColor,
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 1.5,
        },
      });

      const infoWindow = new g.maps.InfoWindow({
        content: `
          <div style="color: #0F172A; padding: 4px; font-family: sans-serif;">
            <strong>${inc.title}</strong><br/>
            <span style="font-size: 11px; color: #64748B;">Category: ${inc.category}</span>
          </div>
        `,
      });

      m.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, m);
      });

      incidentMarkersRef.current.push(m);
    });
  }, [incidents]);

  // Handle GPS location click
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const pos = await getCurrentBrowserPosition();
      setCurrentCoords({ lat: pos.latitude, lng: pos.longitude });

      if (mapInstanceRef.current && mainMarkerRef.current && accuracyCircleRef.current) {
        const newPos = { lat: pos.latitude, lng: pos.longitude };
        mapInstanceRef.current.setCenter(newPos);
        mapInstanceRef.current.setZoom(16);
        mainMarkerRef.current.setPosition(newPos);
        accuracyCircleRef.current.setCenter(newPos);
        accuracyCircleRef.current.setRadius(pos.accuracy || 80);
      }

      const loc = await reverseGeocode(pos.latitude, pos.longitude);
      loc.accuracy = pos.accuracy;
      loc.source = 'CURRENT_GPS';
      onLocationSelect?.(loc);
    } catch (err: any) {
      alert(err.message || 'Unable to retrieve your current location.');
    } finally {
      setIsLocating(false);
    }
  };

  // Toggle map type
  const handleMapTypeToggle = (type: 'roadmap' | 'satellite') => {
    setMapType(type);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(type);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: '24px',
        backgroundColor: '#070A10',
        ...style,
      }}
      className={className}
    >
      {/* ── Main Google Map Element ─────────────────────────── */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* ── Floating Liquid Glass Search Bar ────────────────── */}
      {showSearchBar && (
        <div
          className="position-absolute top-0 start-50 translate-middle-x m-3"
          style={{ width: '90%', maxWidth: '480px', zIndex: 10 }}
        >
          <GlassSurface
            tier="ultra"
            depth="3d"
            className="p-1 px-3 d-flex align-items-center gap-2"
            style={{ borderRadius: '16px' }}
          >
            <i className="bi bi-search text-primary fs-6" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search address, landmark or college (e.g. CIT Coimbatore)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--cp-text-primary)',
                outline: 'none',
                fontSize: '0.88rem',
                padding: '6px 0',
              }}
            />
          </GlassSurface>
        </div>
      )}

      {/* ── Floating Map Controls (Type Switcher & GPS) ──────── */}
      <div
        className="position-absolute bottom-0 end-0 m-3 d-flex flex-column gap-2"
        style={{ zIndex: 10 }}
      >
        <button
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="btn btn-sm glass-button d-flex align-items-center justify-content-center p-2 rounded-circle"
          style={{
            width: '42px',
            height: '42px',
            background: 'rgba(10, 132, 255, 0.25)',
            border: '1px solid rgba(100, 210, 255, 0.4)',
            color: '#64D2FF',
          }}
          title="Use My Current GPS Location"
        >
          {isLocating ? (
            <div className="spinner-border spinner-border-sm text-info" />
          ) : (
            <i className="bi bi-crosshair fs-5" />
          )}
        </button>

        <div className="btn-group-vertical btn-group-sm rounded-pill p-1 glass-surface" role="group">
          <button
            onClick={() => handleMapTypeToggle('roadmap')}
            className={`btn btn-sm rounded-circle p-2 ${
              mapType === 'roadmap' ? 'btn-primary' : 'btn-link text-secondary'
            }`}
            style={{ width: '38px', height: '38px' }}
            title="Roadmap View"
          >
            <i className="bi bi-map" />
          </button>
          <button
            onClick={() => handleMapTypeToggle('satellite')}
            className={`btn btn-sm rounded-circle p-2 ${
              mapType === 'satellite' ? 'btn-primary' : 'btn-link text-secondary'
            }`}
            style={{ width: '38px', height: '38px' }}
            title="Satellite Imagery"
          >
            <i className="bi bi-globe2" />
          </button>
        </div>
      </div>

      {/* Floating Coordinates Capsule */}
      <div
        className="position-absolute bottom-0 start-0 m-3"
        style={{ zIndex: 10 }}
      >
        <div
          className="glass-panel py-1 px-3 d-flex align-items-center gap-2 small font-monospace"
          style={{ borderRadius: '12px', fontSize: '0.75rem', color: '#64D2FF' }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#30D158' }} />
          <span>LAT: {currentCoords.lat.toFixed(5)}</span>
          <span className="text-secondary">|</span>
          <span>LNG: {currentCoords.lng.toFixed(5)}</span>
        </div>
      </div>

      {/* Fallback Notice if Google Maps JS fails to load */}
      {mapError && (
        <div
          className="position-absolute top-0 start-0 m-3 small p-2 rounded-3 text-warning"
          style={{ background: 'rgba(0,0,0,0.7)', zIndex: 5, fontSize: '0.72rem' }}
        >
          {mapError}
        </div>
      )}
    </div>
  );
};

export default GoogleMapView;
