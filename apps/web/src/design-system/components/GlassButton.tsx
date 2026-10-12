import React from 'react';

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'ice' | 'icon';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  pill?: boolean;
  glow?: boolean;
  loading?: boolean;
  icon?: string; // bootstrap icon class name without 'bi '
  iconRight?: string;
  children?: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'primary',
  size = 'md',
  pill = true,
  glow = false,
  loading = false,
  icon,
  iconRight,
  children,
  className = '',
  disabled,
  style,
  ...props
}) => {
  const sizeMap: Record<string, React.CSSProperties> = {
    xs: { padding: '0.25rem 0.65rem', fontSize: '0.75rem', borderRadius: pill ? '999px' : '10px' },
    sm: { padding: '0.4rem 0.95rem', fontSize: '0.82rem', borderRadius: pill ? '999px' : '12px' },
    md: { padding: '0.65rem 1.35rem', fontSize: '0.92rem', borderRadius: pill ? '999px' : '16px' },
    lg: { padding: '0.85rem 1.85rem', fontSize: '1.05rem', borderRadius: pill ? '999px' : '20px' },
    xl: { padding: '1rem 2.2rem', fontSize: '1.15rem', borderRadius: pill ? '999px' : '24px', letterSpacing: '-0.01em' },
  };
  const sizeStyles: React.CSSProperties = sizeMap[size] || { padding: '0.65rem 1.35rem', fontSize: '0.92rem' };

  let variantStyle: React.CSSProperties = {};

  if (variant === 'primary') {
    variantStyle = {
      background: 'radial-gradient(100% 100% at 50% 0%, #6392DF 0%, #375994 100%)',
      color: '#FFFFFF',
      border: '1px solid rgba(159, 201, 255, 0.45)',
      boxShadow: glow
        ? 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.5), 0 0 24px rgba(82, 127, 199, 0.45), 0 8px 24px rgba(2, 6, 14, 0.6)'
        : 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.35), 0 6px 20px rgba(2, 6, 14, 0.5)',
    };
  } else if (variant === 'ice') {
    variantStyle = {
      background: 'radial-gradient(100% 100% at 50% 0%, rgba(159, 201, 255, 0.25) 0%, rgba(82, 127, 199, 0.15) 100%)',
      color: '#F3F6FC',
      border: '1px solid rgba(159, 201, 255, 0.4)',
      boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.4), 0 0 20px rgba(159, 201, 255, 0.25)',
    };
  } else if (variant === 'secondary') {
    variantStyle = {
      background: 'rgba(12, 25, 48, 0.55)',
      color: 'var(--cp-text-primary)',
      border: '1px solid var(--cp-glass-border)',
      boxShadow: 'inset 0 1px 0.5px 0 var(--cp-glass-specular-top), 0 4px 16px rgba(2, 6, 14, 0.4)',
    };
  } else if (variant === 'ghost') {
    variantStyle = {
      background: 'transparent',
      color: 'var(--cp-text-secondary)',
      border: '1px solid transparent',
    };
  } else if (variant === 'icon') {
    variantStyle = {
      width: size === 'sm' ? '34px' : size === 'lg' ? '48px' : '40px',
      height: size === 'sm' ? '34px' : size === 'lg' ? '48px' : '40px',
      padding: 0,
      borderRadius: '50%',
      background: 'radial-gradient(100% 100% at 50% 0%, rgba(20, 42, 80, 0.55) 0%, rgba(8, 19, 38, 0.75) 100%)',
      border: '1px solid var(--cp-glass-border)',
      color: 'var(--cp-text-primary)',
      boxShadow: 'inset 0 1px 1px 0 var(--cp-glass-specular-top)',
    };
  }

  return (
    <button
      className={`glass-button ${className}`}
      style={{
        ...sizeStyles,
        ...variantStyle,
        ...style,
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          className="spinner-border spinner-border-sm me-1"
          role="status"
          aria-hidden="true"
        />
      ) : icon ? (
        <i className={`bi bi-${icon}`} />
      ) : null}
      {children}
      {iconRight && !loading && (
        <i className={`bi bi-${iconRight} ms-1`} />
      )}
    </button>
  );
};

