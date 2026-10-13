// ============================================================
// Civiora — Comprehensive Tamil Nadu 38-District & Geospatial Tests
// Unit & Integration Verification of Mapping and Location Foundation
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  TAMIL_NADU_DISTRICTS,
  TAMIL_NADU_DISTRICT_COUNT,
  TAMIL_NADU_STATE_BOUNDS,
  TAMIL_NADU_CENTER,
  resolveTamilNaduDistrict,
  findDistrictByCoordinates,
  isWithinTamilNadu,
} from '@civicpulse/shared';

describe('1. Canonical Tamil Nadu 38 Districts Reference Dataset', () => {
  it('should contain exactly 38 canonical districts', () => {
    expect(TAMIL_NADU_DISTRICTS.length).toBe(38);
    expect(TAMIL_NADU_DISTRICT_COUNT).toBe(38);
    expect(TAMIL_NADU_CENTER[1]).toBeCloseTo(11.1271, 1); // Latitude
    expect(TAMIL_NADU_CENTER[0]).toBeCloseTo(78.6569, 1); // Longitude
    expect(TAMIL_NADU_STATE_BOUNDS.north).toBeGreaterThan(13.0);
    expect(TAMIL_NADU_STATE_BOUNDS.south).toBeLessThan(9.0);
  });

  it('should have unique canonical IDs and codes for all 38 districts', () => {
    const ids = new Set(TAMIL_NADU_DISTRICTS.map((d) => d.id));
    const names = new Set(TAMIL_NADU_DISTRICTS.map((d) => d.name));

    expect(ids.size).toBe(38);
    expect(names.size).toBe(38);
  });

  it('should have valid centers and bounding boxes within state limits', () => {
    for (const d of TAMIL_NADU_DISTRICTS) {
      const [lng, lat] = d.center;

      // Coordinate ordering [longitude, latitude]
      expect(lng).toBeGreaterThanOrEqual(76.0);
      expect(lng).toBeLessThanOrEqual(80.5);
      expect(lat).toBeGreaterThanOrEqual(8.0);
      expect(lat).toBeLessThanOrEqual(13.6);

      // Bounds consistency
      expect(d.bounds.south).toBeLessThan(d.bounds.north);
      expect(d.bounds.west).toBeLessThan(d.bounds.east);

      // Center should fall inside or very close to district bounds
      expect(lat).toBeGreaterThanOrEqual(d.bounds.south - 0.2);
      expect(lat).toBeLessThanOrEqual(d.bounds.north + 0.2);
      expect(lng).toBeGreaterThanOrEqual(d.bounds.west - 0.2);
      expect(lng).toBeLessThanOrEqual(d.bounds.east + 0.2);

      // Check Tamil script name and division are present
      expect(d.tamilName.length).toBeGreaterThan(0);
      expect(['North', 'Central', 'South', 'West']).toContain(d.division);
    }
  });
});

describe('2. District Resolution by Name and Aliases', () => {
  it('should resolve standard district names accurately', () => {
    expect(resolveTamilNaduDistrict('Chennai')?.id).toBe('chennai');
    expect(resolveTamilNaduDistrict('Coimbatore')?.id).toBe('coimbatore');
    expect(resolveTamilNaduDistrict('Madurai')?.id).toBe('madurai');
    expect(resolveTamilNaduDistrict('Salem')?.id).toBe('salem');
    expect(resolveTamilNaduDistrict('Vellore')?.id).toBe('vellore');
  });

  it('should resolve colloquial aliases and alternate spellings', () => {
    // Trichy -> Tiruchirappalli
    expect(resolveTamilNaduDistrict('Trichy')?.id).toBe('tiruchirappalli');
    // Kovai -> Coimbatore
    expect(resolveTamilNaduDistrict('Kovai')?.id).toBe('coimbatore');
    // Cape Comorin / Kanyakumari -> Kanniyakumari
    expect(resolveTamilNaduDistrict('Kanyakumari')?.id).toBe('kanniyakumari');
    expect(resolveTamilNaduDistrict('Cape Comorin')?.id).toBe('kanniyakumari');
    // Tuticorin -> Thoothukudi
    expect(resolveTamilNaduDistrict('Tuticorin')?.id).toBe('thoothukudi');
    // Ooty -> The Nilgiris
    expect(resolveTamilNaduDistrict('Ooty')?.id).toBe('the_nilgiris');
    expect(resolveTamilNaduDistrict('Nilgiris')?.id).toBe('the_nilgiris');
    // Nellai -> Tirunelveli
    expect(resolveTamilNaduDistrict('Nellai')?.id).toBe('tirunelveli');
    // Tanjore -> Thanjavur
    expect(resolveTamilNaduDistrict('Tanjore')?.id).toBe('thanjavur');
    // Chingleput -> Chengalpattu
    expect(resolveTamilNaduDistrict('Chingleput')?.id).toBe('chengalpattu');
    // Villupuram -> Viluppuram
    expect(resolveTamilNaduDistrict('Villupuram')?.id).toBe('viluppuram');
    // Thiruvallur -> Tiruvallur
    expect(resolveTamilNaduDistrict('Thiruvallur')?.id).toBe('tiruvallur');
  });

  it('should handle strings with "District" suffix gracefully', () => {
    expect(resolveTamilNaduDistrict('Coimbatore District')?.id).toBe('coimbatore');
    expect(resolveTamilNaduDistrict('Madurai District')?.id).toBe('madurai');
  });
});

