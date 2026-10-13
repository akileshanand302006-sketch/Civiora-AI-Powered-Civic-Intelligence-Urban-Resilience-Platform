// ============================================================
// Civiora — Work Session & Repair Tracking Service
// Server-side UTC timestamps, pause/resume tracking, duration calculations,
// evidence verification and state-machine transitions
// ============================================================

import { Types } from 'mongoose';
import { nanoid } from 'nanoid';
import { WorkSession, type IWorkSession, type IWorkEvidence } from './workSession.model.js';
import { Incident } from '../incidents/incident.model.js';
import { Assignment } from './assignment.model.js';
import { recordChainedIncidentEvent } from '../incidents/incidentEvent.model.js';
import { Notification } from '../notifications/notification.model.js';
import { User } from '../users/user.model.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { emitToOrg } from '../../socket/socketServer.js';
import { SOCKET_EVENTS } from '@civicpulse/shared';

/**
 * Calculates active work seconds excluding paused intervals
 */
export function calculateDurations(
  startedAt: Date,
  completedAt: Date,
  pauseHistory: Array<{ pausedAt: Date; resumedAt?: Date }>
): { elapsedSeconds: number; activeWorkSeconds: number } {
  const totalElapsedMs = Math.max(0, completedAt.getTime() - startedAt.getTime());
  const elapsedSeconds = Math.round(totalElapsedMs / 1000);

  let totalPausedMs = 0;
  for (const interval of pauseHistory) {
    const end = interval.resumedAt ? interval.resumedAt.getTime() : completedAt.getTime();
    const pausedMs = Math.max(0, end - new Date(interval.pausedAt).getTime());
    totalPausedMs += pausedMs;
  }

  const activeWorkMs = Math.max(0, totalElapsedMs - totalPausedMs);
  const activeWorkSeconds = Math.round(activeWorkMs / 1000);

  return { elapsedSeconds, activeWorkSeconds };
}

/**
 * Field Worker starts a work session on an assigned incident.
 * Uses authoritative server UTC timestamp.
 */
export async function startWorkSession(
  incidentIdStr: string,
  workerIdStr: string,
  organizationIdStr: string,
  initialNotes?: string
): Promise<IWorkSession> {
  const incidentQuery = Types.ObjectId.isValid(incidentIdStr)
    ? { _id: new Types.ObjectId(incidentIdStr) }
    : { incidentNumber: incidentIdStr };

  const incident = await Incident.findOne(incidentQuery);
  if (!incident) {
    throw new NotFoundError('Incident');
  }

  // Security Check: Only assigned worker or system admin can start work
  const isAssigned = incident.assignedTo && String(incident.assignedTo) === workerIdStr;
  const isWorkerAssignment = await Assignment.findOne({
    incidentId: incident._id,
    assignedTo: new Types.ObjectId(workerIdStr),
  });

  if (!isAssigned && !isWorkerAssignment) {
    throw new ForbiddenError('You are not authorized to start work on an incident that is not assigned to you.');
  }

  // Check if an active session already exists for this incident
  const existingActive = await WorkSession.findOne({
    incidentId: incident._id,
    sessionStatus: { $in: ['active', 'paused'] },
  });
  if (existingActive) {
    return existingActive;
  }

  const now = new Date();
  const workSessionId = `WS-${new Date().getFullYear()}-${nanoid(8).toUpperCase()}`;

  const workSession = await WorkSession.create({
    workSessionId,
    incidentId: incident._id,
    assignmentId: isWorkerAssignment?._id,
    workerId: new Types.ObjectId(workerIdStr),
    organizationId: incident.organizationId || new Types.ObjectId(organizationIdStr),
    startedAt: now,
    sessionStatus: 'active',
    pauseHistory: [],
    workNotes: initialNotes || 'Field work initiated',
    evidence: [],
    elapsedSeconds: 0,
    activeWorkSeconds: 0,
  });

  // Transition incident to IN_PROGRESS
  const previousStatus = incident.status;
  incident.status = 'in_progress' as any;
  incident.workSessionId = workSession._id;
  incident.timeline.push({
    action: 'WORK_STARTED',
    performedBy: new Types.ObjectId(workerIdStr),
    timestamp: now,
    details: { workSessionId, startedAt: now.toISOString() },
  });
  await incident.save();

  // If Assignment exists, transition to in_progress
  if (isWorkerAssignment) {
    isWorkerAssignment.status = 'in_progress';
    isWorkerAssignment.timeline.push({
      status: 'in_progress',
      timestamp: now,
      notes: 'Work session started by field worker',
    });
    await isWorkerAssignment.save();
  }

  // Append to Tamper-Evident SHA-256 Hash Chained Event Log
  await recordChainedIncidentEvent({
    incidentId: incident._id,
    organizationId: incident.organizationId || new Types.ObjectId(organizationIdStr),
    actorId: new Types.ObjectId(workerIdStr),
    action: 'WORK_STARTED',
    eventType: 'WORK_STARTED',
    fromStatus: previousStatus,
    toStatus: 'in_progress',
    notes: `Field worker started work session ${workSessionId}`,
    correlationId: workSessionId,
  });

  emitToOrg(String(incident.organizationId), SOCKET_EVENTS.INCIDENT_UPDATED, incident.toJSON());
  logger.info({ incidentId: incident._id, workSessionId, workerId: workerIdStr }, 'Work session started');

  return workSession;
}

