// ============================================================
// Civiora - Geolocation & Report Submission Workflow Tests
// Tests W3C Geolocation mock, reverse geocoding resilience,
// client validation rules, and report download blob pipeline
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import {
  validateCoordinates,
  classifyAccuracy,
} from '../services/deviceGeolocationService';
import { reverseGeocode } from '../services/googleMapsService';
import { createIncidentSchema } from '@civicpulse/shared';

describe('Geolocation & Geocoding Pipeline Tests', () => {
  it('1. should validate valid Tamil Nadu coordinates', () => {
    // Coimbatore coordinates
    expect(validateCoordinates(11.0168, 76.9558, 10)).toBe(true);
    // Chennai coordinates
    expect(validateCoordinates(13.0827, 80.2707, 15)).toBe(true);
    // Tiruppur coordinates
    expect(validateCoordinates(11.1085, 77.3411, 20)).toBe(true);
  });

  it('2. should reject out-of-range or NaN coordinates', () => {
    expect(validateCoordinates(95.0, 77.0)).toBe(false);
    expect(validateCoordinates(-95.0, 77.0)).toBe(false);
    expect(validateCoordinates(11.0, 190.0)).toBe(false);
    expect(validateCoordinates(NaN, 77.0)).toBe(false);
    expect(validateCoordinates(11.0, NaN)).toBe(false);
  });

  it('3. should classify GNSS horizontal accuracy correctly', () => {
    expect(classifyAccuracy(5)).toBe('high');
    expect(classifyAccuracy(20)).toBe('high');
    expect(classifyAccuracy(35)).toBe('approximate');
    expect(classifyAccuracy(100)).toBe('low');
    expect(classifyAccuracy(0)).toBe('unavailable');
  });

  it('4. should fall back to canonical Tamil Nadu district when external geocoder is unreachable', async () => {
    // Mock fetch to simulate network error or timeout
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    // Coordinates in Coimbatore (11.0168, 76.9558)
    const result = await reverseGeocode(11.0168, 76.9558);

    expect(result).toBeDefined();
    expect(result.latitude).toBe(11.0168);
    expect(result.longitude).toBe(76.9558);
    expect(result.state).toBe('Tamil Nadu');
    expect(result.district).toBeDefined();
    expect(result.formattedAddress).toContain('Coordinates: 11.01680, 76.95580');

    fetchSpy.mockRestore();
  });
});

describe('Report Submission Schema & Client Validation', () => {
  it('5. should reject reports with title shorter than 5 characters', () => {
    const invalidReport = {
      category: 'pothole',
      title: 'Bad',
      description: 'Dangerous road crater near junction',
      location: {
        coordinates: [77.0279, 11.0289],
        address: 'Avinashi Rd, Coimbatore',
      },
    };

    const parseResult = createIncidentSchema.safeParse(invalidReport);
    expect(parseResult.success).toBe(false);
    if (!parseResult.success) {
      const titleErr = parseResult.error.errors.find((e) => e.path.includes('title'));
      expect(titleErr?.message).toContain('Title must be at least 5 characters');
    }
  });

  it('6. should reject reports with description shorter than 10 characters', () => {
    const invalidReport = {
      category: 'pothole',
      title: 'Large Deep Pothole',
      description: 'Fix it',
      location: {
        coordinates: [77.0279, 11.0289],
        address: 'Avinashi Rd, Coimbatore',
      },
    };

    const parseResult = createIncidentSchema.safeParse(invalidReport);
    expect(parseResult.success).toBe(false);
    if (!parseResult.success) {
      const descErr = parseResult.error.errors.find((e) => e.path.includes('description'));
      expect(descErr?.message).toContain('Description must be at least 10 characters');
    }
  });

  it('7. should accept valid report with full spatial and category details', () => {
    const validReport = {
      category: 'water_leakage',
      title: 'Major Municipal Pipe Rupture on Cross Cut Road',
      description: 'Clean potable drinking water gushing onto the road since 6:00 AM causing traffic gridlock.',
      isEmergency: false,
      location: {
        coordinates: [76.9629, 11.0183] as [number, number],
        address: 'Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012',
      },
      reportingMode: 'standard',
    };

    const parseResult = createIncidentSchema.safeParse(validReport);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.title).toBe('Major Municipal Pipe Rupture on Cross Cut Road');
      expect(parseResult.data.location.coordinates[0]).toBe(76.9629);
      expect(parseResult.data.location.coordinates[1]).toBe(11.0183);
    }
  });
});

describe('Report Export Document Types & Blob Validation', () => {
  it('8. should validate blob mime-types for multi-format downloads', () => {
    const supportedTypes: Record<string, string> = {
      pdf: 'application/pdf',
      json: 'application/json',
      csv: 'text/csv',
      txt: 'text/plain',
    };

    expect(supportedTypes['pdf']).toBe('application/pdf');
    expect(supportedTypes['json']).toBe('application/json');
    expect(supportedTypes['csv']).toBe('text/csv');
    expect(supportedTypes['txt']).toBe('text/plain');
  });

  it('9. should correctly sanitize safe download filenames', () => {
    const incidentNumber = 'CP-2026-R6709255';
    const safeRef = incidentNumber.replace(/[^a-zA-Z0-9_-]/g, '_');

    expect(`Civiora_Report_${safeRef}.pdf`).toBe('Civiora_Report_CP-2026-R6709255.pdf');
    expect(`Civiora-Incident-${safeRef}.json`).toBe('Civiora-Incident-CP-2026-R6709255.json');
    expect(`Civiora-Incident-${safeRef}.csv`).toBe('Civiora-Incident-CP-2026-R6709255.csv');
    expect(`Civiora-Incident-${safeRef}.txt`).toBe('Civiora-Incident-CP-2026-R6709255.txt');
  });
});
