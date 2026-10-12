// ============================================================
// Incident Service
// ============================================================
// Core business logic for incident reporting, querying, assignment,
// status state machine transitions, and real-time broadcasting.
// ============================================================

import { Types } from 'mongoose';
import { Incident, type IIncident } from './incident.model.js';
import {
  INCIDENT_STATUSES,
  INCIDENT_STATUS_TRANSITIONS,
  INCIDENT_PRIORITIES,
  SOCKET_EVENTS,
  type IncidentCategory,
  type IncidentStatus,
  type IncidentPriority,
} from '@civicpulse/shared';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../../utils/errors.js';
import {
  emitToOrg,
  emitToIncident,
  emitToUser,
  emitToMap,
  emitEmergency,
} from '../../socket/socketServer.js';
import { logger } from '../../utils/logger.js';

export interface CreateIncidentDTO {
  category: IncidentCategory;
  subcategory?: string;
  title: string;
  description: string;
  priority?: IncidentPriority;
  isEmergency?: boolean;
  location: {
    coordinates: [number, number]; // [lng, lat]
    address: string;
  };
  evidenceIds?: string[];
  reportingMode?: 'standard' | 'emergency' | 'voice' | 'quick';
}

export interface IncidentFilterOptions {
  page?: number;
  limit?: number;
  category?: IncidentCategory;
  status?: string;
  priority?: IncidentPriority;
  departmentId?: string;
  isEmergency?: boolean;
  assignedTo?: string;
  reportedBy?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Generates a human-readable sequential incident identifier: e.g. CP-2026-X8K9 */
function generateIncidentNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const count = Math.floor(1000 + Math.random() * 9000);
  return `CP-${year}-${rand}${count}`;
}

/** Fuzz coordinates slightly for privacy on public views (~100-200m) */
function fuzzCoordinates(lng: number, lat: number): [number, number] {
  // ~0.001 degree is approximately 111 meters
  const deltaLng = (Math.random() - 0.5) * 0.002;
  const deltaLat = (Math.random() - 0.5) * 0.002;
  return [Number((lng + deltaLng).toFixed(6)), Number((lat + deltaLat).toFixed(6))];
}

/** Calculate an initial preliminary risk score before AI processing */
function computePreliminaryRisk(priority: IncidentPriority, isEmergency: boolean): {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{ factor: string; weight: number; explanation: string }>;
} {
  let score = 25;
  const factors: Array<{ factor: string; weight: number; explanation: string }> = [];

  if (isEmergency) {
    score = 90;
    factors.push({
      factor: 'emergency_flag',
      weight: 0.5,
      explanation: 'Marked as urgent emergency by citizen',
    });
  } else if (priority === INCIDENT_PRIORITIES.CRITICAL) {
    score = 85;
    factors.push({ factor: 'critical_priority', weight: 0.4, explanation: 'High-severity safety concern' });
  } else if (priority === INCIDENT_PRIORITIES.HIGH) {
    score = 65;
    factors.push({ factor: 'high_priority', weight: 0.3, explanation: 'Elevated urban impact' });
  } else if (priority === INCIDENT_PRIORITIES.MEDIUM) {
    score = 40;
    factors.push({ factor: 'medium_priority', weight: 0.2, explanation: 'Moderate municipal disruption' });
  } else {
    factors.push({ factor: 'low_priority', weight: 0.1, explanation: 'Standard maintenance issue' });
  }

  const level: 'low' | 'medium' | 'high' | 'critical' =
    score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low';

  return { score, level, factors };
}

// ── Create Incident ──────────────────────────────────────────

