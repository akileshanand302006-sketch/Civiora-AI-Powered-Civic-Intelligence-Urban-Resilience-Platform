// ============================================================
// Location & Infrastructure Controller
// Real MongoDB Geospatial Queries & Canonical Geocoding
// Statewide Tamil Nadu 38 Districts Query & Viewport Bounds Engine
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { Zone } from './zone.model.js';
import { InfrastructureAsset } from './infrastructure.model.js';
import { Incident } from '../incidents/incident.model.js';
import { User } from '../users/user.model.js';
import {
  TAMIL_NADU_DISTRICTS,
  TAMIL_NADU_STATE_BOUNDS,
  TAMIL_NADU_CENTER,
  findDistrictByCoordinates,
  resolveTamilNaduDistrict,
  isWithinTamilNadu,
} from '@civicpulse/shared';

/**
 * Retrieve all 38 canonical Tamil Nadu districts with aggregated live incident stats
 */
export async function getDistricts(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Aggregate incident count per district bounding box / keyword
    const incidents = await Incident.find({
      status: { $nin: ['resolved', 'closed', 'rejected'] },
    }).select('location isEmergency priority');

    const districtStatsMap: Record<string, { total: number; emergency: number }> = {};
    for (const d of TAMIL_NADU_DISTRICTS) {
      districtStatsMap[d.id] = { total: 0, emergency: 0 };
    }

    for (const inc of incidents) {
      const coords = inc.location?.coordinates;
      if (coords && coords.length === 2) {
        const [lng, lat] = coords;
        const matched = findDistrictByCoordinates(lng, lat);
        if (matched) {
          const stats = districtStatsMap[matched.id];
          if (stats) {
            stats.total++;
            if (inc.isEmergency) stats.emergency++;
          }
        }
      }
    }

    const districtsWithStats = TAMIL_NADU_DISTRICTS.map((d) => ({
      ...d,
      activeIncidents: districtStatsMap[d.id]?.total || 0,
      emergencyIncidents: districtStatsMap[d.id]?.emergency || 0,
    }));

    res.json({
      success: true,
      data: {
        totalDistricts: TAMIL_NADU_DISTRICTS.length,
        stateCenter: TAMIL_NADU_CENTER,
        stateBounds: TAMIL_NADU_STATE_BOUNDS,
        districts: districtsWithStats,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Resilient IP-based geolocation fallback for devices without GPS hardware or blocked browser location
 */
export async function detectIpLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    let lat = 11.1271;
    let lng = 78.6569;
    let city = 'Tiruchirappalli';
    let districtName = 'Tiruchirappalli';
    let source = 'IP_FALLBACK';

    try {
      const isLocal = !rawIp || rawIp === '127.0.0.1' || rawIp === '::1' || rawIp.startsWith('192.168.');
      const queryUrl = isLocal ? 'http://ip-api.com/json/' : `http://ip-api.com/json/${rawIp}`;
      const response = await fetch(queryUrl, { signal: AbortSignal.timeout(3500) });
      if (response.ok) {
        const data = (await response.json()) as any;
        if (data && data.status === 'success' && data.lat && data.lon) {
          lat = data.lat;
          lng = data.lon;
          city = data.city || city;
          districtName = data.city || districtName;
          source = 'IP_GEOLOCATION';
        }
      }
    } catch {}

    const matched =
      findDistrictByCoordinates(lng, lat) ||
      resolveTamilNaduDistrict(districtName) ||
      resolveTamilNaduDistrict(city);

    res.json({
      success: true,
      data: {
        latitude: lat,
        longitude: lng,
        accuracy: 2500,
        accuracyConfidence: 'approximate',
        city: matched?.headquarters || city,
        district: matched?.name || districtName,
        districtId: matched?.id,
        state: 'Tamil Nadu',
        country: 'India',
        source,
      },
    });
  } catch (err) {
    next(err);
  }
}


/**
 * Viewport Bounding Box Query: Return incidents visible within the map camera
 */
export async function getIncidentsInBounds(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let sw_lng = parseFloat(req.query.sw_lng as string);
    let sw_lat = parseFloat(req.query.sw_lat as string);
    let ne_lng = parseFloat(req.query.ne_lng as string);
    let ne_lat = parseFloat(req.query.ne_lat as string);

    // Support comma-separated bounds: sw_lng,sw_lat,ne_lng,ne_lat
    if (req.query.bounds && typeof req.query.bounds === 'string') {
      const parts = req.query.bounds.split(',').map((p) => parseFloat(p.trim()));
      if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
        const [b0, b1, b2, b3] = parts;
        if (b0 !== undefined && b1 !== undefined && b2 !== undefined && b3 !== undefined) {
          sw_lng = b0;
          sw_lat = b1;
          ne_lng = b2;
          ne_lat = b3;
        }
      }
    }

    if (isNaN(sw_lng) || isNaN(sw_lat) || isNaN(ne_lng) || isNaN(ne_lat)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_VIEWPORT_BOUNDS',
          message: 'Valid bounding box coordinates (sw_lng, sw_lat, ne_lng, ne_lat) required',
        },
      });
      return;
    }

    // Strict coordinate validation
    if (sw_lat < -90 || ne_lat > 90 || sw_lng < -180 || ne_lng > 180) {
      res.status(400).json({
        success: false,
        error: { code: 'COORDINATES_OUT_OF_RANGE', message: 'Latitude [-90,90], Longitude [-180,180]' },
      });
      return;
    }

    // MongoDB 2dsphere $geoWithin using $box: [[sw_lng, sw_lat], [ne_lng, ne_lat]]
    const incidents = await Incident.find({
      'location.coordinates': {
        $geoWithin: {
          $box: [
            [sw_lng, sw_lat],
            [ne_lng, ne_lat],
          ],
        },
      },
    })
      .limit(100)
      .select('incidentNumber title category status priority isEmergency location risk createdAt');

    res.json({
      success: true,
      data: {
        bounds: { sw: [sw_lng, sw_lat], ne: [ne_lng, ne_lat] },
        count: incidents.length,
        incidents,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Validate geographic coordinate and resolve Tamil Nadu district coverage
 */
export async function validateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lng = parseFloat(req.body.lng ?? req.query.lng);
    const lat = parseFloat(req.body.lat ?? req.query.lat);

    if (isNaN(lng) || isNaN(lat)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_COORDINATES', message: 'Valid numerical lng and lat required' },
      });
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      res.status(400).json({
        success: false,
        error: { code: 'OUT_OF_RANGE', message: 'Latitude must be [-90, 90], Longitude [-180, 180]' },
      });
      return;
    }

    const inTamilNadu = isWithinTamilNadu(lng, lat);
    const matchedDistrict = findDistrictByCoordinates(lng, lat);

    res.json({
      success: true,
      data: {
        coordinates: [lng, lat],
        isWithinTamilNadu: inTamilNadu,
        district: matchedDistrict
          ? {
              id: matchedDistrict.id,
              name: matchedDistrict.name,
              tamilName: matchedDistrict.tamilName,
              headquarters: matchedDistrict.headquarters,
              division: matchedDistrict.division,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function setActiveLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.sub;
    const location = req.body?.location || req.body;

    if (!location || !location.coordinates || location.coordinates.length !== 2) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_COORDINATES', message: 'Valid GeoJSON [longitude, latitude] required' },
      });
      return;
    }

    const [longitude, latitude] = location.coordinates;

    if (typeof longitude !== 'number' || typeof latitude !== 'number') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_COORDINATES', message: 'Coordinates must be valid numbers' },
      });
      return;
    }

    const matchedDistrict =
      resolveTamilNaduDistrict(location.district || location.city) ||
      findDistrictByCoordinates(longitude, latitude);

    // Persist to user record
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        lastSelectedLocation: {
          type: 'Point',
          coordinates: [longitude, latitude],
          formattedAddress: location.formattedAddress || 'Selected Civic Area',
          city: location.city || matchedDistrict?.headquarters || 'Tamil Nadu',
          state: location.state || 'Tamil Nadu',
          district: matchedDistrict?.name || location.district,
          districtId: matchedDistrict?.id,
          selectedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      data: {
        coordinates: [longitude, latitude],
        formattedAddress: location.formattedAddress,
        city: location.city || matchedDistrict?.headquarters,
        district: matchedDistrict?.name,
        districtId: matchedDistrict?.id,
        state: location.state || 'Tamil Nadu',
        isWithinTamilNadu: isWithinTamilNadu(longitude, latitude),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getSavedLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.sub;
    const user = await User.findById(userId).select('savedLocations');
    res.json({
      success: true,
      data: user?.savedLocations || [],
    });
  } catch (err) {
    next(err);
  }
}

