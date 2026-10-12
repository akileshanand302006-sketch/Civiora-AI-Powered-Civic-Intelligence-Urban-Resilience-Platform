// ============================================================
// Theme Store (Zustand)
// ============================================================

import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

function resolve(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialTheme: Theme =
    (typeof localStorage !== 'undefined' && (localStorage.getItem('civicpulse-theme') as Theme)) || 'dark';
  const initialResolved = resolve(initialTheme);

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', initialResolved);
  }

  return {
    theme: initialTheme,
    resolvedTheme: initialResolved,
    setTheme: (theme: Theme) => {
      const resolved = resolve(theme);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('civicpulse-theme', theme);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', resolved);
      }
      set({ theme, resolvedTheme: resolved });
    },
    toggleTheme: () => {
      const current = get().resolvedTheme;
      const next = current === 'dark' ? 'light' : 'dark';
      get().setTheme(next);
    },
  };
});
