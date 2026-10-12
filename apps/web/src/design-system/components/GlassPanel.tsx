import React from 'react';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'interactive';
  glow?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  variant = 'default',
  glow = false,
  className = '',
  children,
  ...props
}) => {
  const variantClass =
    variant === 'interactive'
      ? 'glass-panel-interactive'
      : variant === 'subtle'
      ? 'glass-panel-subtle'
      : 'glass-panel';

  const glowStyle = glow
    ? {
        boxShadow: '0 0 30px var(--cp-ambient-glow), 0 0 0 1px var(--cp-accent-primary-border)',
      }
    : undefined;

  return (
    <div
      className={`${variantClass} ${className}`}
      style={{ ...glowStyle, ...props.style }}
      {...props}
    >
      {children}
    </div>
  );
};
