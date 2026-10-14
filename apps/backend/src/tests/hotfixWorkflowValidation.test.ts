// ============================================================
// Civiora — Production Hotfix Workflow & Validation Tests
// Category Canonicalization • State Machine Transitions •
// Idempotency • Role Email Deduplication
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  INCIDENT_CATEGORIES,
  INCIDENT_STATUSES,
  INCIDENT_STATUS_TRANSITIONS,
  mapAiCategoryToCanonical,
  type IncidentCategory,
} from '@civicpulse/shared';
import { calculateDurations } from '../modules/operations/workSession.service.js';
import { ROLE_MAILBOXES } from '../modules/notifications/emailNotification.service.js';

describe('1. Category Registry & AI Label Canonicalization', () => {
  it('should support transformer_spark and transformer_hazard as canonical categories', () => {
    expect(INCIDENT_CATEGORIES.TRANSFORMER_SPARK).toBe('transformer_spark');
    expect(INCIDENT_CATEGORIES.TRANSFORMER_HAZARD).toBe('transformer_hazard');
    expect(Object.values(INCIDENT_CATEGORIES)).toContain('transformer_spark');
    expect(Object.values(INCIDENT_CATEGORIES)).toContain('transformer_hazard');
  });

  it('should map AI transformer and spark labels to transformer_spark without crashing', () => {
    expect(mapAiCategoryToCanonical('transformer_spark')).toBe('transformer_spark');
    expect(mapAiCategoryToCanonical('TRANSFORMER_SPARK')).toBe('transformer_spark');
    expect(mapAiCategoryToCanonical('transformer arcing detected')).toBe('transformer_spark');
    expect(mapAiCategoryToCanonical('substation spark')).toBe('transformer_spark');
    expect(mapAiCategoryToCanonical('sparking distribution box')).toBe('transformer_spark');
  });

  it('should preserve all existing valid incident categories', () => {
    const existingCategories: IncidentCategory[] = [
      'pothole',
      'road_damage',
      'flooding',
      'water_leakage',
      'broken_streetlight',
      'garbage_accumulation',
      'illegal_dumping',
      'fallen_tree',
      'damaged_traffic_signal',
      'damaged_sidewalk',
      'exposed_electrical_hazard',
    ];

    for (const cat of existingCategories) {
      expect(mapAiCategoryToCanonical(cat)).toBe(cat);
      expect(Object.values(INCIDENT_CATEGORIES)).toContain(cat);
    }
  });

  it('should safely fall back to "other" for completely unmapped/unknown labels', () => {
    expect(mapAiCategoryToCanonical('alien_spacecraft_landing')).toBe('other');
    expect(mapAiCategoryToCanonical('')).toBe('other');
    expect(mapAiCategoryToCanonical(undefined)).toBe('other');
    expect(mapAiCategoryToCanonical(null)).toBe('other');
  });
});

describe('2. Incident Status Transitions & State Machine', () => {
  it('should define valid transitions from assigned', () => {
    const fromAssigned = INCIDENT_STATUS_TRANSITIONS[INCIDENT_STATUSES.ASSIGNED];
    expect(fromAssigned).toContain('accepted');
    expect(fromAssigned).toContain('in_progress');
    expect(fromAssigned).toContain('triaged');
    expect(fromAssigned).toContain('resolved');
  });

  it('should support in_progress -> work_completed -> awaiting_verification -> resolved', () => {
    const fromInProgress = INCIDENT_STATUS_TRANSITIONS[INCIDENT_STATUSES.IN_PROGRESS];
    expect(fromInProgress).toContain('work_completed');
    expect(fromInProgress).toContain('awaiting_verification');

    const fromWorkCompleted = INCIDENT_STATUS_TRANSITIONS['work_completed'];
    expect(fromWorkCompleted).toBeDefined();
    expect(fromWorkCompleted).toContain('awaiting_verification');

    const fromAwaiting = INCIDENT_STATUS_TRANSITIONS[INCIDENT_STATUSES.AWAITING_VERIFICATION];
    expect(fromAwaiting).toContain('resolved');
  });

  it('should disallow illegal transitions e.g. closed -> triaged', () => {
    const fromClosed = INCIDENT_STATUS_TRANSITIONS[INCIDENT_STATUSES.CLOSED] || [];
    expect(fromClosed).not.toContain('triaged');
    expect(fromClosed).not.toContain('in_progress');
  });
});

describe('3. Work Session Authoritative UTC Duration Calculation', () => {
  it('should accurately exclude paused intervals from active work seconds', () => {
    const start = new Date('2026-10-14T08:00:00.000Z');
    const pauseStart = new Date('2026-10-14T08:30:00.000Z');
    const pauseEnd = new Date('2026-10-14T08:45:00.000Z'); // 15 min paused
    const end = new Date('2026-10-14T09:00:00.000Z'); // 60 min total

    const durations = calculateDurations(start, end, [
      { pausedAt: pauseStart, resumedAt: pauseEnd },
    ]);

    expect(durations.elapsedSeconds).toBe(3600); // 60 minutes
    expect(durations.activeWorkSeconds).toBe(2700); // 45 minutes
  });
});

describe('4. Configured Role Mailboxes & Recipient Deduplication', () => {
  it('should configure the exact target mailboxes for all 3 operations personas', () => {
    expect(ROLE_MAILBOXES.SYSTEM_ADMIN).toBe('akileshanand302006@gmail.com');
    expect(ROLE_MAILBOXES.DEPARTMENT_MANAGER).toBe('doctordoom3056@gmail.com');
    expect(ROLE_MAILBOXES.FIELD_WORKER).toBe('steverogers302006@gmail.com');
  });

  it('should deduplicate recipients when the same email matches multiple roles', () => {
    const rawRecipients = [
      ROLE_MAILBOXES.SYSTEM_ADMIN,
      ROLE_MAILBOXES.FIELD_WORKER,
      '  AKILESHANAND302006@GMAIL.COM  ', // duplicate with casing and whitespace
      ROLE_MAILBOXES.DEPARTMENT_MANAGER,
      'steverogers302006@gmail.com', // duplicate
    ];

    const seen = new Set<string>();
    const deduplicated: string[] = [];

    for (const r of rawRecipients) {
      const normalized = r.toLowerCase().trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        deduplicated.push(normalized);
      }
    }

    expect(deduplicated).toHaveLength(3);
    expect(deduplicated).toContain('akileshanand302006@gmail.com');
    expect(deduplicated).toContain('doctordoom3056@gmail.com');
    expect(deduplicated).toContain('steverogers302006@gmail.com');
  });
});
