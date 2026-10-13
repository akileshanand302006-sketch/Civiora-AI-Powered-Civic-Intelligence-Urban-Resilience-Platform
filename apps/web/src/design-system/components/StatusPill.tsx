import React from 'react';
import {
  INCIDENT_STATUS_LABELS,
  type IncidentStatus,
} from '@civicpulse/shared';

export interface StatusPillProps {
  status: IncidentStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  IncidentStatus,
  { bg: string; text: string; border: string; pulse?: boolean }
> = {
  reported: {
    bg: 'rgba(100, 210, 255, 0.12)',
    text: '#64D2FF',
    border: 'rgba(100, 210, 255, 0.3)',
    pulse: true,
  },
  verified: {
    bg: 'rgba(191, 90, 242, 0.12)',
    text: '#BF5AF2',
    border: 'rgba(191, 90, 242, 0.3)',
  },
  triaged: {
    bg: 'rgba(255, 159, 10, 0.12)',
    text: '#FF9F0A',
    border: 'rgba(255, 159, 10, 0.3)',
  },
  assigned: {
    bg: 'rgba(10, 132, 255, 0.12)',
    text: '#0A84FF',
    border: 'rgba(10, 132, 255, 0.3)',
  },
  accepted: {
    bg: 'rgba(100, 210, 255, 0.15)',
    text: '#64D2FF',
    border: 'rgba(100, 210, 255, 0.4)',
  },
  in_progress: {
    bg: 'rgba(255, 214, 10, 0.15)',
    text: '#FFD60A',
    border: 'rgba(255, 214, 10, 0.4)',
    pulse: true,
  },
  awaiting_verification: {
    bg: 'rgba(255, 159, 10, 0.15)',
    text: '#FF9F0A',
    border: 'rgba(255, 159, 10, 0.4)',
    pulse: true,
  },
  evidence_submitted: {
    bg: 'rgba(48, 209, 88, 0.12)',
    text: '#30D158',
    border: 'rgba(48, 209, 88, 0.3)',
  },
  resolved: {
    bg: 'rgba(48, 209, 88, 0.15)',
    text: '#30D158',
    border: 'rgba(48, 209, 88, 0.4)',
  },
  closed: {
    bg: 'rgba(142, 142, 147, 0.15)',
    text: '#8E8E93',
    border: 'rgba(142, 142, 147, 0.3)',
  },
  rejected: {
    bg: 'rgba(255, 69, 58, 0.12)',
    text: '#FF453A',
    border: 'rgba(255, 69, 58, 0.3)',
  },
  reopened: {
    bg: 'rgba(255, 69, 58, 0.15)',
    text: '#FF453A',
    border: 'rgba(255, 69, 58, 0.4)',
    pulse: true,
  },
};

export const StatusPill: React.FC<StatusPillProps> = ({ status, size = 'md' }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.reported;
  const label = INCIDENT_STATUS_LABELS[status] || status;

  return (
    <span
      className="glass-badge"
      style={{
        backgroundColor: config.bg,
        color: config.text,
        borderColor: config.border,
        padding: size === 'sm' ? '0.15rem 0.5rem' : '0.3rem 0.75rem',
        fontSize: size === 'sm' ? '0.7rem' : '0.8rem',
      }}
    >
      <span
        style={{
          width: size === 'sm' ? '5px' : '6px',
          height: size === 'sm' ? '5px' : '6px',
          borderRadius: '50%',
          backgroundColor: config.text,
          display: 'inline-block',
        }}
        className={config.pulse ? 'animate-pulse-glow' : undefined}
      />
      {label}
    </span>
  );
};
