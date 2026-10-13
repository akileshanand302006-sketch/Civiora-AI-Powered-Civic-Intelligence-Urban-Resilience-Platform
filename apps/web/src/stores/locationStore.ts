// ============================================================
// Civiora Location Store (Zustand)
// Exact Location Management + Saved Places + Geospatial Context
// Statewide Tamil Nadu 38 Districts Support
// ============================================================

import { create } from 'zustand';
import {
  TAMIL_NADU_CENTER,
  TAMIL_NADU_DISTRICTS,
  resolveTamilNaduDistrict,
} from '@civicpulse/shared';

export interface CivicLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  accuracyConfidence?: 'high' | 'approximate' | 'low' | 'unavailable';
  formattedAddress: string;
  name?: string;
  street?: string;
  locality?: string;
  city: string;
  district?: string;
  districtId?: string;
  state: string;
  country: string;
  postalCode?: string;
  placeId?: string;
  source: 'CURRENT_GPS' | 'MAP_SELECTION' | 'PLACE_SEARCH' | 'SAVED_LOCATION';
  selectedAt: string;
}

export interface SavedLocation {
  id: string;
  name: string;
  type: 'home' | 'college' | 'work' | 'other';
  location: CivicLocation;
  isDefault?: boolean;
}

// Canonical Statewide Default: Tamil Nadu Central Command (Tiruchirappalli / Statewide Hub)
export const TAMIL_NADU_DEFAULT_LOCATION: CivicLocation = {
  latitude: TAMIL_NADU_CENTER[1], // 11.1271
  longitude: TAMIL_NADU_CENTER[0], // 78.6569
  accuracy: 10,
  accuracyConfidence: 'high',
  formattedAddress: 'Tamil Nadu State Central Civic Hub, Tiruchirappalli, Tamil Nadu 620001, India',
  name: 'Tamil Nadu Statewide Command',
  street: 'State Highway Corridor',
  locality: 'Central Civic Zone',
  city: 'Tiruchirappalli',
  district: 'Tiruchirappalli',
  districtId: 'tiruchirappalli',
  state: 'Tamil Nadu',
  country: 'India',
  postalCode: '620001',
  source: 'SAVED_LOCATION',
  selectedAt: new Date().toISOString(),
};

export const DEFAULT_CIVIC_LOCATION = TAMIL_NADU_DEFAULT_LOCATION;

