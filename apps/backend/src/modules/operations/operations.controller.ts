// ============================================================
// Field Operations & Work Orders Controller
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { Assignment, type AssignmentStatus } from './assignment.model.js';
import { SLAPolicy } from './sla.model.js';
import { WorkerAvailability } from './workerAvailability.model.js';
import { Incident } from '../incidents/incident.model.js';
import { IncidentEvent } from '../incidents/incidentEvent.model.js';

export async function getAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const orgId = user?.org || user?.organizationId || req.organizationId;
    const userId = user?.sub || user?.userId;
    const filter: Record<string, any> = {};
    if (orgId) filter.organizationId = orgId;

    // Field workers only see their assigned work orders
    if (user?.role === 'field_worker') {
      filter.assignedTo = userId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const assignments = await Assignment.find(filter)
      .populate('incidentId', 'incidentNumber title category location risk priority isEmergency')
      .populate('assignedTo', 'profile email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: assignments });
  } catch (err) {
    next(err);
  }
}

export async function createAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const orgId = user?.org || user?.organizationId || req.organizationId;
    const userId = user?.sub || user?.userId;
    const { incidentId, assignedTo, priority, notes, slaDeadlineMinutes } = req.body;

    const query: Record<string, any> = { _id: incidentId };
    if (orgId && user?.role !== 'system_admin') query.organizationId = orgId;

    const incident = await Incident.findOne(query);
    if (!incident) {
      res.status(404).json({ success: false, error: { code: 'INCIDENT_NOT_FOUND', message: 'Incident not found' } });
      return;
    }

    const deadline = slaDeadlineMinutes
      ? new Date(Date.now() + slaDeadlineMinutes * 60 * 1000)
      : new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours default

    const assignment = await Assignment.create({
      organizationId: incident.organizationId || orgId,
      incidentId,
      assignedTo,
      assignedBy: userId,
      priority: priority || incident.priority || 'medium',
      notes: notes || '',
      slaDeadline: deadline,
      status: 'assigned',
      timeline: [
        {
          status: 'assigned',
          timestamp: new Date(),
          notes: 'Dispatched from municipal command center',
        },
      ],
    });

    // Update incident status and assignedTo
    incident.status = 'assigned' as any;
    incident.assignedTo = assignedTo;
    await incident.save();

    // Log incident event
    await IncidentEvent.create({
      incidentId,
      organizationId: incident.organizationId || orgId,
      actorId: userId,
      action: 'ASSIGNED',
      toStatus: 'assigned',
      notes: `Assigned to field worker ID: ${assignedTo}`,
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
}

export async function updateAssignmentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { status, notes, coordinates, resolutionProofHash } = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Work order not found' } });
      return;
    }

    assignment.status = status as AssignmentStatus;
    if (notes) assignment.notes = notes;
    if (resolutionProofHash) assignment.resolutionProofHash = resolutionProofHash;

    const timelineEntry: any = {
      status,
      timestamp: new Date(),
      performedBy: user?.sub,
      notes,
    };

    if (coordinates && coordinates.length === 2) {
      assignment.workerLocation = {
        type: 'Point',
        coordinates,
        updatedAt: new Date(),
      };
      timelineEntry.location = { type: 'Point', coordinates };
    }

    assignment.timeline.push(timelineEntry);

    if (status === 'completed') {
      assignment.completedAt = new Date();
      // Sync completion to incident
      await Incident.findByIdAndUpdate(assignment.incidentId, {
        status: 'in_progress',
      });
    }

    await assignment.save();

    res.json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
}

export async function getSLAPolicies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = (req as any).user?.org || (req as any).user?.organizationId || req.organizationId;
    const filter: Record<string, any> = { isActive: true };
    if (orgId) filter.organizationId = orgId;
    const policies = await SLAPolicy.find(filter);
    res.json({ success: true, data: policies });
  } catch (err) {
    next(err);
  }
}

