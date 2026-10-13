// ============================================================
// Civiora Real Google Maps Service & Geolocation Engine
// Modern Functional Dynamic Library Loading + Resilient Geocoding
// Statewide Tamil Nadu 38 Districts Address & Accuracy Engine
// ============================================================

/// <reference types="google.maps" />

import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import type { CivicLocation } from '../stores/locationStore';
import {
  TAMIL_NADU_STATE_BOUNDS,
  resolveTamilNaduDistrict,
  findDistrictByCoordinates,
} from '@civicpulse/shared';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

let isConfigured = false;
let mapsPromise: Promise<typeof google> | null = null;

/**
 * Modern Google Maps API Dynamic Library Loader with caching
 */
export async function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window !== 'undefined' && (window as any).google?.maps?.Map) {
    return (window as any).google;
  }

  if (mapsPromise) {
    return mapsPromise;
  }

  mapsPromise = (async () => {
    if (!isConfigured) {
      setOptions({
        key: GOOGLE_MAPS_API_KEY,
        v: 'weekly',
        libraries: ['places', 'geometry', 'marker'],
      });
      isConfigured = true;
    }

    await importLibrary('maps');
    await importLibrary('geocoding');
    try {
      await importLibrary('places');
    } catch (err) {
      console.warn('[Civiora] Places library load note:', err);
    }

    return (window as any).google;
  })();

  return mapsPromise;
}

export const getGoogleMaps = loadGoogleMaps;

/**
 * Classify accuracy in meters into actionable confidence tier
 */
export function classifyAccuracyConfidence(
  accuracyMeters?: number
): 'high' | 'approximate' | 'low' | 'unavailable' {
  if (!accuracyMeters || accuracyMeters <= 0) return 'unavailable';
  if (accuracyMeters <= 25) return 'high';
  if (accuracyMeters <= 100) return 'approximate';
  return 'low';
}

/**
 * Convert Google Maps GeocoderAddressComponent array into canonical CivicLocation
 */
export function parseGoogleAddressComponents(
  lat: number,
  lng: number,
  formattedAddress: string,
  components: google.maps.GeocoderAddressComponent[],
  placeId?: string,
  accuracyMeters: number = 10
): CivicLocation {
  let streetNumber = '';
  let route = '';
  let locality = '';
  let sublocality = '';
  let parsedCity = '';
  let districtName = '';
  let stateName = '';
  let countryName = '';
  let postalCode = '';

  for (const c of components) {
    const types = c.types;
    if (types.includes('street_number')) streetNumber = c.long_name;
    if (types.includes('route')) route = c.long_name;
    if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
      sublocality = c.long_name;
    }
    if (types.includes('locality')) locality = c.long_name;
    if (types.includes('administrative_area_level_2')) districtName = c.long_name;
    if (types.includes('administrative_area_level_1')) stateName = c.long_name;
    if (types.includes('country')) countryName = c.long_name;
    if (types.includes('postal_code')) postalCode = c.long_name;
  }

  const street = [streetNumber, route].filter(Boolean).join(' ') || route || sublocality;

  // Resolve canonical Tamil Nadu district by name or coordinates
  const matchedDistrict =
    resolveTamilNaduDistrict(districtName) ||
    resolveTamilNaduDistrict(locality) ||
    findDistrictByCoordinates(lng, lat);

  const finalDistrictName = matchedDistrict?.name || districtName || 'Tamil Nadu District';
  const finalDistrictId = matchedDistrict?.id;
  parsedCity = locality || matchedDistrict?.headquarters || districtName || sublocality || 'Tamil Nadu';

  return {
    latitude: lat,
    longitude: lng,
    accuracy: accuracyMeters,
    accuracyConfidence: classifyAccuracyConfidence(accuracyMeters),
    formattedAddress,
    name: sublocality || street || parsedCity,
    street: street || undefined,
    locality: sublocality || locality || undefined,
    city: parsedCity,
    district: finalDistrictName,
    districtId: finalDistrictId,
    state: stateName || 'Tamil Nadu',
    country: countryName || 'India',
    postalCode: postalCode || undefined,
    placeId,
    source: 'MAP_SELECTION',
    selectedAt: new Date().toISOString(),
  };
}

/**
 * Reverse geocode latitude and longitude to structured canonical CivicLocation
 */
