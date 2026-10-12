// ============================================================
// Civiora Apple-Inspired Glass Segmented Control
// Fluid capsule track with sliding indicator & ice glow
// ============================================================

import React from 'react';

export interface SegmentedOption<T extends string = string> {
  id?: T;
  value?: T;
  label: string;
  icon?: string;
  badge?: string;
}

export interface GlassSegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function GlassSegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: GlassSegmentedControlProps<T>): React.ReactElement {
  return (
    <div
      className={`glass-segmented ${className}`}
      role="tablist"
      style={{
        padding: size === 'sm' ? '3px' : '4px',
      }}
    >
      {options.map((opt) => {
        const optValue = (opt.value ?? opt.id) as T;
        const isActive = optValue === value;
        return (
          <button
            key={optValue}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(optValue)}
            className={`segmented-item ${isActive ? 'active' : ''}`}
            style={{
              padding:
                size === 'sm'
                  ? '0.3rem 0.85rem'
                  : size === 'lg'
                  ? '0.6rem 1.6rem'
                  : '0.45rem 1.25rem',
              fontSize: size === 'sm' ? '0.78rem' : size === 'lg' ? '0.92rem' : '0.84rem',
            }}
          >
            {opt.icon && <i className={`bi bi-${opt.icon}`} style={{ fontSize: '0.9em' }} />}
            <span>{opt.label}</span>
            {opt.badge && (
              <span
                style={{
                  fontSize: '0.7em',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(159, 201, 255, 0.15)',
                  color: isActive ? '#FFFFFF' : 'var(--cp-accent-ice)',
                  fontWeight: 'bold',
                }}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default GlassSegmentedControl;