async function findSessionByIdOrCode(idOrCode: string): Promise<IWorkSession | null> {
  if (Types.ObjectId.isValid(idOrCode)) {
    const doc = await WorkSession.findById(idOrCode);
    if (doc) return doc;
  }
  return await WorkSession.findOne({ workSessionId: idOrCode });
}

/**
 * Worker pauses an active work session with a recorded reason
 */
export async function pauseWorkSession(
  sessionId: string,
  workerIdStr: string,
  reason: string
): Promise<IWorkSession> {
  if (!reason || reason.trim().length === 0) {
    throw new BadRequestError('A specific reason is required to pause work');
  }

  const session = await findSessionByIdOrCode(sessionId);
  if (!session) {
    throw new NotFoundError('WorkSession');
  }

  if (String(session.workerId) !== workerIdStr) {
    throw new ForbiddenError('Only the assigned worker can pause their work session');
  }

  if (session.sessionStatus !== 'active') {
    throw new BadRequestError(`Cannot pause a session with status: ${session.sessionStatus}`);
  }

  const now = new Date();
  session.sessionStatus = 'paused';
  session.pausedAt = now;
  session.pauseHistory.push({
    pausedAt: now,
    reason: reason.trim(),
  });

  // Calculate current active seconds up to pause
  const durations = calculateDurations(session.startedAt, now, session.pauseHistory);
  session.elapsedSeconds = durations.elapsedSeconds;
  session.activeWorkSeconds = durations.activeWorkSeconds;

  await session.save();

  await recordChainedIncidentEvent({
    incidentId: session.incidentId,
    organizationId: session.organizationId,
    actorId: new Types.ObjectId(workerIdStr),
    action: 'WORK_PAUSED',
    eventType: 'WORK_PAUSED',
    notes: `Work paused: ${reason.trim()}`,
    reason: reason.trim(),
    correlationId: session.workSessionId,
  });

  logger.info({ sessionId, reason }, 'Work session paused');
  return session;
}

/**
 * Worker resumes a paused work session
 */
export async function resumeWorkSession(
  sessionId: string,
  workerIdStr: string
): Promise<IWorkSession> {
  const session = await findSessionByIdOrCode(sessionId);
  if (!session) {
    throw new NotFoundError('WorkSession');
  }

  if (String(session.workerId) !== workerIdStr) {
    throw new ForbiddenError('Only the assigned worker can resume their work session');
  }

  if (session.sessionStatus !== 'paused') {
    throw new BadRequestError(`Cannot resume a session with status: ${session.sessionStatus}`);
  }

  const now = new Date();
  session.sessionStatus = 'active';
  session.resumedAt = now;

  // Update latest pause history item
  if (session.pauseHistory.length > 0) {
    const lastPause = session.pauseHistory[session.pauseHistory.length - 1];
    if (lastPause && !lastPause.resumedAt) {
      lastPause.resumedAt = now;
    }
  }

  await session.save();

  await recordChainedIncidentEvent({
    incidentId: session.incidentId,
    organizationId: session.organizationId,
    actorId: new Types.ObjectId(workerIdStr),
    action: 'WORK_RESUMED',
    eventType: 'WORK_RESUMED',
    notes: 'Field worker resumed active repair session',
    correlationId: session.workSessionId,
  });

  logger.info({ sessionId }, 'Work session resumed');
  return session;
}

/**
 * Worker completes work, uploads completion evidence and notes,
 * and submits for Manager/Officer verification.
 */
