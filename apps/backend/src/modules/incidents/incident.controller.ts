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
    const queryFilters: any = { ...req.query };

    if ((req.query.myReports === 'true' || req.user?.role === 'citizen') && req.user?.sub && req.query.publicFeed !== 'true') {
      queryFilters.reportedBy = req.user.sub;
    }
    if (req.query.assignedToMe === 'true' && req.user?.sub) {
      queryFilters.assignedTo = req.user.sub;
    }
    if (req.query.emergencyOnly === 'true') {
      queryFilters.emergencyOnly = true;
    }
    if (req.query.isEmergency === 'true') {
      queryFilters.isEmergency = true;
    } else if (req.query.isEmergency === 'false') {
      queryFilters.isEmergency = false;
    }

    const result = await incidentService.getIncidents(orgId || undefined, queryFilters);

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

/**
 * GET /api/v1/incidents/:id/audit-chain
 * Returns the cryptographically verified SHA-256 append-only event ledger
 */
export async function getAuditChain(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'Incident ID is required' } });
      return;
    }
    const { verifyIncidentAuditChain } = await import('./incidentEvent.model.js');
    const { Incident } = await import('./incident.model.js');
    const { Types } = await import('mongoose');

    const query: Record<string, any> = Types.ObjectId.isValid(id)
      ? { _id: new Types.ObjectId(id) }
      : { incidentNumber: id };

    const incident = await Incident.findOne(query).select('_id incidentNumber status title');
    if (!incident) {
      res.status(404).json({ success: false, error: { message: 'Incident not found' } });
      return;
    }

    const chain = await verifyIncidentAuditChain(incident._id);

    res.json({
      success: true,
      data: {
        incidentNumber: incident.incidentNumber,
        status: incident.status,
        auditChain: chain,
      },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/incidents/:id/sla
 * Calculates and returns authoritative SLA milestones and compliance
 */
export async function getSla(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ success: false, error: { message: 'Incident ID is required' } });
      return;
    }
    const { Incident } = await import('./incident.model.js');
    const { WorkSession } = await import('../operations/workSession.model.js');
    const { Types } = await import('mongoose');

    const query: Record<string, any> = Types.ObjectId.isValid(id)
      ? { _id: new Types.ObjectId(id) }
      : { incidentNumber: id };

    const incident = await Incident.findOne(query);
    if (!incident) {
      res.status(404).json({ success: false, error: { message: 'Incident not found' } });
      return;
    }

    const workSession = await WorkSession.findOne({ incidentId: incident._id }).sort({ createdAt: -1 });

    const submittedAt = incident.createdAt;
    const resolvedAt = incident.resolution?.resolvedAt;
    const startedAt = workSession?.startedAt;
    const completedAt = workSession?.completedAt;

    // SLA targets based on priority
    const targetHours =
      incident.priority === 'critical' || incident.isEmergency ? 4 : incident.priority === 'high' ? 12 : 24;

    const deadline = new Date(submittedAt.getTime() + targetHours * 60 * 60 * 1000);
    const now = new Date();

    const isResolved = incident.status === 'resolved' || incident.status === 'closed';
    const finalResolutionTime = resolvedAt || completedAt || now;
    const totalDurationSeconds = Math.round((finalResolutionTime.getTime() - submittedAt.getTime()) / 1000);
    const activeWorkSeconds = workSession?.activeWorkSeconds || 0;

    const isBreached = totalDurationSeconds > targetHours * 3600;

    res.json({
      success: true,
      data: {
        incidentNumber: incident.incidentNumber,
        priority: incident.priority,
        targetHours,
        deadline,
        isBreached,
        isResolved,
        submittedAt,
        startedAt,
        completedAt,
        resolvedAt,
        totalDurationSeconds,
        activeWorkSeconds,
        timeRemainingSeconds: isResolved ? 0 : Math.max(0, Math.round((deadline.getTime() - now.getTime()) / 1000)),
      },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}
