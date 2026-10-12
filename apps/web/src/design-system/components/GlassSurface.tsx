import React from 'react';

export type GlassTier = 'ultra' | 'strong' | 'medium' | 'soft' | 'floating';
export type GlassDepth = 'flat' | 'subtle' | '3d';

export interface GlassSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  tier?: GlassTier;
  depth?: GlassDepth;
  glow?: boolean;
  glowColor?: string;
  specular?: boolean;
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  tier = 'medium',
  depth = 'subtle',
  glow = false,
  glowColor,
  specular = true,
  interactive = false,
  className = '',
  children,
  style,
  ...props
}) => {
  const tierClass = {
    ultra: 'glass-ultra',
    strong: 'glass-strong',
    medium: 'glass-medium',
    soft: 'glass-soft',
    floating: 'glass-floating',
  }[tier];

  const depthStyle: React.CSSProperties =
    depth === '3d'
      ? { boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 1.5px rgba(255, 255, 255, 0.2)' }
      : depth === 'subtle'
      ? { boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.12)' }
      : {};

  const customGlowStyle: React.CSSProperties = glow
    ? {
        boxShadow: `0 0 35px ${glowColor || 'var(--cp-ambient-glow)'}, 0 0 0 1px var(--cp-accent-primary-border)`,
      }
    : {};

  return (
    <div
      className={`${tierClass} ${interactive ? 'glass-floating' : ''} ${className}`}
      style={{ ...depthStyle, ...customGlowStyle, ...style }}
      {...props}
    >
      {children}
    </div>
  );
};
