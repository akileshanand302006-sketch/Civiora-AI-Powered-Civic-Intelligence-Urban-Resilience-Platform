// ============================================================
// Civiora Liquid Glass Hazard Classification Dropdown / Combobox
// Accessible, searchable, high-contrast civic taxonomy picker
// ============================================================

import React, { useState, useRef, useEffect, useId } from 'react';
import {
  ALL_INCIDENT_CATEGORIES,
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_CATEGORY_ICONS,
  INCIDENT_CATEGORY_COLORS,
  type IncidentCategory,
} from '@civicpulse/shared';

export interface GlassHazardDropdownProps {
  value: IncidentCategory | null | string;
  onChange: (category: IncidentCategory) => void;
  predictedCategory?: IncidentCategory | null;
  aiConfidence?: number | null;
  isUncertain?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
  id?: string;
  className?: string;
}

export const GlassHazardDropdown: React.FC<GlassHazardDropdownProps> = ({
  value,
  onChange,
  predictedCategory,
  aiConfidence,
  isUncertain = false,
  disabled = false,
  error,
  label = 'Hazard Classification',
  helperText,
  id,
  className = '',
}) => {
  const generatedId = useId();
  const dropdownId = id || `hazard-dropdown-${generatedId}`;
  const listboxId = `${dropdownId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter categories by search query
  const filteredCategories = ALL_INCIDENT_CATEGORIES.filter((cat) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const catLabel = (INCIDENT_CATEGORY_LABELS[cat] || cat).toLowerCase();
    const catId = cat.toLowerCase().replace(/_/g, ' ');
    return catLabel.includes(q) || catId.includes(q);
  });

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(-1);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Scroll active option into view
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, isOpen]);

  const handleSelect = (cat: IncidentCategory) => {
    onChange(cat);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < filteredCategories.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCategories.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredCategories.length) {
          const selected = filteredCategories[activeIndex];
          if (selected) {
            handleSelect(selected);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const currentCategory = value as IncidentCategory | null;
  const currentLabel = currentCategory
    ? INCIDENT_CATEGORY_LABELS[currentCategory] || currentCategory
    : 'Select or confirm hazard category...';
  const currentIcon = currentCategory
    ? INCIDENT_CATEGORY_ICONS[currentCategory] || 'bi-tag'
    : 'bi-grid-3x3-gap';
  const currentColor = currentCategory
    ? INCIDENT_CATEGORY_COLORS[currentCategory] || '#64D2FF'
    : '#8E8E93';

  const isAiSuggested = Boolean(
    predictedCategory && currentCategory && predictedCategory === currentCategory
  );

  return (
    <div
      ref={containerRef}
      className={`position-relative d-flex flex-column gap-1 ${className}`}
      onKeyDown={handleKeyDown}
      style={{ minWidth: '240px' }}
    >
      {/* Field Label */}
      {label && (
        <label
          htmlFor={dropdownId}
          className="form-label mb-1 d-flex align-items-center justify-content-between"
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--cp-text-secondary)',
            letterSpacing: '0.02em',
          }}
        >
          <span>{label}</span>
          {isAiSuggested && (
            <span
              className="badge d-inline-flex align-items-center gap-1 font-monospace"
              style={{
                fontSize: '0.68rem',
                background: 'rgba(100, 210, 255, 0.15)',
                color: '#64D2FF',
                border: '1px solid rgba(100, 210, 255, 0.35)',
                borderRadius: '6px',
                padding: '2px 6px',
              }}
            >
              <i className="bi bi-robot" /> AI MATCHED
              {typeof aiConfidence === 'number' && (
                <span>({Math.round(aiConfidence * 100)}%)</span>
              )}
            </span>
          )}
          {isUncertain && (
            <span
              className="badge d-inline-flex align-items-center gap-1"
              style={{
                fontSize: '0.68rem',
                background: 'rgba(255, 159, 10, 0.18)',
                color: '#FF9F0A',
                border: '1px solid rgba(255, 159, 10, 0.4)',
                borderRadius: '6px',
                padding: '2px 6px',
              }}
            >
              <i className="bi bi-question-diamond" /> CONFIRMATION NEEDED
            </span>
          )}
        </label>
      )}

      {/* Main Trigger Button */}
      <button
        ref={triggerRef}
        id={dropdownId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={label}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-100 d-flex align-items-center justify-content-between text-start"
        style={{
          minHeight: '46px',
          padding: '0.65rem 0.95rem',
          borderRadius: '14px',
          background: 'radial-gradient(110% 110% at 50% 0%, rgba(16, 35, 68, 0.72) 0%, rgba(8, 19, 38, 0.88) 100%)',
          backdropFilter: 'blur(30px) saturate(185%)',
          WebkitBackdropFilter: 'blur(30px) saturate(185%)',
          border: error
            ? '1px solid rgba(255, 69, 58, 0.75)'
            : isOpen
            ? '1px solid #64D2FF'
            : '1px solid rgba(100, 210, 255, 0.28)',
          boxShadow: isOpen
            ? '0 0 18px rgba(100, 210, 255, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
            : 'inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 4px 16px rgba(0, 0, 0, 0.35)',
          color: currentCategory ? 'var(--cp-text-primary, #FFFFFF)' : 'rgba(255, 255, 255, 0.55)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
          {/* Category Color Dot / Icon Pill */}
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: `${currentColor}22`,
              border: `1px solid ${currentColor}66`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: currentColor,
              fontSize: '0.9rem',
              flexShrink: 0,
            }}
          >
            <i className={`bi ${currentIcon}`} />
          </div>

          <div className="d-flex flex-column text-truncate">
            <span
              className="fw-semibold text-truncate"
              style={{
                fontSize: '0.92rem',
                color: currentCategory ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
              }}
            >
              {currentLabel}
            </span>
          </div>
        </div>

        {/* Chevron Icon */}
        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          <i
            className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`}
            style={{
              color: '#64D2FF',
              fontSize: '0.85rem',
              transition: 'transform 0.2s ease',
            }}
          />
        </div>
      </button>

      {/* Floating Liquid Glass Dropdown Menu */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 1060,
            borderRadius: '16px',
            background: 'radial-gradient(120% 120% at 50% 0%, rgba(18, 38, 72, 0.94) 0%, rgba(8, 18, 36, 0.98) 100%)',
            backdropFilter: 'blur(48px) saturate(210%)',
            WebkitBackdropFilter: 'blur(48px) saturate(210%)',
            border: '1px solid rgba(100, 210, 255, 0.35)',
            boxShadow: '0 20px 50px -8px rgba(0, 0, 0, 0.75), 0 0 24px rgba(100, 210, 255, 0.15), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.15)',
            padding: '8px',
            animation: 'fadeInSlideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Top Search Input Box */}
          <div className="position-relative mb-2 px-1 pt-1">
            <i
              className="bi bi-search position-absolute"
              style={{
                left: '18px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(100, 210, 255, 0.7)',
                fontSize: '0.82rem',
                pointerEvents: 'none',
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveIndex(-1);
              }}
              placeholder="Search 18 civic hazard categories..."
              className="form-control form-control-sm"
              style={{
                background: 'rgba(8, 16, 32, 0.75)',
                border: '1px solid rgba(100, 210, 255, 0.25)',
                borderRadius: '10px',
                color: '#FFFFFF',
                paddingLeft: '32px',
                paddingRight: searchQuery ? '30px' : '10px',
                fontSize: '0.84rem',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="btn btn-link btn-sm position-absolute text-secondary p-0"
                style={{
                  right: '18px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  textDecoration: 'none',
                }}
              >
                <i className="bi bi-x-circle-fill" style={{ fontSize: '0.85rem' }} />
              </button>
            )}
          </div>

          {/* Category List */}
          <div
            ref={listRef}
            style={{
              maxHeight: '280px',
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(100, 210, 255, 0.3) transparent',
            }}
          >
            {filteredCategories.length === 0 ? (
              <div
                className="text-center py-4 px-2"
                style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.82rem' }}
              >
                <i className="bi bi-search d-block mb-1" style={{ fontSize: '1.2rem' }} />
                No matching hazard categories found for "{searchQuery}".
              </div>
            ) : (
              filteredCategories.map((cat, idx) => {
                const labelText = INCIDENT_CATEGORY_LABELS[cat] || cat;
                const iconName = INCIDENT_CATEGORY_ICONS[cat] || 'bi-tag';
                const colorCode = INCIDENT_CATEGORY_COLORS[cat] || '#64D2FF';
                const isSelected = value === cat;
                const isItemAiSuggested = predictedCategory === cat;
                const isActive = activeIndex === idx;

                return (
                  <div
                    key={cat}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(cat)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      marginBottom: '2px',
                      cursor: 'pointer',
                      background: isSelected
                        ? 'rgba(10, 132, 255, 0.28)'
                        : isActive
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'transparent',
                      border: isSelected
                        ? '1px solid rgba(100, 210, 255, 0.5)'
                        : isActive
                        ? '1px solid rgba(255, 255, 255, 0.12)'
                        : '1px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div className="d-flex align-items-center gap-2 overflow-hidden">
                      {/* Icon Pill */}
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          background: `${colorCode}25`,
                          border: `1px solid ${colorCode}55`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: colorCode,
                          fontSize: '0.8rem',
                          flexShrink: 0,
                        }}
                      >
                        <i className={`bi ${iconName}`} />
                      </div>

                      <span
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.88)',
                        }}
                      >
                        {labelText}
                      </span>
                    </div>

                    <div className="d-flex align-items-center gap-1 flex-shrink-0">
                      {isItemAiSuggested && (
                        <span
                          className="badge font-monospace"
                          style={{
                            fontSize: '0.62rem',
                            background: 'rgba(100, 210, 255, 0.18)',
                            color: '#64D2FF',
                            border: '1px solid rgba(100, 210, 255, 0.35)',
                            padding: '2px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          AI SUGGESTION
                        </span>
                      )}
                      {isSelected && (
                        <i
                          className="bi bi-check2-circle text-primary"
                          style={{ fontSize: '1rem', color: '#64D2FF' }}
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Helper / Error Text */}
      {error ? (
        <span style={{ fontSize: '0.78rem', color: '#FF453A' }}>
          <i className="bi bi-exclamation-circle me-1" />
          {error}
        </span>
      ) : helperText ? (
        <span style={{ fontSize: '0.76rem', color: 'var(--cp-text-tertiary, rgba(255, 255, 255, 0.5))' }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
};
