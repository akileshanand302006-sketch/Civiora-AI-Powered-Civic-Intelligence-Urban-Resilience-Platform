// ============================================================
// Auth Store (Zustand)
// ============================================================

import { create } from 'zustand';
import { api } from '../services/api';
import type { User } from '@civicpulse/shared';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User, token: string, refreshToken?: string) => void;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: (userData: User, token: string, refreshToken?: string) => {
    localStorage.setItem('cp_access_token', token);
    if (refreshToken) {
      localStorage.setItem('cp_refresh_token', refreshToken);
    }
    localStorage.setItem('cp_user', JSON.stringify(userData));
    set({ user: userData, token, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('cp_refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } finally {
      localStorage.removeItem('cp_access_token');
      localStorage.removeItem('cp_refresh_token');
      localStorage.removeItem('cp_user');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (userData: Partial<User>) => {
    const current = get().user;
    if (current) {
      const updated = { ...current, ...userData };
      localStorage.setItem('cp_user', JSON.stringify(updated));
      set({ user: updated });
    }
  },

  initialize: async () => {
    const token = localStorage.getItem('cp_access_token');
    const storedUser = localStorage.getItem('cp_user');

    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser) as User;
        set({ user, token, isAuthenticated: true, isLoading: false });

        // Verify with backend
        const res = await api.get('/users/me');
        if (res.data?.data) {
          set({ user: res.data.data });
          localStorage.setItem('cp_user', JSON.stringify(res.data.data));
        }
      } catch {
        localStorage.removeItem('cp_access_token');
        localStorage.removeItem('cp_refresh_token');
        localStorage.removeItem('cp_user');
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
