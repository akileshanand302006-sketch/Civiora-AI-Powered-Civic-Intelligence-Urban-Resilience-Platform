import React from 'react';
import { GlassPanel } from './GlassPanel';

export interface GlassMetricProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
  color?: string; // custom accent color
  subtitle?: string;
}

export const GlassMetric: React.FC<GlassMetricProps> = ({
  title,
  value,
  change,
  trend = 'neutral',
  icon,
  color = 'var(--cp-accent-primary)',
  subtitle,
}) => {
  const trendColor =
    trend === 'up'
      ? 'var(--cp-accent-success)'
      : trend === 'down'
      ? 'var(--cp-accent-danger)'
      : 'var(--cp-text-secondary)';

  const trendIcon = trend === 'up' ? 'arrow-up-right' : trend === 'down' ? 'arrow-down-right' : 'dash';

  return (
    <GlassPanel className="p-3 d-flex flex-column justify-content-between h-100">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span style={{ fontSize: '0.825rem', color: 'var(--cp-text-secondary)', fontWeight: 500 }}>
          {title}
        </span>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
          }}
        >
          <i className={`bi bi-${icon}`} />
        </div>
      </div>

      <div className="d-flex align-items-baseline gap-2 mb-1">
        <span style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          {value}
        </span>
        {change && (
          <span
            style={{
              fontSize: '0.75rem',
              color: trendColor,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <i className={`bi bi-${trendIcon}`} />
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <span style={{ fontSize: '0.75rem', color: 'var(--cp-text-tertiary)' }}>{subtitle}</span>
      )}
    </GlassPanel>
  );
};