export async function createIncident(
  userId: string,
  organizationId: string,
  data: CreateIncidentDTO,
): Promise<IIncident> {
  const incidentNumber = generateIncidentNumber();
  const publicCoords = fuzzCoordinates(data.location.coordinates[0], data.location.coordinates[1]);
  const isEmergency = data.isEmergency ?? (data.reportingMode === 'emergency');
  const priority = data.priority || (isEmergency ? INCIDENT_PRIORITIES.CRITICAL : INCIDENT_PRIORITIES.MEDIUM);
  const initialRisk = computePreliminaryRisk(priority, isEmergency);

  const incident = new Incident({
    organizationId: new Types.ObjectId(organizationId),
    incidentNumber,
    category: data.category,
    subcategory: data.subcategory,
    title: data.title,
    description: data.description,
    status: INCIDENT_STATUSES.REPORTED,
    priority,
    isEmergency,
    location: {
      type: 'Point',
      coordinates: data.location.coordinates,
      address: data.location.address,
      precisionLevel: 'exact',
      publicCoordinates: publicCoords,
    },
    risk: {
      score: initialRisk.score,
      level: initialRisk.level,
      factors: initialRisk.factors,
      calculatedAt: new Date(),
    },
    ai: {
      detectedObjects: [],
      nlpExtraction: {
        category: data.category,
        issue: data.title,
        severity: priority,
        impact: isEmergency ? 'Immediate danger to safety' : 'Municipal inconvenience',
        potentialRisk: initialRisk.level,
      },
    },
    cluster: {
      isMaster: true,
      linkedReports: [],
      totalReports: 1,
    },
    sla: {
      breached: false,
      escalationLevel: 0,
      deadline: new Date(Date.now() + (isEmergency ? 2 : priority === 'high' ? 12 : 48) * 3600 * 1000),
    },
    reportedBy: new Types.ObjectId(userId),
    evidence: (data.evidenceIds || []).map((id) => new Types.ObjectId(id)),
    resolutionEvidence: [],
    metadata: {
      source: 'web',
      reportingMode: data.reportingMode || 'standard',
    },
    timeline: [
      {
        action: 'REPORTED',
        performedBy: new Types.ObjectId(userId),
        timestamp: new Date(),
        details: { mode: data.reportingMode, isEmergency },
      },
    ],
    tags: [data.category, priority],
  });

  await incident.save();

  logger.info(
    { incidentId: incident._id, incidentNumber: incident.incidentNumber, org: organizationId },
    'Incident created successfully',
  );

  // Real-time broadcasts
  const payload = incident.toJSON();
  emitToOrg(organizationId, SOCKET_EVENTS.INCIDENT_CREATED, payload);
  emitToMap(organizationId, SOCKET_EVENTS.MAP_INCIDENT_ADD, {
    id: incident._id.toString(),
    incidentNumber: incident.incidentNumber,
    category: incident.category,
    coordinates: publicCoords,
    status: incident.status,
    priority: incident.priority,
    isEmergency: incident.isEmergency,
  });

  if (isEmergency) {
    emitEmergency(organizationId, SOCKET_EVENTS.EMERGENCY_ALERT, payload);
  }

  return incident;
}

// ── Query Incidents ──────────────────────────────────────────

export async function getIncidents(
  organizationId: string,
  filters: IncidentFilterOptions,
): Promise<{
  incidents: IIncident[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  const query: Record<string, any> = {
    organizationId: new Types.ObjectId(organizationId),
  };

  if (filters.category) query.category = filters.category;
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.departmentId) query.departmentId = new Types.ObjectId(filters.departmentId);
  if (filters.assignedTo) query.assignedTo = new Types.ObjectId(filters.assignedTo);
  if (filters.reportedBy) query.reportedBy = new Types.ObjectId(filters.reportedBy);
  if (typeof filters.isEmergency === 'boolean') query.isEmergency = filters.isEmergency;

  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { incidentNumber: { $regex: filters.search, $options: 'i' } },
      { 'location.address': { $regex: filters.search, $options: 'i' } },
    ];
  }

  const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
  const sortField = filters.sortBy || 'createdAt';
  const sort: Record<string, any> = { [sortField]: sortOrder };

  const [incidents, total] = await Promise.all([
    Incident.find(query)
      .populate('reportedBy', 'profile email role')
      .populate('assignedTo', 'profile email role')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Incident.countDocuments(query),
  ]);

  return {
    incidents,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ── Get Incident Detail ──────────────────────────────────────

export async function getIncidentById(id: string, organizationId: string): Promise<IIncident> {
  const incident = await Incident.findOne({
    _id: id,
    organizationId: new Types.ObjectId(organizationId),
  })
    .populate('reportedBy', 'profile email role trust')
    .populate('assignedTo', 'profile email role')
    .populate('timeline.performedBy', 'profile role');

  if (!incident) {
    throw new NotFoundError('Incident');
  }

  return incident;
}

// ── Geospatial Query: Nearby Incidents ───────────────────────

export async function getNearbyIncidents(
  organizationId: string,
  lng: number,
  lat: number,
  radiusMeters: number = 5000,
): Promise<IIncident[]> {
  return Incident.find({
    organizationId: new Types.ObjectId(organizationId),
    status: { $nin: [INCIDENT_STATUSES.RESOLVED, INCIDENT_STATUSES.CLOSED, INCIDENT_STATUSES.REJECTED] },
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: radiusMeters,
      },
    },
  })
    .select('incidentNumber category title status priority isEmergency location risk createdAt')
    .limit(50);
}