export async function completeWorkSession(
  sessionId: string,
  workerIdStr: string,
  data: {
    completionSummary: string;
    inspectionNotes?: string;
    materialsUsed?: string;
    resolutionCategory?: string;
    evidence?: IWorkEvidence[];
  }
): Promise<{ workSession: IWorkSession; incident: any }> {
  if (!data.completionSummary || data.completionSummary.trim().length < 5) {
    throw new BadRequestError('A detailed completion summary (minimum 5 characters) is required');
  }

  const session = await findSessionByIdOrCode(sessionId);
  if (!session) {
    throw new NotFoundError('WorkSession');
  }

  if (String(session.workerId) !== workerIdStr) {
    throw new ForbiddenError('Only the assigned worker can complete their work session');
  }

  if (session.sessionStatus === 'completed') {
    throw new BadRequestError('This work session has already been completed');
  }

  const now = new Date();

  // If session was paused, close the pending pause interval at completion time
  if (session.sessionStatus === 'paused' && session.pauseHistory.length > 0) {
    const lastPause = session.pauseHistory[session.pauseHistory.length - 1];
    if (lastPause && !lastPause.resumedAt) {
      lastPause.resumedAt = now;
    }
  }

  // Calculate authoritative durations from server UTC timestamps
  const durations = calculateDurations(session.startedAt, now, session.pauseHistory);

  session.completedAt = now;
  session.sessionStatus = 'completed';
  session.elapsedSeconds = durations.elapsedSeconds;
  session.activeWorkSeconds = durations.activeWorkSeconds;
  session.completionSummary = data.completionSummary.trim();
  if (data.inspectionNotes) session.inspectionNotes = data.inspectionNotes.trim();
  if (data.materialsUsed) session.materialsUsed = data.materialsUsed.trim();
  if (data.resolutionCategory) session.resolutionCategory = data.resolutionCategory.trim();
  if (data.evidence && data.evidence.length > 0) {
    const normalizedEvidence = data.evidence.map((e: any) => {
      if (typeof e === 'string') {
        return { url: e, caption: 'Completion photographic evidence', type: 'after' as const, uploadedAt: now };
      }
      return {
        url: e.url,
        caption: e.caption || 'Completion photographic evidence',
        type: e.type || ('after' as const),
        uploadedAt: e.uploadedAt ? new Date(e.uploadedAt) : now,
      };
    });
    session.evidence.push(...normalizedEvidence);
  }

  await session.save();

  // Transition Incident to AWAITING_VERIFICATION (or evidence_submitted)
  const incident = await Incident.findById(session.incidentId);
  if (incident) {
    const previousStatus = incident.status;
    incident.status = 'awaiting_verification' as any;
    incident.timeline.push({
      action: 'WORK_COMPLETED',
      performedBy: new Types.ObjectId(workerIdStr),
      timestamp: now,
      details: {
        workSessionId: session.workSessionId,
        activeWorkSeconds: durations.activeWorkSeconds,
        elapsedSeconds: durations.elapsedSeconds,
        summary: data.completionSummary,
      },
    });
    await incident.save();

    // If Assignment exists, transition to evidence_submitted / verification
    if (session.assignmentId) {
      await Assignment.findByIdAndUpdate(session.assignmentId, {
        status: 'evidence_submitted',
        completedAt: now,
      });
    }

    // Append to Chained Incident Event Log
    await recordChainedIncidentEvent({
      incidentId: incident._id,
      organizationId: incident.organizationId,
      actorId: new Types.ObjectId(workerIdStr),
      action: 'WORK_COMPLETED',
      eventType: 'WORK_COMPLETED',
      fromStatus: previousStatus,
      toStatus: 'awaiting_verification',
      notes: `Repair completed in ${Math.round(durations.activeWorkSeconds / 60)} active minutes. Submitted for verification.`,
      changeSummary: data.completionSummary,
      correlationId: session.workSessionId,
    });

    // Notify Department Manager & Officers that verification is pending
    const staffQuery: any = {
      role: { $in: ['manager', 'officer', 'system_admin'] },
      isActive: true,
    };
    if (incident.departmentId) {
      staffQuery.$or = [{ departmentId: incident.departmentId }, { role: 'system_admin' }];
    }
    const reviewers = await User.find(staffQuery).select('_id email role');
    for (const reviewer of reviewers) {
      await Notification.create({
        userId: reviewer._id,
        organizationId: incident.organizationId,
        type: 'RESOLUTION_VERIFICATION_PENDING',
        title: 'Work Completed — Awaiting Verification',
        message: `Hazard ${incident.incidentNumber} has been resolved by field worker. Review evidence and approve resolution.`,
        data: {
          incidentId: incident._id,
          incidentNumber: incident.incidentNumber,
          workSessionId: session.workSessionId,
        },
      });
    }

    emitToOrg(String(incident.organizationId), SOCKET_EVENTS.INCIDENT_UPDATED, incident.toJSON());
  }

  logger.info(
    { sessionId: session._id, activeSeconds: durations.activeWorkSeconds },
    'Work session completed and submitted for verification'
  );

  return { workSession: session, incident };
}

/**
 * Retrieves the active or latest work session for an incident
 */
export async function getLatestWorkSession(incidentIdStr: string): Promise<IWorkSession | null> {
  const incQuery = Types.ObjectId.isValid(incidentIdStr)
    ? { incidentId: new Types.ObjectId(incidentIdStr) }
    : {};

  if (!Types.ObjectId.isValid(incidentIdStr)) {
    const inc = await Incident.findOne({ incidentNumber: incidentIdStr }).select('_id');
    if (!inc) return null;
    return WorkSession.findOne({ incidentId: inc._id }).sort({ createdAt: -1 });
  }

  return WorkSession.findOne(incQuery).sort({ createdAt: -1 });
}