describe('3. Coordinate-Based District Identification Across Tamil Nadu', () => {
  const representativeTestPoints: Array<{
    name: string;
    coords: [number, number]; // [lng, lat]
    expectedDistrictId: string;
  }> = [
    { name: 'Chennai Central', coords: [80.2707, 13.0827], expectedDistrictId: 'chennai' },
    { name: 'Coimbatore CIT', coords: [77.0279, 11.0289], expectedDistrictId: 'coimbatore' },
    { name: 'Madurai Meenakshi', coords: [78.1198, 9.9252], expectedDistrictId: 'madurai' },
    { name: 'Tiruchirappalli Rockfort', coords: [78.7047, 10.7905], expectedDistrictId: 'tiruchirappalli' },
    { name: 'Salem Hasthampatti', coords: [78.146, 11.6643], expectedDistrictId: 'salem' },
    { name: 'Tiruppur Kumaran Road', coords: [77.3411, 11.1085], expectedDistrictId: 'tiruppur' },
    { name: 'The Nilgiris Ooty Lake', coords: [76.7032, 11.4102], expectedDistrictId: 'the_nilgiris' },
    { name: 'Kanniyakumari Beach', coords: [77.5385, 8.0883], expectedDistrictId: 'kanniyakumari' },
    { name: 'Vellore Golden Temple', coords: [79.1325, 12.9165], expectedDistrictId: 'vellore' },
    { name: 'Thanjavur Brihadisvara', coords: [79.1378, 10.787], expectedDistrictId: 'thanjavur' },
    { name: 'Erode Central Bus Stand', coords: [77.7172, 11.341], expectedDistrictId: 'erode' },
    { name: 'Tirunelveli Junction', coords: [77.7567, 8.7139], expectedDistrictId: 'tirunelveli' },
    { name: 'Dindigul Fort', coords: [77.9803, 10.3673], expectedDistrictId: 'dindigul' },
    { name: 'Ramanathapuram Rameswaram', coords: [78.8395, 9.3639], expectedDistrictId: 'ramanathapuram' },
  ];

  for (const pt of representativeTestPoints) {
    it(`should resolve ${pt.name} to district: ${pt.expectedDistrictId}`, () => {
      const match = findDistrictByCoordinates(pt.coords[0], pt.coords[1]);
      expect(match).toBeDefined();
      expect(match?.id).toBe(pt.expectedDistrictId);
    });
  }
});

describe('4. Territorial Limits & Out-of-State Boundary Rejection', () => {
  it('should accept points within Tamil Nadu territory', () => {
    // Tiruchirappalli central command
    expect(isWithinTamilNadu(78.6569, 11.1271)).toBe(true);
    // Chennai coast
    expect(isWithinTamilNadu(80.27, 13.08)).toBe(true);
    // Kanniyakumari tip
    expect(isWithinTamilNadu(77.53, 8.09)).toBe(true);
  });

  it('should reject coordinates outside Tamil Nadu', () => {
    // Bangalore, Karnataka
    expect(isWithinTamilNadu(77.5946, 12.9716)).toBe(false);
    // New Delhi
    expect(isWithinTamilNadu(77.209, 28.6139)).toBe(false);
    // Mumbai, Maharashtra
    expect(isWithinTamilNadu(72.8777, 19.076)).toBe(false);
    // Hyderabad, Telangana
    expect(isWithinTamilNadu(78.4867, 17.385)).toBe(false);
    // Null Island / 0,0
    expect(isWithinTamilNadu(0, 0)).toBe(false);
  });

  it('should reject swapped coordinates [lat, lng] as out of bounds', () => {
    // If someone accidentally passes [13.08, 80.27] instead of [80.27, 13.08]:
    // lng=13.08 is in the Atlantic Ocean / Africa, not Tamil Nadu!
    expect(isWithinTamilNadu(13.0827, 80.2707)).toBe(false);
  });
});
