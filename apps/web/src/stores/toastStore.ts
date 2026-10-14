// ============================================================
// Civiora — Global Notification Toast Store (Zustand)
// Dark Navy Liquid Glass in-app alerts, errors & telemetry feedback
// ============================================================

import { create } from 'zustand';
import {
  type NotificationType,
  type NotificationItem,
} from '../design-system/components/GlassNotificationCapsule';

interface ToastStore {
  toasts: NotificationItem[];
  addToast: (type: NotificationType, title: string, message?: string, durationMs?: number) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, title, message, durationMs = 5000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    set((state) => ({
      // Maximum 4 toasts stacked at once to maintain clean screen space
      toasts: [...state.toasts.slice(-3), { id, type, title, message, durationMs }],
    }));
    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearAll: () => set({ toasts: [] }),
}));

export const toast = {
  success: (title: string, message?: string, durationMs = 4500) =>
    useToastStore.getState().addToast('success', title, message, durationMs),
  error: (title: string, message?: string, durationMs = 6000) =>
    useToastStore.getState().addToast('error', title, message, durationMs),
  warning: (title: string, message?: string, durationMs = 5000) =>
    useToastStore.getState().addToast('warning', title, message, durationMs),
  info: (title: string, message?: string, durationMs = 4000) =>
    useToastStore.getState().addToast('info', title, message, durationMs),
  emergency: (title: string, message?: string, durationMs = 8000) =>
    useToastStore.getState().addToast('emergency', title, message, durationMs),
};
