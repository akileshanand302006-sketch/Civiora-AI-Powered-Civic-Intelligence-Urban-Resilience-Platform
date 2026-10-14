// ============================================================
// CivicPulse Floating Glass Notification Capsule
// ============================================================

import React, { useEffect, useState } from 'react';
import { GlassSurface } from './GlassSurface';

export type NotificationType = 'success' | 'error' | 'warning' | 'emergency' | 'info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  durationMs?: number;
}

export const GlassNotificationCapsule: React.FC<{
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}> = ({ notifications, onDismiss }) => {
  return (
    <div
      role="region"
      aria-label="Civiora System Notifications"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      }}
    >
      {notifications.map((n) => (
        <NotificationPill key={n.id} notification={n} onDismiss={() => onDismiss(n.id)} />
      ))}
    </div>
  );
};

const NotificationPill: React.FC<{
  notification: NotificationItem;
  onDismiss: () => void;
}> = ({ notification, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, notification.durationMs || 5000);

    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  const getDetails = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          icon: 'check-circle-fill',
          color: '#30D158',
          border: 'rgba(48, 209, 88, 0.4)',
        };
      case 'error':
        return {
          icon: 'x-circle-fill',
          color: '#FF453A',
          border: 'rgba(255, 69, 58, 0.5)',
        };
      case 'warning':
        return {
          icon: 'exclamation-triangle-fill',
          color: '#FF9F0A',
          border: 'rgba(255, 159, 10, 0.4)',
        };
      case 'emergency':
        return {
          icon: 'broadcast-pin',
          color: '#FF453A',
          border: 'rgba(255, 69, 58, 0.6)',
        };
      case 'info':
      default:
        return {
          icon: 'info-circle-fill',
          color: '#64D2FF',
          border: 'rgba(100, 210, 255, 0.4)',
        };
    }
  };

  const details = getDetails(notification.type);

  return (
    <div
      style={{
        pointerEvents: 'auto',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
        opacity: visible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        minWidth: '320px',
        maxWidth: '420px',
      }}
    >
      <GlassSurface
        tier="floating"
        depth="3d"
        glow={notification.type === 'emergency'}
        style={{
          borderRadius: '16px',
          borderColor: details.border,
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div className="p-3 d-flex align-items-center gap-3">
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: `rgba(${
                notification.type === 'emergency'
                  ? '255, 69, 58, 0.2'
                  : notification.type === 'success'
                  ? '48, 209, 88, 0.2'
                  : '10, 132, 255, 0.2'
              })`,
              color: details.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              flexShrink: 0,
            }}
          >
            <i className={`bi bi-${details.icon}`} />
          </div>
          <div className="flex-grow-1">
            <div className="fw-bold" style={{ fontSize: '0.9rem', color: 'var(--cp-text-primary)' }}>
              {notification.title}
            </div>
            {notification.message && (
              <div className="small text-secondary" style={{ fontSize: '0.78rem' }}>
                {notification.message}
              </div>
            )}
          </div>
          <button
            onClick={onDismiss}
            className="btn btn-sm btn-link text-secondary p-0"
            style={{ textDecoration: 'none' }}
          >
            <i className="bi bi-x fs-5" />
          </button>
        </div>
      </GlassSurface>
    </div>
  );
};

export default GlassNotificationCapsule;
