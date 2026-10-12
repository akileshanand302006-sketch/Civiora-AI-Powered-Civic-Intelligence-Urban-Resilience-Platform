// ============================================================
// Location & Infrastructure Controller
// Real MongoDB Geospatial Queries & Canonical Geocoding
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { Zone } from './zone.model.js';
import { InfrastructureAsset } from './infrastructure.model.js';
import { Incident } from '../incidents/incident.model.js';
import { User } from '../users/user.model.js';

export async function setActiveLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
    const { location } = req.body;

    if (!location || !location.coordinates || location.coordinates.length !== 2) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_COORDINATES', message: 'Valid GeoJSON [longitude, latitude] required' },
      });
      return;
    }

    const [longitude, latitude] = location.coordinates;

    // Persist to user record
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        lastSelectedLocation: {
          type: 'Point',
          coordinates: [longitude, latitude],
          formattedAddress: location.formattedAddress || 'Selected Civic Area',
          city: location.city,
          state: location.state,
          selectedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      data: {
        coordinates: [longitude, latitude],
        formattedAddress: location.formattedAddress,
        city: location.city,
        state: location.state,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getSavedLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).user?.userId;
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
    const userId = (req as any).user?.userId;
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
