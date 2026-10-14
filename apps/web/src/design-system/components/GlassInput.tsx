import React from 'react';

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: React.ReactNode;
  icon?: string;
  rightElement?: React.ReactNode;
  containerClassName?: string;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, error, helperText, icon, rightElement, containerClassName = '', className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={`d-flex flex-column gap-1 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="form-label mb-0"
            style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--cp-text-secondary)' }}
          >
            {label}
          </label>
        )}
        <div className="position-relative d-flex align-items-center">
          {icon && (
            <i
              className={`bi bi-${icon} position-absolute`}
              style={{
                left: '1rem',
                color: 'var(--cp-text-tertiary)',
                pointerEvents: 'none',
              }}
            />
          )}
          <input
            ref={ref}
            id={inputId}
            className={`glass-input w-100 ${className}`}
            style={{
              paddingLeft: icon ? '2.5rem' : '1rem',
              paddingRight: rightElement ? '2.75rem' : '1rem',
              borderColor: error ? 'var(--cp-accent-danger)' : undefined,
              ...props.style,
            }}
            {...props}
          />
          {rightElement && (
            <div
              className="position-absolute d-flex align-items-center"
              style={{ right: '0.75rem', zIndex: 5 }}
            >
              {rightElement}
            </div>
          )}
        </div>
        {error ? (
          <span style={{ fontSize: '0.75rem', color: 'var(--cp-accent-danger)' }}>{error}</span>
        ) : helperText ? (
          <span style={{ fontSize: '0.75rem', color: 'var(--cp-text-tertiary)' }}>{helperText}</span>
        ) : null}
      </div>
    );
  },
);

GlassInput.displayName = 'GlassInput';
