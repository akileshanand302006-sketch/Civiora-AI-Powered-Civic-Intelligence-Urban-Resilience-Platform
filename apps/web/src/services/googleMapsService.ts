// ============================================================
// CivicPulse Real Google Maps Service & Geolocation Engine
// Modern Functional Dynamic Library Loading + Resilient Geocoding
// ============================================================

/// <reference types="google.maps" />

import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import type { CivicLocation } from '../stores/locationStore';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

let isConfigured = false;

/**
 * Modern Google Maps API Dynamic Library Loader
 */
export async function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window !== 'undefined' && (window as any).google?.maps?.Map) {
    return (window as any).google;
  }

  if (!isConfigured) {
    setOptions({
      key: GOOGLE_MAPS_API_KEY,
      v: 'weekly',
    });
    isConfigured = true;
  }

  await importLibrary('maps');
  await importLibrary('geocoding');
  try {
    await importLibrary('places');
  } catch (err) {
    console.warn('[CivicPulse] Places library optional load notice:', err);
  }

  return (window as any).google;
}

export const getGoogleMaps = loadGoogleMaps;

/**
 * Convert Google Maps GeocoderAddressComponent array into canonical CivicLocation
 */
export function parseGoogleAddressComponents(
  lat: number,
  lng: number,
  formattedAddress: string,
  components: google.maps.GeocoderAddressComponent[],
  placeId?: string,
  accuracy?: number
): CivicLocation {
  let streetNumber = '';
  let route = '';
  let locality = '';
  let sublocality = '';
  let parsedCity = '';
  let district = '';
  let state = '';
  let country = '';
  let postalCode = '';

  for (const c of components) {
    const types = c.types;
    if (types.includes('street_number')) streetNumber = c.long_name;
    if (types.includes('route')) route = c.long_name;
    if (types.includes('sublocality') || types.includes('sublocality_level_1')) sublocality = c.long_name;
    if (types.includes('locality')) locality = c.long_name;
    if (types.includes('administrative_area_level_2')) district = c.long_name;
    if (types.includes('administrative_area_level_1')) state = c.long_name;
    if (types.includes('country')) country = c.long_name;
    if (types.includes('postal_code')) postalCode = c.long_name;
  }

  const street = [streetNumber, route].filter(Boolean).join(' ') || route || sublocality;
  parsedCity = locality || district || sublocality || 'Coimbatore';

  return {
    latitude: lat,
    longitude: lng,
    accuracy: accuracy || 10,
    formattedAddress,
    name: sublocality || street || parsedCity,
    street: street || undefined,
    locality: sublocality || locality || undefined,
    city: parsedCity,
    district: district || undefined,
    state: state || 'Tamil Nadu',
    country: country || 'India',
    postalCode: postalCode || undefined,
    placeId,
    source: 'MAP_SELECTION',
    selectedAt: new Date().toISOString(),
  };
}

/**
 * Reverse geocode latitude and longitude to a real human-readable address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<CivicLocation> {
  try {
    const g = await loadGoogleMaps();
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
        top.place_id
      );
    }
  } catch (err) {
    console.warn('[CivicPulse] Google Geocoder fallback engaged:', err);
  }

  // Resilient fallback using OpenStreetMap Nominatim for exact real-world addresses
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'CivicPulse-GovTech/2.0',
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const cityName =
        addr.city || addr.town || addr.municipality || addr.suburb || addr.state_district || 'Coimbatore';

      return {
        latitude: lat,
        longitude: lng,
        accuracy: 15,
        formattedAddress: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        name: data.name || addr.amenity || addr.road || cityName,
        street: addr.road,
        locality: addr.suburb || addr.neighbourhood,
        city: cityName,
        district: addr.state_district || addr.county,
        state: addr.state || 'Tamil Nadu',
        country: addr.country || 'India',
        postalCode: addr.postcode,
        placeId: data.place_id ? String(data.place_id) : undefined,
        source: 'MAP_SELECTION',
        selectedAt: new Date().toISOString(),
      };
    }
  } catch (fallbackErr) {
    console.error('[CivicPulse] Reverse geocode fallback notice:', fallbackErr);
  }

  // Graceful fallback with formatted coordinates
  return {
    latitude: lat,
    longitude: lng,
    accuracy: 25,
    formattedAddress: `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    city: 'Selected Region',
    state: 'Active Zone',
    country: 'India',
    source: 'MAP_SELECTION',
    selectedAt: new Date().toISOString(),
  };
}

/**
 * Get current browser GPS location with permission checking
 */
export function getCurrentBrowserPosition(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
      },
      (err) => {
        let msg = 'Failed to retrieve location.';
        if (err.code === 1) msg = 'Location permission denied by user.';
        else if (err.code === 2) msg = 'Position unavailable. Please check your GPS signal.';
        else if (err.code === 3) msg = 'Location request timed out.';
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}