export async function addSavedLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.sub;
    const { name, type, location, isDefault } = req.body;

    if (!location?.coordinates || location.coordinates.length !== 2) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_COORDINATES', message: 'GeoJSON coordinates [longitude, latitude] required' },
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }

    if (isDefault) {
      user.savedLocations.forEach((loc) => (loc.isDefault = false));
    }

    user.savedLocations.push({
      name,
      type: type || 'other',
      location: {
        type: 'Point',
        coordinates: location.coordinates,
        formattedAddress: location.formattedAddress || name,
        city: location.city,
        state: location.state,
        country: location.country,
        postalCode: location.postalCode,
        placeId: location.placeId,
      },
      isDefault: Boolean(isDefault),
      createdAt: new Date(),
    });

    await user.save();

    res.status(201).json({
      success: true,
      data: user.savedLocations[user.savedLocations.length - 1],
    });
  } catch (err) {
    next(err);
  }
}

export async function getZones(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = (req as any).user?.organizationId;
    const filter = orgId ? { organizationId: orgId } : {};
    const zones = await Zone.find(filter).sort({ riskScore: -1 });
    res.json({ success: true, data: zones });
  } catch (err) {
    next(err);
  }
}

export async function getInfrastructureAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = (req as any).user?.organizationId;
    const filter = orgId ? { organizationId: orgId } : {};
    const assets = await InfrastructureAsset.find(filter).sort({ conditionRating: 1 });
    res.json({ success: true, data: assets });
  } catch (err) {
    next(err);
  }
}

export async function getNearbyIncidentsAndAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lng = parseFloat(req.query.lng as string);
    const lat = parseFloat(req.query.lat as string);
    const maxDistanceMeters = parseInt(req.query.distance as string) || 5000;

    if (isNaN(lng) || isNaN(lat)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUERY', message: 'Valid query parameters ?lng=...&lat=... required' },
      });
      return;
    }

    // Geospatial $near query on incidents
    const incidents = await Incident.find({
      'location.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: maxDistanceMeters,
        },
      },
    })
      .limit(50)
      .select('incidentNumber title category status priority location risk isEmergency createdAt');

    // Geospatial query on infrastructure assets
    const assets = await InfrastructureAsset.find({
      'location.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: maxDistanceMeters,
        },
      },
    }).limit(25);

    res.json({
      success: true,
      data: {
        anchorCoordinates: [lng, lat],
        maxDistanceMeters,
        incidentsCount: incidents.length,
        assetsCount: assets.length,
        incidents,
        assets,
      },
    });
  } catch (err) {
    next(err);
  }
}
