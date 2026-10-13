// ============================================================
// User Controller
// ============================================================

import { type Request, type Response, type NextFunction } from 'express';
import { User } from './user.model.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { ROLE_PERMISSIONS, type Role } from '@civicpulse/shared';

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user!.sub);
    if (!user) {
      throw new NotFoundError('User');
    }

    res.json({
      success: true,
      data: user,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const allowedUpdates = ['profile', 'preferences'];
    const updateData: Record<string, any> = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(req.user!.sub, { $set: updateData }, { new: true });
    if (!user) {
      throw new NotFoundError('User');
    }

    res.json({
      success: true,
      data: user,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.user!.org;
    const role = req.query.role as string;
    const search = req.query.search as string;

    const query: Record<string, any> = { organizationId: orgId, isActive: true };
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query).select('-security.mfaSecret');

    res.json({
      success: true,
      data: users,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      organizationId: req.user!.org,
    }).select('-security.mfaSecret');

    if (!user) {
      throw new NotFoundError('User');
    }

    res.json({
      success: true,
      data: user,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetUserId = req.params.id;
    const newRole = req.body.role as Role;

    if (!newRole) {
      throw new BadRequestError('Role is required');
    }

    const newPermissions = ROLE_PERMISSIONS[newRole] || [];

    const user = await User.findOneAndUpdate(
      { _id: targetUserId, organizationId: req.user!.org },
      { $set: { role: newRole, permissions: newPermissions } },
      { new: true },
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    res.json({
      success: true,
      data: user,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

// ── User Civic Location Management ───────────────────────────────

export async function updateActiveLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = req.body?.location || req.body || {};
    const { latitude, longitude, formattedAddress, city, state, district, districtId } = payload;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new BadRequestError('Valid latitude and longitude numbers are required');
    }

    if (latitude < -90 || latitude > 90) {
      throw new BadRequestError('Latitude must be between -90 and 90');
    }

    if (longitude < -180 || longitude > 180) {
      throw new BadRequestError('Longitude must be between -180 and 180');
    }

    const user = await User.findByIdAndUpdate(
      req.user!.sub,
      {
        $set: {
          lastSelectedLocation: {
            type: 'Point',
            coordinates: [longitude, latitude], // Canonical GeoJSON [lng, lat]
            formattedAddress: formattedAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            city: city || 'Tamil Nadu',
            state: state || 'Tamil Nadu',
            district: district || undefined,
            districtId: districtId || undefined,
            selectedAt: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    res.json({
      success: true,
      data: {
        lastSelectedLocation: user.lastSelectedLocation,
      },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function getSavedLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user!.sub).select('savedLocations');
    if (!user) {
      throw new NotFoundError('User');
    }

    res.json({
      success: true,
      data: user.savedLocations || [],
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function addSavedLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, type, location, isDefault } = req.body;

    if (!name || !location) {
      throw new BadRequestError('Name and location object are required');
    }

    const { latitude, longitude, formattedAddress, city, state, country, postalCode, placeId } = location;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new BadRequestError('Valid latitude and longitude numbers are required');
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new BadRequestError('Coordinates out of range (-90..90, -180..180)');
    }

    const user = await User.findById(req.user!.sub);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (!user.savedLocations) {
      user.savedLocations = [];
    }

    if (isDefault && user.savedLocations.length > 0) {
      user.savedLocations.forEach((s) => {
        s.isDefault = false;
      });
    }

    const newLoc = {
      name,
      type: type || 'other',
      location: {
        type: 'Point' as const,
        coordinates: [longitude, latitude] as [number, number],
        formattedAddress: formattedAddress || `${latitude}, ${longitude}`,
        city,
        state,
        country,
        postalCode,
        placeId,
      },
      isDefault: Boolean(isDefault),
      createdAt: new Date(),
    };

    user.savedLocations.push(newLoc as any);
    await user.save();

    res.status(201).json({
      success: true,
      data: user.savedLocations,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteSavedLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { locationId } = req.params;
    const user = await User.findById(req.user!.sub);
    if (!user) {
      throw new NotFoundError('User');
    }

    user.savedLocations = (user.savedLocations || []).filter(
      (s: any) => s._id?.toString() !== locationId && s.id !== locationId,
    );
    await user.save();

    res.json({
      success: true,
      data: user.savedLocations,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}
