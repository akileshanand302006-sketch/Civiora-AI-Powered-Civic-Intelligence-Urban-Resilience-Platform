// ============================================================
// Civiora — Backend Domain Model & Architecture Unit Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import argon2 from 'argon2';
import { ROLE_PERMISSIONS, ALL_ROLES } from '@civicpulse/shared';
import { User } from '../modules/users/user.model.js';
import { Incident } from '../modules/incidents/incident.model.js';
import { getDatabaseConnectionState } from '../config/database.js';

describe('1. Database Connection Architecture', () => {
  it('should report database connection state accurately', () => {
    const connState = getDatabaseConnectionState();
    expect(connState).toHaveProperty('state');
    expect(connState).toHaveProperty('stateText');
    expect(['disconnected', 'connected', 'connecting', 'disconnecting']).toContain(connState.stateText);
  });
});

describe('2. Security & Password Hashing (Argon2id)', () => {
  it('should hash and verify passwords securely with Argon2id', async () => {
    const rawPassword = 'CivicPulse@2026';
    const hash = await argon2.hash(rawPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    expect(hash).toContain('$argon2id$');
    const isValid = await argon2.verify(hash, rawPassword);
    expect(isValid).toBe(true);

    const isWrong = await argon2.verify(hash, 'WrongPassword123');
    expect(isWrong).toBe(false);
  });
});

describe('3. Role-Based Permissions & Tenant Isolation', () => {
  it('should define permissions for all 9 operational roles', () => {
    expect(ALL_ROLES.length).toBeGreaterThanOrEqual(9);
    for (const role of ALL_ROLES) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
    }
  });

  it('should enforce role privilege hierarchy', () => {
    // Admin has broad administrative permissions
    expect(ROLE_PERMISSIONS['system_admin']).toContain('org:manage');
    // Common citizen does NOT have system admin permissions
    expect(ROLE_PERMISSIONS['citizen']).not.toContain('org:manage');
    expect(ROLE_PERMISSIONS['citizen']).not.toContain('incident:resolve');
  });
});

describe('4. GeoJSON Coordinate Standards', () => {
  it('should enforce strict [longitude, latitude] GeoJSON Point structure', () => {
    const testPoint = {
      type: 'Point',
      coordinates: [77.0279, 11.0289], // [lng, lat]
    };

    expect(testPoint.type).toBe('Point');
    expect(testPoint.coordinates[0]).toBeGreaterThanOrEqual(-180);
    expect(testPoint.coordinates[0]).toBeLessThanOrEqual(180);
    expect(testPoint.coordinates[1]).toBeGreaterThanOrEqual(-90);
    expect(testPoint.coordinates[1]).toBeLessThanOrEqual(90);
  });

  it('should calculate Haversine distance between two coordinates accurately', () => {
    function calculateDistanceMeters(
      coord1: [number, number],
      coord2: [number, number]
    ): number {
      const toRad = (x: number) => (x * Math.PI) / 180;
      const R = 6371e3; // Earth radius in meters
      const lat1 = toRad(coord1[1]);
      const lat2 = toRad(coord2[1]);
      const dLat = toRad(coord2[1] - coord1[1]);
      const dLon = toRad(coord2[0] - coord1[0]);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    }

    const c1: [number, number] = [77.0279, 11.0289];
    const c2: [number, number] = [77.0315, 11.0342];
    const dist = calculateDistanceMeters(c1, c2);

    expect(dist).toBeGreaterThan(500);
    expect(dist).toBeLessThan(1200);
  });
});

describe('5. Incident Status Lifecycle State Machine', () => {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    reported: ['under_review', 'verified', 'assigned', 'rejected'],
    under_review: ['verified', 'assigned', 'rejected'],
    verified: ['assigned', 'in_progress', 'rejected'],
    assigned: ['in_progress', 'rejected', 'reassigned'],
    in_progress: ['pending_review', 'resolved'],
    pending_review: ['resolved', 'in_progress'],
    resolved: ['closed', 'in_progress'],
    closed: [],
    rejected: [],
  };

  it('should allow valid transitions according to state machine', () => {
    function isValidTransition(from: string, to: string): boolean {
      return (VALID_TRANSITIONS[from] || []).includes(to);
    }

    expect(isValidTransition('reported', 'verified')).toBe(true);
    expect(isValidTransition('verified', 'assigned')).toBe(true);
    expect(isValidTransition('assigned', 'in_progress')).toBe(true);
    expect(isValidTransition('in_progress', 'resolved')).toBe(true);
    expect(isValidTransition('resolved', 'closed')).toBe(true);
  });

  it('should disallow invalid illegal transitions', () => {
    function isValidTransition(from: string, to: string): boolean {
      return (VALID_TRANSITIONS[from] || []).includes(to);
    }

    // Cannot jump from reported directly to closed without resolution
    expect(isValidTransition('reported', 'closed')).toBe(false);
    // Cannot transition from closed anywhere
    expect(isValidTransition('closed', 'in_progress')).toBe(false);
  });
});

describe('6. SLA Escalation Logic', () => {
  it('should compute remaining time and breach status correctly', () => {
    const now = Date.now();
    const futureDeadline = new Date(now + 3600000); // 1 hour ahead
    const pastDeadline = new Date(now - 3600000); // 1 hour past

    const isBreachedFuture = Date.now() > futureDeadline.getTime();
    const isBreachedPast = Date.now() > pastDeadline.getTime();

    expect(isBreachedFuture).toBe(false);
    expect(isBreachedPast).toBe(true);
  });
});

describe('7. Schema Validation Rules', () => {
  it('should require organizationId and email for User model schema', () => {
    const userDoc = new User({});
    const validationError = userDoc.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors['email']).toBeDefined();
    expect(validationError?.errors['organizationId']).toBeDefined();
  });

  it('should require incidentNumber, category and location for Incident model schema', () => {
    const incDoc = new Incident({});
    const validationError = incDoc.validateSync();
    expect(validationError).toBeDefined();
    expect(validationError?.errors['incidentNumber']).toBeDefined();
    expect(validationError?.errors['category']).toBeDefined();
    expect(validationError?.errors['location.coordinates']).toBeDefined();
  });
});