// Curated Tamil Nadu Regional Hubs
export const TAMIL_NADU_REGIONAL_HUBS: SavedLocation[] = [
  {
    id: 'hub-chennai',
    name: 'Chennai Secretariat & Metro Core',
    type: 'work',
    location: {
      latitude: 13.0827,
      longitude: 80.2707,
      accuracy: 8,
      accuracyConfidence: 'high',
      formattedAddress: 'Fort St. George, Rajaji Salai, Chennai, Tamil Nadu 600009',
      name: 'Chennai Secretariat',
      street: 'Rajaji Salai',
      locality: 'George Town',
      city: 'Chennai',
      district: 'Chennai',
      districtId: 'chennai',
      state: 'Tamil Nadu',
      country: 'India',
      postalCode: '600009',
      source: 'SAVED_LOCATION',
      selectedAt: new Date().toISOString(),
    },
  },
  {
    id: 'hub-coimbatore',
    name: 'Coimbatore Institute of Technology (CIT)',
    type: 'college',
    location: {
      latitude: 11.0289,
      longitude: 77.0279,
      accuracy: 10,
      accuracyConfidence: 'high',
      formattedAddress: 'CIT, Avinashi Rd, Civil Aerodrome Post, Coimbatore, Tamil Nadu 641014',
      name: 'Coimbatore Institute of Technology',
      street: 'Avinashi Road',
      locality: 'Peelamedu',
      city: 'Coimbatore',
      district: 'Coimbatore',
      districtId: 'coimbatore',
      state: 'Tamil Nadu',
      country: 'India',
      postalCode: '641014',
      source: 'SAVED_LOCATION',
      selectedAt: new Date().toISOString(),
    },
    isDefault: true,
  },
  {
    id: 'hub-madurai',
    name: 'Madurai Smart City Center',
    type: 'work',
    location: {
      latitude: 9.9252,
      longitude: 78.1198,
      accuracy: 12,
      accuracyConfidence: 'high',
      formattedAddress: 'Meenakshi Temple Zone, Madurai, Tamil Nadu 625001',
      name: 'Madurai Central',
      street: 'West Tower Street',
      locality: 'Meenakshi Nagar',
      city: 'Madurai',
      district: 'Madurai',
      districtId: 'madurai',
      state: 'Tamil Nadu',
      country: 'India',
      postalCode: '625001',
      source: 'SAVED_LOCATION',
      selectedAt: new Date().toISOString(),
    },
  },
  {
    id: 'hub-salem',
    name: 'Salem Municipal Corporation Hub',
    type: 'work',
    location: {
      latitude: 11.6643,
      longitude: 78.146,
      accuracy: 15,
      accuracyConfidence: 'high',
      formattedAddress: 'Fort Main Road, Salem, Tamil Nadu 636001',
      name: 'Salem Municipal Core',
      street: 'Fort Main Road',
      locality: 'Hasthampatti',
      city: 'Salem',
      district: 'Salem',
      districtId: 'salem',
      state: 'Tamil Nadu',
      country: 'India',
      postalCode: '636001',
      source: 'SAVED_LOCATION',
      selectedAt: new Date().toISOString(),
    },
  },
  {
    id: 'hub-nilgiris',
    name: 'The Nilgiris Hill Governance Centre (Ooty)',
    type: 'work',
    location: {
      latitude: 11.4102,
      longitude: 76.7032,
      accuracy: 15,
      accuracyConfidence: 'high',
      formattedAddress: 'Charing Cross, Udhagamandalam, The Nilgiris, Tamil Nadu 643001',
      name: 'Nilgiris Civic Centre',
      street: 'Commercial Road',
      locality: 'Charing Cross',
      city: 'Udhagamandalam (Ooty)',
      district: 'The Nilgiris',
      districtId: 'the_nilgiris',
      state: 'Tamil Nadu',
      country: 'India',
      postalCode: '643001',
      source: 'SAVED_LOCATION',
      selectedAt: new Date().toISOString(),
    },
  },
  {
    id: 'hub-kanniyakumari',
    name: 'Kanniyakumari Coastal Resilience Unit',
    type: 'work',
    location: {
      latitude: 8.0883,
      longitude: 77.5385,
      accuracy: 12,
      accuracyConfidence: 'high',
      formattedAddress: 'Beach Road, Kanniyakumari, Tamil Nadu 629702',
      name: 'Kanniyakumari Unit',
      street: 'Beach Road',
      locality: 'Cape Comorin',
      city: 'Kanniyakumari',
      district: 'Kanniyakumari',
      districtId: 'kanniyakumari',
      state: 'Tamil Nadu',
      country: 'India',
      postalCode: '629702',
      source: 'SAVED_LOCATION',
      selectedAt: new Date().toISOString(),
    },
  },
];

interface LocationState {
  selectedLocation: CivicLocation | null;
  savedLocations: SavedLocation[];
  selectedDistrictId: string; // 'all' or canonical district id
  locationPermission: 'prompt' | 'granted' | 'denied';
  isLocationModalOpen: boolean;
  isAuthGateOpen: boolean;
  authGateMessage?: string;
  authGateRedirectUrl?: string;

  setSelectedLocation: (loc: CivicLocation) => void;
  setSelectedDistrictId: (districtId: string) => void;
  clearSelectedLocation: () => void;
  addSavedLocation: (name: string, type: SavedLocation['type'], loc: CivicLocation, isDefault?: boolean) => void;
  removeSavedLocation: (id: string) => void;
  setDefaultSavedLocation: (id: string) => void;
  setLocationPermission: (perm: 'prompt' | 'granted' | 'denied') => void;
  openLocationModal: () => void;
  closeLocationModal: () => void;
  openAuthGate: (message?: string, redirectUrl?: string) => void;
  closeAuthGate: () => void;
  initializeLocation: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  selectedLocation: null,
  savedLocations: TAMIL_NADU_REGIONAL_HUBS,
  selectedDistrictId: 'all',
  locationPermission: 'prompt',
  isLocationModalOpen: false,
  isAuthGateOpen: false,

