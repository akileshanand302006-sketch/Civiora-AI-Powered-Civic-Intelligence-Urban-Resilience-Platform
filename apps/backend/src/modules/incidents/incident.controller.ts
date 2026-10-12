// ============================================================
// Incident Controller
// ============================================================

import { type Request, type Response, type NextFunction } from 'express';
import * as incidentService from './incident.service.js';
import { BadRequestError } from '../../utils/errors.js';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const incident = await incidentService.createIncident(user.sub, user.org, req.body);

    res.status(201).json({
      success: true,
      data: incident,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.user ? req.user.org : (req.query.orgId as string);
    if (!orgId) {
      throw new BadRequestError('Organization ID is required');
    }

    const result = await incidentService.getIncidents(orgId, req.query);

    res.json({
      success: true,
      data: result.incidents,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.user ? req.user.org : (req.query.orgId as string);
    const incident = await incidentService.getIncidentById(req.params.id as string, orgId);

    res.json({
      success: true,
      data: incident,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function getNearby(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.user ? req.user.org : (req.query.orgId as string);
    const lng = parseFloat(req.query.lng as string);
    const lat = parseFloat(req.query.lat as string);
    const radius = req.query.radiusMeters ? parseFloat(req.query.radiusMeters as string) : 5000;

    if (isNaN(lng) || isNaN(lat)) {
      throw new BadRequestError('Valid lng and lat coordinates are required');
    }

    const incidents = await incidentService.getNearbyIncidents(orgId, lng, lat, radius);

    res.json({
      success: true,
      data: incidents,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const incident = await incidentService.updateIncidentStatus(
      req.params.id as string,
      user.org,
      user.sub,
      req.body.status,
      req.body.notes,
    );

    res.json({
      success: true,
      data: incident,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function assign(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const incident = await incidentService.assignIncident(
      req.params.id as string,
      user.org,
      user.sub,
      req.body.assignedTo,
      req.body.departmentId,
    );

    res.json({
      success: true,
      data: incident,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function resolve(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const incident = await incidentService.resolveIncident(
      req.params.id as string,
      user.org,
      user.sub,
      req.body.notes || 'Resolved by field officer',
      req.body.evidenceIds,
    );

    res.json({
      success: true,
      data: incident,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyVote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const incident = await incidentService.submitVerificationVote(
      req.params.id as string,
      user.org,
      user.sub,
      req.body.response,
    );

    res.json({
      success: true,
      data: incident,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function metrics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.user ? req.user.org : (req.query.orgId as string);
    if (!orgId) throw new BadRequestError('Organization ID is required');

    const result = await incidentService.getIncidentMetrics(orgId);

    res.json({
      success: true,
      data: result,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}
