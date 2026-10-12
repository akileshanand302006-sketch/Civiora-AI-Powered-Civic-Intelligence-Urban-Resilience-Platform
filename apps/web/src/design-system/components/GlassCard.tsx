import React, { useRef, useState } from 'react';
import { GlassSurface, type GlassTier, type GlassDepth } from './GlassSurface';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tier?: GlassTier;
  depth?: GlassDepth;
  tilt?: boolean;
  glow?: boolean;
  stepNumber?: string;
  statusDot?: 'ice' | 'primary' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  tier = 'floating',
  depth = 'subtle',
  tilt = true,
  glow = false,
  stepNumber,
  statusDot,
  children,
  className = '',
  style,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;

    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`);
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.15,
    });
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)');
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transform,
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
      }}
    >
      <GlassSurface
        tier={tier}
        depth={depth}
        glow={glow}
        className={className}
        style={{
          borderRadius: '20px',
          overflow: 'hidden',
          ...style,
        }}
        {...props}
      >
        {/* Dynamic Specular Light Glare following cursor */}
        {tilt && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, ${glare.opacity}) 0%, transparent 60%)`,
              pointerEvents: 'none',
              transition: 'background 0.1s ease',
            }}
          />
        )}
        {(stepNumber || statusDot) && (
          <div className="d-flex justify-content-between align-items-center mb-3 position-relative" style={{ zIndex: 2 }}>
            {stepNumber ? (
              <span className="glass-step-num">{stepNumber}</span>
            ) : <span />}
            {statusDot && (
              <span className={`glass-status-dot dot-${statusDot}`} />
            )}
          </div>
        )}
        {children}
      </GlassSurface>
    </div>
  );
};