// ── Update Incident Status (State Machine) ───────────────────

export async function updateIncidentStatus(
  id: string,
  organizationId: string,
  userId: string,
  newStatus: IncidentStatus,
  notes?: string,
): Promise<IIncident> {
  const incident = await Incident.findOne({
    _id: id,
    organizationId: new Types.ObjectId(organizationId),
  });

  if (!incident) {
    throw new NotFoundError('Incident');
  }

  const allowedTransitions = INCIDENT_STATUS_TRANSITIONS[incident.status] || [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new BadRequestError(
      `Invalid status transition from '${incident.status}' to '${newStatus}'. Allowed: ${allowedTransitions.join(', ')}`,
    );
  }

  const previousStatus = incident.status;
  incident.status = newStatus;
  incident.timeline.push({
    action: `STATUS_CHANGED_${newStatus.toUpperCase()}`,
    performedBy: new Types.ObjectId(userId),
    timestamp: new Date(),
    details: { from: previousStatus, to: newStatus, notes },
  });

  await incident.save();

  logger.info({ incidentId: id, from: previousStatus, to: newStatus }, 'Incident status updated');

  const payload = incident.toJSON();
  emitToIncident(id, SOCKET_EVENTS.INCIDENT_STATUS_CHANGED, {
    incidentId: id,
    previousStatus,
    status: newStatus,
    updatedAt: incident.updatedAt,
  });
  emitToOrg(organizationId, SOCKET_EVENTS.INCIDENT_UPDATED, payload);

  return incident;
}

// ── Assign Incident ──────────────────────────────────────────

export async function assignIncident(
  id: string,
  organizationId: string,
  assignedByUserId: string,
  assigneeUserId: string,
  departmentId?: string,
): Promise<IIncident> {
  const incident = await Incident.findOne({
    _id: id,
    organizationId: new Types.ObjectId(organizationId),
  });

  if (!incident) {
    throw new NotFoundError('Incident');
  }

  incident.assignedTo = new Types.ObjectId(assigneeUserId);
  if (departmentId) {
    incident.departmentId = new Types.ObjectId(departmentId);
  }

  // If incident was reported or triaged, advance to assigned
  if (
    incident.status === INCIDENT_STATUSES.REPORTED ||
    incident.status === INCIDENT_STATUSES.TRIAGED ||
    incident.status === INCIDENT_STATUSES.VERIFIED
  ) {
    incident.status = INCIDENT_STATUSES.ASSIGNED;
  }

  incident.timeline.push({
    action: 'ASSIGNED',
    performedBy: new Types.ObjectId(assignedByUserId),
    timestamp: new Date(),
    details: { assignedTo: assigneeUserId, departmentId },
  });

  await incident.save();

  logger.info({ incidentId: id, assignedTo: assigneeUserId }, 'Incident assigned to field worker/officer');

  const payload = incident.toJSON();
  emitToUser(assigneeUserId, SOCKET_EVENTS.INCIDENT_ASSIGNED, payload);
  emitToIncident(id, SOCKET_EVENTS.INCIDENT_UPDATED, payload);
  emitToOrg(organizationId, SOCKET_EVENTS.INCIDENT_UPDATED, payload);

  return incident;
}

// ── Resolve Incident ─────────────────────────────────────────