export async function updateWorkerHeartbeat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const orgId = user?.org || user?.organizationId || req.organizationId;
    const userId = user?.sub || user?.userId;
    const { coordinates, status, speedKmph, batteryLevel } = req.body;

    const update: Record<string, any> = {
      lastHeartbeat: new Date(),
    };

    if (status) update.status = status;
    if (coordinates && coordinates.length === 2) {
      update.currentLocation = {
        type: 'Point',
        coordinates,
        speedKmph,
        batteryLevel,
        updatedAt: new Date(),
      };
    }

    const workerRecord = await WorkerAvailability.findOneAndUpdate(
      { userId, organizationId: orgId },
      { $set: update },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: workerRecord });
  } catch (err) {
    next(err);
  }
}

// ── Work Session Lifecycle Handlers ─────────────────────────

export async function startWorkSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const userId = user?.sub || user?.userId;
    const orgId = user?.org || user?.organizationId;
    const { incidentId, notes } = req.body;

    if (!userId || !incidentId) {
      res.status(400).json({ success: false, error: { message: 'User ID and incident ID are required' } });
      return;
    }

    const { startWorkSession: startSession } = await import('./workSession.service.js');
    const session = await startSession(String(incidentId), String(userId), String(orgId || ''), notes);

    res.status(201).json({
      success: true,
      data: session,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function pauseWorkSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const userId = user?.sub || user?.userId;
    const id = req.params.id as string;
    const { reason } = req.body;

    if (!userId || !id) {
      res.status(400).json({ success: false, error: { message: 'Session ID and User ID are required' } });
      return;
    }

    const { pauseWorkSession: pauseSession } = await import('./workSession.service.js');
    const session = await pauseSession(id, String(userId), reason || 'Work paused by worker');

    res.json({
      success: true,
      data: session,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function resumeWorkSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const userId = user?.sub || user?.userId;
    const id = req.params.id as string;

    if (!userId || !id) {
      res.status(400).json({ success: false, error: { message: 'Session ID and User ID are required' } });
      return;
    }

    const { resumeWorkSession: resumeSession } = await import('./workSession.service.js');
    const session = await resumeSession(id, String(userId));

    res.json({
      success: true,
      data: session,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function completeWorkSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const userId = user?.sub || user?.userId;
    const id = req.params.id as string;

    if (!userId || !id) {
      res.status(400).json({ success: false, error: { message: 'Session ID and User ID are required' } });
      return;
    }

    const { completeWorkSession: completeSession } = await import('./workSession.service.js');
    const result = await completeSession(id, String(userId), req.body);

    res.json({
      success: true,
      data: result,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function getIncidentWorkSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const incidentId = req.params.incidentId as string;
    if (!incidentId) {
      res.status(400).json({ success: false, error: { message: 'Incident ID is required' } });
      return;
    }
    const { getLatestWorkSession } = await import('./workSession.service.js');

    const session = await getLatestWorkSession(incidentId);

    res.json({
      success: true,
      data: session,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

// ── Resolution Approval & Verification Handlers ──────────────

export async function approveIncidentResolution(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const userId = user?.sub || user?.userId;
    const id = req.params.id as string;
    const { reviewNotes } = req.body;

    if (!userId || !id) {
      res.status(400).json({ success: false, error: { message: 'Incident ID and User ID are required' } });
      return;
    }

    const { approveResolution } = await import('./resolution.service.js');
    const result = await approveResolution({
      incidentIdStr: id,
      verifierIdStr: String(userId),
      verifierRole: String(user.role || 'manager'),
      reviewNotes,
    });

    res.json({
      success: true,
      data: {
        resolutionDocument: result.resolutionDocument,
        incident: result.incident,
        emailDispatched: result.emailDispatched,
      },
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}

export async function rejectIncidentResolution(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
    const userId = user?.sub || user?.userId;
    const id = req.params.id as string;
    const { reason } = req.body;

    if (!userId || !id) {
      res.status(400).json({ success: false, error: { message: 'Incident ID and User ID are required' } });
      return;
    }

    const { rejectResolution } = await import('./resolution.service.js');
    const incident = await rejectResolution({
      incidentIdStr: id,
      verifierIdStr: String(userId),
      reason: reason || 'Revision requested by department officer',
    });

    res.json({
      success: true,
      data: incident,
      requestId: req.requestId,
    });
  } catch (err) {
    next(err);
  }
}