  setSelectedLocation: (loc: CivicLocation) => {
    // Automatically correlate district if not populated
    if (!loc.districtId && (loc.district || loc.city)) {
      const match = resolveTamilNaduDistrict(loc.district || loc.city);
      if (match) {
        loc.districtId = match.id;
        loc.district = match.name;
      }
    }
    localStorage.setItem('cp_selected_location', JSON.stringify(loc));
    set({
      selectedLocation: loc,
      selectedDistrictId: loc.districtId || get().selectedDistrictId,
    });
  },

  setSelectedDistrictId: (districtId: string) => {
    set({ selectedDistrictId: districtId });
    if (districtId !== 'all') {
      const district = TAMIL_NADU_DISTRICTS.find((d) => d.id === districtId);
      if (district) {
        const hubLoc: CivicLocation = {
          latitude: district.center[1],
          longitude: district.center[0],
          accuracy: 50,
          accuracyConfidence: 'approximate',
          formattedAddress: `${district.name} District Administrative Headquarters, Tamil Nadu, India`,
          name: `${district.name} Headquarters`,
          city: district.headquarters,
          district: district.name,
          districtId: district.id,
          state: 'Tamil Nadu',
          country: 'India',
          source: 'MAP_SELECTION',
          selectedAt: new Date().toISOString(),
        };
        localStorage.setItem('cp_selected_location', JSON.stringify(hubLoc));
        set({ selectedLocation: hubLoc });
      }
    }
  },

  clearSelectedLocation: () => {
    localStorage.removeItem('cp_selected_location');
    set({ selectedLocation: null });
  },

  addSavedLocation: (name, type, loc, isDefault = false) => {
    const newEntry: SavedLocation = {
      id: `saved-${Date.now()}`,
      name,
      type,
      location: loc,
      isDefault,
    };
    const current = get().savedLocations;
    const updated: SavedLocation[] = isDefault
      ? [...current.map((s) => ({ ...s, isDefault: false })), newEntry]
      : [...current, newEntry];

    localStorage.setItem('cp_saved_locations', JSON.stringify(updated));
    set({ savedLocations: updated });
  },

  removeSavedLocation: (id: string) => {
    const updated = get().savedLocations.filter((s) => s.id !== id);
    localStorage.setItem('cp_saved_locations', JSON.stringify(updated));
    set({ savedLocations: updated });
  },

  setDefaultSavedLocation: (id: string) => {
    const updated = get().savedLocations.map((s) => ({
      ...s,
      isDefault: s.id === id,
    }));
    const target = updated.find((s) => s.id === id);
    if (target) {
      get().setSelectedLocation(target.location);
    }
    localStorage.setItem('cp_saved_locations', JSON.stringify(updated));
    set({ savedLocations: updated });
  },

  setLocationPermission: (perm) => {
    localStorage.setItem('cp_location_perm', perm);
    set({ locationPermission: perm });
  },

  openLocationModal: () => set({ isLocationModalOpen: true }),
  closeLocationModal: () => set({ isLocationModalOpen: false }),

  openAuthGate: (message, redirectUrl) =>
    set({
      isAuthGateOpen: true,
      authGateMessage: message,
      authGateRedirectUrl: redirectUrl,
    }),
  closeAuthGate: () =>
    set({
      isAuthGateOpen: false,
      authGateMessage: undefined,
      authGateRedirectUrl: undefined,
    }),

  initializeLocation: () => {
    const stored = localStorage.getItem('cp_selected_location');
    const storedPerm = localStorage.getItem('cp_location_perm') as any;
    const storedSaved = localStorage.getItem('cp_saved_locations');

    if (storedPerm) {
      set({ locationPermission: storedPerm });
    }
    if (storedSaved) {
      try {
        set({ savedLocations: JSON.parse(storedSaved) });
      } catch {}
    }
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        set({
          selectedLocation: parsed,
          selectedDistrictId: parsed.districtId || 'all',
        });
        return;
      } catch {}
    }

    // Default to the statewide central command location if none stored
    set({ selectedLocation: TAMIL_NADU_DEFAULT_LOCATION, selectedDistrictId: 'all' });
  },
}));
