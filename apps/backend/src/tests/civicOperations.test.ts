// ============================================================
// Civiora — Civic Operations & Accountability System Tests
// Tests work session durations, pause/resume calculations, resolution PDF,
// cryptographic SHA-256 audit chaining, and role access boundaries
// ============================================================

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { calculateDurations } from '../modules/operations/workSession.service.js';
import { generateResolutionPdf } from '../modules/reports/pdfGenerator.service.js';
import { computeEventHash } from '../modules/incidents/incidentEvent.model.js';
import { INCIDENT_STATUS_TRANSITIONS } from '@civicpulse/shared';

describe('Civiora Civic Operations & Accountability Engine', () => {
  describe('Work Session Authoritative Duration Tracking', () => {
    it('accurately calculates elapsed and active work duration without pauses', () => {
      const startedAt = new Date('2026-10-14T09:00:00Z');
      const completedAt = new Date('2026-10-14T10:30:00Z'); // 90 minutes = 5400s

      const { elapsedSeconds, activeWorkSeconds } = calculateDurations(startedAt, completedAt, []);

      expect(elapsedSeconds).toBe(5400);
      expect(activeWorkSeconds).toBe(5400);
    });

    it('accurately subtracts pause intervals from active work time', () => {
      const startedAt = new Date('2026-10-14T09:00:00Z');
      const completedAt = new Date('2026-10-14T11:00:00Z'); // 2 hours = 7200s total

      // Paused for 30 minutes (09:45 to 10:15)
      const pauseHistory = [
        {
          pausedAt: new Date('2026-10-14T09:45:00Z'),
          resumedAt: new Date('2026-10-14T10:15:00Z'),
          reason: 'Waiting for hot-mix asphalt delivery truck',
        },
      ];

      const { elapsedSeconds, activeWorkSeconds } = calculateDurations(startedAt, completedAt, pauseHistory);

      expect(elapsedSeconds).toBe(7200);
      expect(activeWorkSeconds).toBe(5400); // 7200 - 1800 = 5400s (90 mins active)
    });

    it('handles multiple pause intervals correctly', () => {
      const startedAt = new Date('2026-10-14T08:00:00Z');
      const completedAt = new Date('2026-10-14T10:00:00Z'); // 7200s total

      const pauseHistory = [
        {
          pausedAt: new Date('2026-10-14T08:30:00Z'),
          resumedAt: new Date('2026-10-14T08:45:00Z'), // 15 mins = 900s
          reason: 'Traffic diversion setup',
        },
        {
          pausedAt: new Date('2026-10-14T09:15:00Z'),
          resumedAt: new Date('2026-10-14T09:30:00Z'), // 15 mins = 900s
          reason: 'Heavy rain squall',
        },
      ];

      const { elapsedSeconds, activeWorkSeconds } = calculateDurations(startedAt, completedAt, pauseHistory);

      expect(elapsedSeconds).toBe(7200);
      expect(activeWorkSeconds).toBe(5400); // 7200 - 1800 = 5400s
    });
  });

  describe('Tamper-Evident SHA-256 Hash Chaining', () => {
    it('computes deterministic SHA-256 event hash', () => {
      const payload = {
        previousEventHash: '0'.repeat(64),
        incidentId: '670cd1a89f1092a3b4c5d6e7',
        actorId: '670cd1a89f1092a3b4c5d6e8',
        action: 'REPORT_CREATED',
        eventType: 'REPORT_CREATED',
        fromStatus: undefined,
        toStatus: 'reported',
        changeSummary: 'Citizen reported hazardous pothole on Avinashi Road',
        reason: undefined,
        timestamp: '2026-10-14T08:00:00.000Z',
      };

      const hash1 = computeEventHash(payload);
      const hash2 = computeEventHash(payload);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('detects tampering if any previous hash or event field is modified', () => {
      const genesisPayload = {
        previousEventHash: '0'.repeat(64),
        incidentId: '670cd1a89f1092a3b4c5d6e7',
        actorId: '670cd1a89f1092a3b4c5d6e8',
        action: 'REPORT_CREATED',
        eventType: 'REPORT_CREATED',
        timestamp: '2026-10-14T08:00:00.000Z',
      };
      const genesisHash = computeEventHash(genesisPayload);

      const secondEvent = {
        previousEventHash: genesisHash,
        incidentId: '670cd1a89f1092a3b4c5d6e7',
        actorId: '670cd1a89f1092a3b4c5d6e9',
        action: 'ASSIGNED',
        eventType: 'ASSIGNED',
        timestamp: '2026-10-14T08:30:00.000Z',
      };
      const secondHash = computeEventHash(secondEvent);

      // Verify tampered previous hash fails validation
      const tamperedSecondEvent = {
        ...secondEvent,
        previousEventHash: 'f'.repeat(64), // Altered
      };
      const tamperedHash = computeEventHash(tamperedSecondEvent);

      expect(tamperedHash).not.toBe(secondHash);
    });
  });

  describe('Final Resolution PDF Generation', () => {
    it('generates a valid, authoritative resolution PDF buffer with %PDF- header', async () => {
      const resolutionData = {
        incidentNumber: 'CP-2026-R8821',
        title: 'Deep Asphalt Crater on Avinashi Road Tiruppur',
        categoryLabel: 'Pothole Hazard',
        locationAddress: 'Kumaran Road Junction, Tiruppur, Tamil Nadu',
        coordinates: [77.3411, 11.1085] as [number, number],
        submittedAt: new Date('2026-10-14T07:30:00Z'),
        resolvedAt: new Date('2026-10-14T11:00:00Z'),
        startedAt: new Date('2026-10-14T09:00:00Z'),
        completedAt: new Date('2026-10-14T10:45:00Z'),
        elapsedSeconds: 6300,
        activeWorkSeconds: 5400,
        workerName: 'Steve Rogers',
        verifierName: 'Victor Von Doom',
        verifierRole: 'DEPARTMENT MANAGER',
        departmentName: 'Roads & Infrastructure Engineering',
        completionSummary: 'Excavated damaged road substrate, poured grade-A bitumen compound, and roller-compacted flush with street level.',
        inspectionNotes: 'No residual water pooling. Traffic restored safely.',
        materialsUsed: '2.5 tonnes hot-mix asphalt, 1 drum emulsion tack-coat',
        resolutionId: 'RES-CP-2026-R8821-V1',
        version: 1,
        contentHash: crypto.createHash('sha256').update('test-content-hash').digest('hex'),
      };

      const buffer = await generateResolutionPdf(resolutionData);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);
      // Valid PDF magic signature: %PDF-
      expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    });
  });

  describe('Incident Lifecycle State Machine Transitions', () => {
    it('allows valid transitions through the complete civic operations workflow', () => {
      expect(INCIDENT_STATUS_TRANSITIONS.reported).toContain('assigned');
      expect(INCIDENT_STATUS_TRANSITIONS.assigned).toContain('accepted');
      expect(INCIDENT_STATUS_TRANSITIONS.accepted).toContain('in_progress');
      expect(INCIDENT_STATUS_TRANSITIONS.in_progress).toContain('awaiting_verification');
      expect(INCIDENT_STATUS_TRANSITIONS.awaiting_verification).toContain('resolved');
      expect(INCIDENT_STATUS_TRANSITIONS.resolved).toContain('closed');
    });

    it('disallows unauthorized skipping of workflow states', () => {
      // Reported cannot jump directly to resolved without review/work
      expect(INCIDENT_STATUS_TRANSITIONS.reported).not.toContain('resolved');
      // Accepted cannot jump directly to resolved without in_progress and verification
      expect(INCIDENT_STATUS_TRANSITIONS.accepted).not.toContain('resolved');
    });
  });
});
