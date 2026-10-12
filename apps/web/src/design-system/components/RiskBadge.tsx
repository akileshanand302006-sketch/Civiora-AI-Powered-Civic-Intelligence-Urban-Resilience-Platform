import React from 'react';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  showScore?: boolean;
}

const RISK_CONFIG: Record<
  RiskLevel,
  { label: string; color: string; bg: string; border: string; glow?: boolean }
> = {
  low: {
    label: 'Low Risk',
    color: '#30D158',
    bg: 'rgba(48, 209, 88, 0.12)',
    border: 'rgba(48, 209, 88, 0.3)',
  },
  medium: {
    label: 'Medium Risk',
    color: '#FF9F0A',
    bg: 'rgba(255, 159, 10, 0.12)',
    border: 'rgba(255, 159, 10, 0.3)',
  },
  high: {
    label: 'High Risk',
    color: '#FF453A',
    bg: 'rgba(255, 69, 58, 0.12)',
    border: 'rgba(255, 69, 58, 0.35)',
    glow: true,
  },
  critical: {
    label: 'Critical Risk',
    color: '#FF3B30',
    bg: 'rgba(255, 59, 48, 0.2)',
    border: 'rgba(255, 59, 48, 0.6)',
    glow: true,
  },
};

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, showScore = true }) => {
  const config = RISK_CONFIG[level] || RISK_CONFIG.low;

  return (
    <span
      className={`glass-badge ${config.glow ? 'animate-pulse-glow' : ''}`}
      style={{
        backgroundColor: config.bg,
        color: config.color,
        borderColor: config.border,
      }}
    >
      <i className="bi bi-shield-fill-exclamation" />
      {config.label}
      {showScore && score !== undefined && (
        <span
          style={{
            marginLeft: '0.25rem',
            paddingLeft: '0.35rem',
            borderLeft: `1px solid ${config.border}`,
            fontWeight: 700,
          }}
        >
          {score}
        </span>
      )}
    </span>
  );
};
