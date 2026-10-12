// ============================================================
// Organization Controller
// ============================================================

import { type Request, type Response, type NextFunction } from 'express';
import { Organization } from './org.model.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgs = await Organization.find({ isActive: true }).select('name slug type branding settings');
    res.json({
      success: true,
      data: orgs,
    });
  } catch (err) {
    next(err);
  }
}

export async function getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const org = await Organization.findOne({ slug: req.params.slug });
    if (!org) {
      throw new NotFoundError('Organization');
    }

    res.json({
      success: true,
      data: org,
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await Organization.findOne({ slug: req.body.slug });
    if (existing) {
      throw new ConflictError('Organization', 'slug');
    }

    const org = await Organization.create(req.body);
    res.status(201).json({
      success: true,
      data: org,
    });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const org = await Organization.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!org) {
      throw new NotFoundError('Organization');
    }

    res.json({
      success: true,
      data: org,
    });
  } catch (err) {
    next(err);
  }
}
