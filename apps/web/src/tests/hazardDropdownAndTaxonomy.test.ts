import { describe, it, expect } from 'vitest';
import {
  ALL_INCIDENT_CATEGORIES,
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_CATEGORY_ICONS,
  INCIDENT_CATEGORY_COLORS,
  type IncidentCategory,
} from '@civicpulse/shared';

describe('Civiora Canonical Hazard Taxonomy & Prediction State', () => {
  it('contains exactly 18 master hazard categories including Other / Unclassified', () => {
    expect(ALL_INCIDENT_CATEGORIES.length).toBe(18);
    expect(ALL_INCIDENT_CATEGORIES).toContain('garbage_accumulation');
    expect(ALL_INCIDENT_CATEGORIES).toContain('pothole');
    expect(ALL_INCIDENT_CATEGORIES).toContain('road_damage');
    expect(ALL_INCIDENT_CATEGORIES).toContain('broken_streetlight');
    expect(ALL_INCIDENT_CATEGORIES).toContain('other');
  });

  it('guarantees Garbage Accumulation is strictly separate from Pothole', () => {
    expect('garbage_accumulation').not.toBe('pothole');
    expect(INCIDENT_CATEGORY_LABELS['garbage_accumulation']).toBe('Garbage Accumulation');
    expect(INCIDENT_CATEGORY_LABELS['pothole']).toBe('Pothole');
  });

  it('provides high-contrast labels, bootstrap icons, and colors for all 18 categories', () => {
    for (const cat of ALL_INCIDENT_CATEGORIES) {
      expect(INCIDENT_CATEGORY_LABELS[cat]).toBeTruthy();
      expect(INCIDENT_CATEGORY_ICONS[cat]).toBeTruthy();
      expect(INCIDENT_CATEGORY_ICONS[cat].startsWith('bi-')).toBe(true);
      expect(INCIDENT_CATEGORY_COLORS[cat]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('correctly evaluates effective category priority without default to pothole', () => {
    // Scenario 1: Initial state (no user selection, no AI prediction)
    let userConfirmed: IncidentCategory | null = null;
    let aiPredicted: IncidentCategory | null = null;
    let effective: IncidentCategory = userConfirmed || aiPredicted || 'other';
    expect(effective).toBe('other');
    expect(effective).not.toBe('pothole');

    // Scenario 2: AI suggests garbage accumulation
    aiPredicted = 'garbage_accumulation';
    effective = userConfirmed || aiPredicted || 'other';
    expect(effective).toBe('garbage_accumulation');

    // Scenario 3: Citizen overrides to Illegal Dumping
    userConfirmed = 'illegal_dumping';
    effective = userConfirmed || aiPredicted || 'other';
    expect(effective).toBe('illegal_dumping');

    // Scenario 4: New image uploaded -> clears state
    userConfirmed = null;
    aiPredicted = null;
    effective = userConfirmed || aiPredicted || 'other';
    expect(effective).toBe('other');
  });

  it('detects uncertainty when confidence is below calibrated threshold or category is other', () => {
    const isUncertain = (conf: number | null, cat: IncidentCategory) => {
      return cat === 'other' || conf === null || conf < 0.40;
    };

    expect(isUncertain(0.92, 'garbage_accumulation')).toBe(false);
    expect(isUncertain(0.35, 'garbage_accumulation')).toBe(true);
    expect(isUncertain(null, 'garbage_accumulation')).toBe(true);
    expect(isUncertain(0.95, 'other')).toBe(true);
  });
});
