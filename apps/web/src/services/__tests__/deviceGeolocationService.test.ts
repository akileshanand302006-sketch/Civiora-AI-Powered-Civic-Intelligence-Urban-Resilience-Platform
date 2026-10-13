// ============================================================
// Unit Tests for Civiora Device Geolocation Service
// Coordinate Validation + Accuracy Classification + Error Pipeline
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  validateCoordinates,
  classifyAccuracy,
  GeolocationServiceError,
} from '../deviceGeolocationService';

describe('deviceGeolocationService', () => {
  describe('validateCoordinates', () => {
    it('should validate valid coordinates within Tamil Nadu and worldwide', () => {
      // Coimbatore coordinates
      expect(validateCoordinates(11.0289, 77.0279, 12)).toBe(true);
      // Chennai coordinates
      expect(validateCoordinates(13.0827, 80.2707, 8)).toBe(true);
      // Madurai coordinates
      expect(validateCoordinates(9.9252, 78.1198, 15)).toBe(true);
      // Boundary extremes
      expect(validateCoordinates(90, 180, 0)).toBe(true);
      expect(validateCoordinates(-90, -180, 5)).toBe(true);
    });

    it('should reject invalid or out-of-range latitude', () => {
      expect(validateCoordinates(91, 77.0279, 10)).toBe(false);
      expect(validateCoordinates(-90.1, 77.0279, 10)).toBe(false);
    });

    it('should reject invalid or out-of-range longitude', () => {
      expect(validateCoordinates(11.0289, 181, 10)).toBe(false);
      expect(validateCoordinates(11.0289, -180.5, 10)).toBe(false);
    });

    it('should reject NaN and Infinity coordinates', () => {
      expect(validateCoordinates(NaN, 77.0279, 10)).toBe(false);
      expect(validateCoordinates(11.0289, NaN, 10)).toBe(false);
      expect(validateCoordinates(Infinity, 77.0279, 10)).toBe(false);
      expect(validateCoordinates(11.0289, -Infinity, 10)).toBe(false);
    });

    it('should reject negative accuracy values', () => {
      expect(validateCoordinates(11.0289, 77.0279, -5)).toBe(false);
    });
  });

  describe('classifyAccuracy', () => {
    it('should classify high confidence GNSS / GPS locks (<= 20m)', () => {
      expect(classifyAccuracy(5)).toBe('high');
      expect(classifyAccuracy(12)).toBe('high');
      expect(classifyAccuracy(20)).toBe('high');
    });

    it('should classify approximate Wi-Fi triangulation (21m - 50m)', () => {
      expect(classifyAccuracy(21)).toBe('approximate');
      expect(classifyAccuracy(35)).toBe('approximate');
      expect(classifyAccuracy(50)).toBe('approximate');
    });

    it('should classify low confidence cellular or network triangulation (> 50m)', () => {
      expect(classifyAccuracy(51)).toBe('low');
      expect(classifyAccuracy(500)).toBe('low');
      expect(classifyAccuracy(2500)).toBe('low');
    });

    it('should handle zero or undefined accuracy as unavailable', () => {
      expect(classifyAccuracy(0)).toBe('unavailable');
      expect(classifyAccuracy(-10)).toBe('unavailable');
      expect(classifyAccuracy(undefined)).toBe('unavailable');
    });
  });

  describe('GeolocationServiceError', () => {
    it('should format typed errors with clear user instructions and retry flags', () => {
      const permErr = new GeolocationServiceError(
        'PERMISSION_DENIED',
        'Location access was denied. Please allow permissions in browser address bar.',
        true
      );
      expect(permErr.type).toBe('PERMISSION_DENIED');
      expect(permErr.canRetry).toBe(true);
      expect(permErr.userMessage).toContain('Location access was denied');

      const timeoutErr = new GeolocationServiceError(
        'TIMEOUT',
        'GPS satellite acquisition timed out.',
        true
      );
      expect(timeoutErr.type).toBe('TIMEOUT');
      expect(timeoutErr.canRetry).toBe(true);
    });
  });
});