export async function reverseGeocode(lat: number, lng: number): Promise<CivicLocation> {
  // 1. Attempt official Google Maps Geocoder if loaded and configured
  try {
    const g = await loadGoogleMaps();
    if (g?.maps?.Geocoder) {
      const geocoder = new g.maps.Geocoder();
      const response = await geocoder.geocode({
        location: { lat, lng },
      });

      if (response.results && response.results.length > 0) {
        const top = response.results[0]!;
        return parseGoogleAddressComponents(
          lat,
          lng,
          top.formatted_address,
          top.address_components,
          top.place_id,
          10
        );
      }
    }
  } catch (err) {
    console.warn('[Civiora] Google Geocoder fallback engaged:', err);
  }

  // 2. Resilient OpenStreetMap Nominatim reverse geocoding fallback
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Civiora-GovTech-TamilNadu/2.0',
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const locality = addr.suburb || addr.neighbourhood || addr.village;
      const districtRaw = addr.state_district || addr.county || addr.district;

      const matchedDistrict =
        resolveTamilNaduDistrict(districtRaw) ||
        resolveTamilNaduDistrict(addr.city || addr.town) ||
        findDistrictByCoordinates(lng, lat);

      const districtName = matchedDistrict?.name || districtRaw || 'Tamil Nadu';
      const cityName =
        addr.city || addr.town || addr.municipality || matchedDistrict?.headquarters || 'Tamil Nadu';

      return {
        latitude: lat,
        longitude: lng,
        accuracy: 15,
        accuracyConfidence: 'high',
        formattedAddress: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        name: data.name || addr.amenity || addr.road || cityName,
        street: addr.road,
        locality: locality,
        city: cityName,
        district: districtName,
        districtId: matchedDistrict?.id,
        state: addr.state || 'Tamil Nadu',
        country: addr.country || 'India',
        postalCode: addr.postcode,
        placeId: data.place_id ? String(data.place_id) : undefined,
        source: 'MAP_SELECTION',
        selectedAt: new Date().toISOString(),
      };
    }
  } catch (fallbackErr) {
    console.error('[Civiora] Reverse geocode fallback note:', fallbackErr);
  }

  // 3. Coordinate fallback with canonical district boundary resolution
  const districtFallback = findDistrictByCoordinates(lng, lat);
  return {
    latitude: lat,
    longitude: lng,
    accuracy: 30,
    accuracyConfidence: 'approximate',
    formattedAddress: `${districtFallback?.name || 'Tamil Nadu'} Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    city: districtFallback?.headquarters || 'Tamil Nadu',
    district: districtFallback?.name || 'Tamil Nadu',
    districtId: districtFallback?.id,
    state: 'Tamil Nadu',
    country: 'India',
    source: 'MAP_SELECTION',
    selectedAt: new Date().toISOString(),
  };
}

/**
 * Forward Geocode an address/place search with Tamil Nadu bias
 */
export async function forwardGeocode(query: string): Promise<CivicLocation[]> {
  try {
    const g = await loadGoogleMaps();
    if (g?.maps?.Geocoder) {
      const geocoder = new g.maps.Geocoder();
      const res = await geocoder.geocode({
        address: query,
        componentRestrictions: { country: 'in' },
        bounds: new g.maps.LatLngBounds(
          { lat: TAMIL_NADU_STATE_BOUNDS.south, lng: TAMIL_NADU_STATE_BOUNDS.west },
          { lat: TAMIL_NADU_STATE_BOUNDS.north, lng: TAMIL_NADU_STATE_BOUNDS.east }
        ),
      });

      if (res.results) {
        return res.results.map((r) => {
          const lat = r.geometry.location.lat();
          const lng = r.geometry.location.lng();
          return parseGoogleAddressComponents(
            lat,
            lng,
            r.formatted_address,
            r.address_components,
            r.place_id,
            15
          );
        });
      }
    }
  } catch (err) {
    console.warn('[Civiora] Google Forward Geocode fallback:', err);
  }

  // Fallback to Nominatim search bounded to Tamil Nadu
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        query + ', Tamil Nadu'
      )}&countrycodes=in&viewbox=76.22,13.55,80.35,8.08&bounded=1&limit=5`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Civiora-GovTech-TamilNadu/2.0',
        },
      }
    );

    if (res.ok) {
      const list = await res.json();
      return list.map((item: any) => {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const district = findDistrictByCoordinates(lng, lat);
        return {
          latitude: lat,
          longitude: lng,
          accuracy: 25,
          accuracyConfidence: 'approximate' as const,
          formattedAddress: item.display_name,
          name: item.name || query,
          city: district?.headquarters || 'Tamil Nadu',
          district: district?.name,
          districtId: district?.id,
          state: 'Tamil Nadu',
          country: 'India',
          source: 'PLACE_SEARCH' as const,
          selectedAt: new Date().toISOString(),
        };
      });
    }
  } catch (err) {
    console.error('[Civiora] Forward geocode fallback error:', err);
  }

  return [];
}

import {
  acquireDevicePosition,
  type ValidatedCoordinates,
} from './deviceGeolocationService';

export interface BrowserPositionResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  accuracyConfidence: 'high' | 'approximate' | 'low';
  source: 'CURRENT_GPS';
  timestamp?: string;
}

/**
 * Get current browser location using high-accuracy W3C Geolocation Engine
 * Accurately reports true measured accuracy and propagates actionable errors
 */
export async function getCurrentBrowserPosition(): Promise<BrowserPositionResult> {
  const result: ValidatedCoordinates = await acquireDevicePosition({
    timeout: 15000,
  });

  return {
    latitude: result.latitude,
    longitude: result.longitude,
    accuracy: result.accuracy,
    accuracyConfidence: result.accuracyConfidence === 'unavailable' ? 'low' : result.accuracyConfidence,
    source: 'CURRENT_GPS',
    timestamp: result.timestamp,
  };
}