export async function resolveIncident(
  id: string,
  organizationId: string,
  resolvedByUserId: string,
  notes: string,
  evidenceIds?: string[],
): Promise<IIncident> {
  const incident = await Incident.findOne({
    _id: id,
    organizationId: new Types.ObjectId(organizationId),
  });

  if (!incident) {
    throw new NotFoundError('Incident');
  }

  incident.status = INCIDENT_STATUSES.RESOLVED;
  incident.resolution = {
    resolvedAt: new Date(),
    resolvedBy: new Types.ObjectId(resolvedByUserId),
    resolutionNotes: notes,
    verifiedByHuman: true,
  };

  if (evidenceIds && evidenceIds.length > 0) {
    incident.resolutionEvidence = evidenceIds.map((eid) => new Types.ObjectId(eid));
  }

  incident.timeline.push({
    action: 'RESOLVED',
    performedBy: new Types.ObjectId(resolvedByUserId),
    timestamp: new Date(),
    details: { notes, evidenceCount: evidenceIds?.length || 0 },
  });

  await incident.save();

  logger.info({ incidentId: id, resolvedBy: resolvedByUserId }, 'Incident resolved');

  const payload = incident.toJSON();
  emitToIncident(id, SOCKET_EVENTS.INCIDENT_RESOLVED, payload);
  emitToOrg(organizationId, SOCKET_EVENTS.INCIDENT_RESOLVED, payload);
  emitToUser(incident.reportedBy.toString(), SOCKET_EVENTS.NOTIFICATION_NEW, {
    title: 'Incident Resolved',
    message: `Your report #${incident.incidentNumber} (${incident.title}) has been marked as resolved!`,
    incidentId: id,
  });

  return incident;
}

// ── Community Verification Vote ──────────────────────────────

export async function submitVerificationVote(
  id: string,
  organizationId: string,
  userId: string,
  response: 'yes' | 'no' | 'unsure',
): Promise<IIncident> {
  const incident = await Incident.findOne({
    _id: id,
    organizationId: new Types.ObjectId(organizationId),
  });

  if (!incident) {
    throw new NotFoundError('Incident');
  }

  if (incident.reportedBy.toString() === userId) {
    throw new ForbiddenError('You cannot vote on your own reported incident');
  }

  if (response === 'yes') incident.communityVerification.yesCount += 1;
  else if (response === 'no') incident.communityVerification.noCount += 1;
  else incident.communityVerification.unsureCount += 1;

  const total =
    incident.communityVerification.yesCount +
    incident.communityVerification.noCount +
    incident.communityVerification.unsureCount;

  incident.communityVerification.verificationScore = Math.round(
    ((incident.communityVerification.yesCount) / Math.max(1, total)) * 100,
  );

  // If sufficient positive votes and status is reported, auto-verify
  if (
    incident.status === INCIDENT_STATUSES.REPORTED &&
    incident.communityVerification.yesCount >= 3 &&
    incident.communityVerification.verificationScore >= 70
  ) {
    incident.status = INCIDENT_STATUSES.VERIFIED;
    incident.timeline.push({
      action: 'COMMUNITY_VERIFIED',
      performedBy: new Types.ObjectId(userId),
      timestamp: new Date(),
      details: { verificationScore: incident.communityVerification.verificationScore },
    });
  }

  await incident.save();

  emitToIncident(id, SOCKET_EVENTS.VERIFICATION_RECEIVED, {
    incidentId: id,
    communityVerification: incident.communityVerification,
  });

  return incident;
}

// ── Metrics & Aggregations ───────────────────────────────────

export async function getIncidentMetrics(organizationId: string): Promise<{
  total: number;
  active: number;
  resolved: number;
  emergency: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}> {
  const orgObjId = new Types.ObjectId(organizationId);

  const [total, byStatusAgg, byCategoryAgg, byPriorityAgg, emergency] = await Promise.all([
    Incident.countDocuments({ organizationId: orgObjId }),
    Incident.aggregate([
      { $match: { organizationId: orgObjId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Incident.aggregate([
      { $match: { organizationId: orgObjId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    Incident.aggregate([
      { $match: { organizationId: orgObjId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Incident.countDocuments({ organizationId: orgObjId, isEmergency: true }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const item of byStatusAgg) byStatus[item._id] = item.count;

  const byCategory: Record<string, number> = {};
  for (const item of byCategoryAgg) byCategory[item._id] = item.count;

  const byPriority: Record<string, number> = {};
  for (const item of byPriorityAgg) byPriority[item._id] = item.count;

  const resolved = (byStatus[INCIDENT_STATUSES.RESOLVED] || 0) + (byStatus[INCIDENT_STATUSES.CLOSED] || 0);
  const active = total - resolved - (byStatus[INCIDENT_STATUSES.REJECTED] || 0);

  return {
    total,
    active,
    resolved,
    emergency,
    byCategory,
    byStatus,
    byPriority,
  };
}
