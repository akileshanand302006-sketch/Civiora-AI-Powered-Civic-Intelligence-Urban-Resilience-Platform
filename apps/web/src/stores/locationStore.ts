// ============================================================
// CivicPulse Location Store (Zustand)
// Exact Location Management + Saved Places + Geospatial Context
// ============================================================

import { create } from 'zustand';

export interface CivicLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  formattedAddress: string;
  name?: string;
  street?: string;
  locality?: string;
  city: string;
  district?: string;
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

// Canonical Default: Coimbatore, Tamil Nadu, India (Real-world reference)
export const DEFAULT_CIVIC_LOCATION: CivicLocation = {
  latitude: 11.0289,
  longitude: 77.0279,
  accuracy: 12,
  formattedAddress: 'Coimbatore Institute of Technology, Avinashi Rd, Civil Aerodrome Post, Coimbatore, Tamil Nadu 641014, India',
  name: 'Coimbatore Institute of Technology',
  street: 'Avinashi Road',
  locality: 'Civil Aerodrome Post',
  city: 'Coimbatore',
  district: 'Coimbatore',
  state: 'Tamil Nadu',
  country: 'India',
  postalCode: '641014',
  source: 'SAVED_LOCATION',
  selectedAt: new Date().toISOString(),
};

interface LocationState {
  selectedLocation: CivicLocation | null;
  savedLocations: SavedLocation[];
  locationPermission: 'prompt' | 'granted' | 'denied';
  isLocationModalOpen: boolean;
  isAuthGateOpen: boolean;
  authGateMessage?: string;
  authGateRedirectUrl?: string;

  setSelectedLocation: (loc: CivicLocation) => void;
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
  savedLocations: [
    {
      id: 'saved-college-1',
      name: 'Coimbatore Institute of Technology',
      type: 'college',
      location: DEFAULT_CIVIC_LOCATION,
      isDefault: true,
    },
    {
      id: 'saved-home-1',
      name: 'Home (Race Course)',
      type: 'home',
      location: {
        latitude: 11.0018,
        longitude: 76.9744,
        accuracy: 15,
        formattedAddress: 'Race Course Road, Gopalapuram, Coimbatore, Tamil Nadu 641018, India',
        name: 'Race Course Residence',
        street: 'Race Course Road',
        locality: 'Gopalapuram',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        country: 'India',
        postalCode: '641018',
        source: 'SAVED_LOCATION',
        selectedAt: new Date().toISOString(),
      },
    },
    {
      id: 'saved-work-1',
      name: 'TIDEL Park IT SEZ',
      type: 'work',
      location: {
        latitude: 11.0264,
        longitude: 77.0142,
        accuracy: 20,
        formattedAddress: 'TIDEL Park Coimbatore, Civil Aerodrome Post, Coimbatore, Tamil Nadu 641014, India',
        name: 'TIDEL Park Coimbatore',
        street: 'Avinashi Road',
        locality: 'Peelamedu',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        country: 'India',
        postalCode: '641014',
        source: 'SAVED_LOCATION',
        selectedAt: new Date().toISOString(),
      },
    },
  ],
  locationPermission: 'prompt',
  isLocationModalOpen: false,
  isAuthGateOpen: false,

  setSelectedLocation: (loc: CivicLocation) => {
    localStorage.setItem('cp_selected_location', JSON.stringify(loc));
    set({ selectedLocation: loc });
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
  closeAuthGate: () => set({ isAuthGateOpen: false, authGateMessage: undefined, authGateRedirectUrl: undefined }),

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
        set({ selectedLocation: JSON.parse(stored) });
        return;
      } catch {}
    }
  },
}));
