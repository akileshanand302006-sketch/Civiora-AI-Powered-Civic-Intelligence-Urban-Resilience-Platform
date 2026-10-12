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
    const filter: Record<string, any> = { organizationId: user.organizationId };

    // Field workers only see their assigned work orders
    if (user.role === 'field_worker') {
      filter.assignedTo = user.userId;
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
    const { incidentId, assignedTo, priority, notes, slaDeadlineMinutes } = req.body;

    const incident = await Incident.findOne({ _id: incidentId, organizationId: user.organizationId });
    if (!incident) {
      res.status(404).json({ success: false, error: { code: 'INCIDENT_NOT_FOUND', message: 'Incident not found' } });
      return;
    }

    const deadline = slaDeadlineMinutes
      ? new Date(Date.now() + slaDeadlineMinutes * 60 * 1000)
      : new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours default

    const assignment = await Assignment.create({
      organizationId: user.organizationId,
      incidentId,
      assignedTo,
      assignedBy: user.userId,
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
      organizationId: user.organizationId,
      actorId: user.userId,
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

    const assignment = await Assignment.findOne({ _id: id, organizationId: user.organizationId });
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
        status: 'in_progress', // or pending verification
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
    const orgId = (req as any).user?.organizationId;
    const policies = await SLAPolicy.find({ organizationId: orgId, isActive: true });
    res.json({ success: true, data: policies });
  } catch (err) {
    next(err);
  }
}

export async function updateWorkerHeartbeat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as any).user;
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
      { userId: user.userId, organizationId: user.organizationId },
      { $set: update },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: workerRecord });
  } catch (err) {
    next(err);
  }
}
