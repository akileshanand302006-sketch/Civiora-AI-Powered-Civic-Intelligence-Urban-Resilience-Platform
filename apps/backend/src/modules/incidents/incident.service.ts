// ============================================================
// Incident Service
// ============================================================
// Core business logic for incident reporting, querying, assignment,
// status state machine transitions, and real-time broadcasting.
// ============================================================

import { Types } from 'mongoose';
import { Incident, type IIncident } from './incident.model.js';
import { User } from '../users/user.model.js';
import { Notification } from '../notifications/notification.model.js';
import {
  INCIDENT_STATUSES,
  INCIDENT_STATUS_TRANSITIONS,
  INCIDENT_PRIORITIES,
  SOCKET_EVENTS,
  mapAiCategoryToCanonical,
  type IncidentCategory,
  type IncidentStatus,
  type IncidentPriority,
  TAMIL_NADU_DISTRICTS,
} from '@civicpulse/shared';
import {
  NotFoundError,
  BadRequestError,
  ValidationError,
  ForbiddenError,
} from '../../utils/errors.js';
import { dispatchIncidentLifecycleNotification } from '../notifications/emailNotification.service.js';
import { emitInngestEvent } from '../../inngest/index.js';
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
  ai?: {
    category?: string;
    confidence?: number;
    severity?: string;
    detectedObjects?: string[];
    boundingBoxes?: Array<{
      x: number;
      y: number;
      w: number;
      h: number;
      label: string;
    }>;
    nlpExtraction?: {
      category: string;
      issue: string;
      severity: string;
      impact: string;
      potentialRisk: string;
    };
    processedAt?: string | Date;
    modelVersion?: string;
  };
  aiInferenceId?: string;
  severityScore?: number;
}

export interface IncidentFilterOptions {
  page?: number;
  limit?: number;
  category?: IncidentCategory;
  status?: string;
  priority?: IncidentPriority;
  departmentId?: string;
  isEmergency?: boolean;
  emergencyOnly?: boolean;
  myReports?: boolean;
  assignedToMe?: boolean;
  assignedTo?: string;
  reportedBy?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  districtId?: string;
  bounds?: string; // sw_lng,sw_lat,ne_lng,ne_lat
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
  if (
    !data.location?.coordinates ||
    !Array.isArray(data.location.coordinates) ||
    data.location.coordinates.length !== 2
  ) {
    throw new BadRequestError('Valid GeoJSON [longitude, latitude] coordinates are required');
  }

  const [lng, lat] = data.location.coordinates;
  if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
    throw new BadRequestError('Coordinates must be valid numbers');
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new BadRequestError('Latitude must be between -90 and 90, Longitude between -180 and 180');
  }

  const incidentNumber = generateIncidentNumber();
  const publicCoords = fuzzCoordinates(lng, lat);
  const isEmergency = data.isEmergency ?? (data.reportingMode === 'emergency');
  const priority = data.priority || (isEmergency ? INCIDENT_PRIORITIES.CRITICAL : INCIDENT_PRIORITIES.MEDIUM);
  const initialRisk = computePreliminaryRisk(priority, isEmergency);

  // Calibrate risk score if AI Severity Engine score is provided
  let finalRiskScore = initialRisk.score;
  let finalRiskLevel = initialRisk.level;
  const riskFactors = [...initialRisk.factors];

  if (typeof data.severityScore === 'number' && !isNaN(data.severityScore)) {
    finalRiskScore = Math.max(initialRisk.score, Math.round(data.severityScore));
    finalRiskLevel =
      finalRiskScore >= 80 ? 'critical' : finalRiskScore >= 60 ? 'high' : finalRiskScore >= 35 ? 'medium' : 'low';
    riskFactors.push({
      factor: 'ai_vision_severity',
      weight: 0.4,
      explanation: `Calibrated AI visual hazard severity score: ${data.severityScore}/100`,
    });
  }

  const canonicalCategory = mapAiCategoryToCanonical(data.category);
  const canonicalAiCategory = mapAiCategoryToCanonical(data.ai?.category || data.category);

  const incident = new Incident({
    organizationId: new Types.ObjectId(organizationId),
    incidentNumber,
    category: canonicalCategory,
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
      score: finalRiskScore,
      level: finalRiskLevel,
      factors: riskFactors,
      calculatedAt: new Date(),
    },
    ai: {
      category: canonicalAiCategory,
      confidence: data.ai?.confidence,
      severity: data.ai?.severity || priority,
      detectedObjects: data.ai?.detectedObjects || [],
      boundingBoxes: data.ai?.boundingBoxes,
      nlpExtraction: data.ai?.nlpExtraction || {
        category: canonicalCategory,
        issue: data.title,
        severity: priority,
        impact: isEmergency ? 'Immediate danger to safety' : 'Municipal inconvenience',
        potentialRisk: finalRiskLevel,
      },
      processedAt: data.ai?.processedAt ? new Date(data.ai.processedAt) : new Date(),
      modelVersion: data.ai?.modelVersion || 'Civiora-Multimodal-Pipeline-v1.0',
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
    tags: [canonicalCategory, priority],
  });

  await incident.save();

  // Link AIInference document in MongoDB Atlas if ID provided
  if (data.aiInferenceId) {
    try {
      const { AIInference } = await import('../ai/aiInference.model.js');
      await AIInference.findByIdAndUpdate(data.aiInferenceId, {
        incidentId: incident._id,
      });
      logger.info(
        { aiInferenceId: data.aiInferenceId, incidentId: incident._id },
        'Linked AIInference record to newly created Incident in MongoDB Atlas'
      );
    } catch (linkErr) {
      logger.warn({ err: linkErr }, 'Could not link AIInference to Incident');
    }
  }

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

  // Notify municipal admins, officers, and field workers
  try {
    const staffQuery: any = {
      role: { $in: ['officer', 'manager', 'tenant_admin', 'field_worker', 'system_admin'] },
      isActive: true,
    };
    if (organizationId && Types.ObjectId.isValid(organizationId)) {
      staffQuery.organizationId = new Types.ObjectId(organizationId);
    }
    const municipalStaff = await User.find(staffQuery).select('_id role email');

    if (municipalStaff.length > 0) {
      const notifs = municipalStaff.map((staff) => ({
        userId: staff._id,
        organizationId: incident.organizationId,
        type: isEmergency ? 'EMERGENCY_INCIDENT' : 'INCIDENT_CREATED',
        title: isEmergency ? '🚨 Critical Emergency Incident' : 'New Civic Hazard Reported',
        message: `${incident.incidentNumber}: ${incident.title} (${incident.location?.address || 'Municipal Sector'})`,
        data: {
          incidentId: incident._id,
          incidentNumber: incident.incidentNumber,
          category: incident.category,
          priority: incident.priority,
          isEmergency,
        },
        channels: ['in_app', 'email'],
        isRead: false,
      }));
      await Notification.insertMany(notifs);

      // Real-time socket notification to individual staff
      for (const staff of municipalStaff) {
        emitToUser(staff._id.toString(), SOCKET_EVENTS.NOTIFICATION_NEW, {
          title: isEmergency ? '🚨 Critical Emergency Incident' : 'New Civic Hazard Reported',
          message: `${incident.incidentNumber}: ${incident.title}`,
          incidentId: incident._id.toString(),
          incidentNumber: incident.incidentNumber,
        });
      }
    }
    // Trigger automated role notifications via Resend (Field Worker, System Admin, Dept Manager) with PDF dossier
    dispatchIncidentLifecycleNotification({
      incident,
      eventType: 'INCIDENT_REPORTED',
    }).catch((emailErr) => {
      logger.warn({ err: emailErr.message }, '[createIncident] Automated lifecycle email notification notice');
    });
  } catch (notifErr) {
    logger.warn({ err: notifErr }, 'Could not broadcast municipal staff notifications');
  }

  return incident;
}

// ── Query Incidents ──────────────────────────────────────────

export async function getIncidents(
  organizationId: string | undefined,
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

  const query: Record<string, any> = {};

  if (organizationId && Types.ObjectId.isValid(organizationId)) {
    query.organizationId = new Types.ObjectId(organizationId);
  }

  if (filters.category) query.category = filters.category;
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.departmentId && Types.ObjectId.isValid(filters.departmentId)) {
    query.departmentId = new Types.ObjectId(filters.departmentId);
  }
  if (filters.assignedTo && Types.ObjectId.isValid(filters.assignedTo)) {
    query.assignedTo = new Types.ObjectId(filters.assignedTo);
  }
  if (filters.reportedBy && Types.ObjectId.isValid(filters.reportedBy)) {
    query.reportedBy = new Types.ObjectId(filters.reportedBy);
  }
  if (typeof filters.isEmergency === 'boolean') {
    query.isEmergency = filters.isEmergency;
  }
  if (filters.emergencyOnly) {
    query.$or = [{ isEmergency: true }, { priority: 'critical' }, { 'risk.level': 'critical' }];
  }

  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { incidentNumber: { $regex: filters.search, $options: 'i' } },
      { 'location.address': { $regex: filters.search, $options: 'i' } },
    ];
  }

  // Geospatial Viewport Bounds & District Filtering
  if (filters.bounds) {
    const parts = filters.bounds.split(',').map((p) => parseFloat(p.trim()));
    if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
      const [sw_lng, sw_lat, ne_lng, ne_lat] = parts;
      query['location.coordinates'] = {
        $geoWithin: {
          $box: [
            [sw_lng, sw_lat],
            [ne_lng, ne_lat],
          ],
        },
      };
    }
  } else if (filters.districtId && filters.districtId !== 'all') {
    const dist = TAMIL_NADU_DISTRICTS.find((d) => d.id === filters.districtId);
    if (dist) {
      query['location.coordinates'] = {
        $geoWithin: {
          $box: [
            [dist.bounds.west, dist.bounds.south],
            [dist.bounds.east, dist.bounds.north],
          ],
        },
      };
    }
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

export async function getIncidentById(id: string, _organizationId?: string): Promise<IIncident> {
  const query: Record<string, any> = Types.ObjectId.isValid(id)
    ? { _id: new Types.ObjectId(id) }
    : { incidentNumber: id };

  const incident = await Incident.findOne(query)
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
  organizationId: string | undefined,
  lng: number,
  lat: number,
  radiusMeters: number = 5000,
): Promise<IIncident[]> {
  const query: Record<string, any> = {
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
  };
  if (organizationId && Types.ObjectId.isValid(organizationId)) {
    query.organizationId = new Types.ObjectId(organizationId);
  }

  return Incident.find(query)
    .select('incidentNumber category title status priority isEmergency location risk createdAt')
    .limit(50);
}

// ── Update Incident Status (State Machine) ───────────────────

export async function updateIncidentStatus(
  id: string,
  _organizationId: string,
  userId: string,
  newStatus: IncidentStatus,
  notes?: string,
): Promise<IIncident> {
  const incident = await Incident.findById(id);

  if (!incident) {
    throw new NotFoundError('Incident');
  }

  // Idempotent status check: if requested status matches current status, treat as operational update/note
  if (incident.status === newStatus) {
    if (notes) {
      incident.timeline.push({
        action: 'OPERATIONAL_NOTE_ADDED',
        performedBy: new Types.ObjectId(userId),
        timestamp: new Date(),
        details: { notes, status: incident.status },
      });
      await incident.save();
      const payload = incident.toJSON();
      if (incident.organizationId) {
        emitToOrg(incident.organizationId.toString(), SOCKET_EVENTS.INCIDENT_UPDATED, payload);
      }
    }
    return incident;
  }

  const allowedTransitions = INCIDENT_STATUS_TRANSITIONS[incident.status] || [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new ValidationError(
      `Invalid status transition from '${incident.status}' to '${newStatus}'. Allowed: ${allowedTransitions.join(', ')}`,
      {
        currentState: incident.status,
        attemptedState: newStatus,
        allowedTransitions,
      }
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
  if (incident.organizationId) {
    emitToOrg(incident.organizationId.toString(), SOCKET_EVENTS.INCIDENT_UPDATED, payload);
  }

  return incident;
}

// ── Assign Incident ──────────────────────────────────────────

export async function assignIncident(
  id: string,
  _organizationId: string,
  assignedByUserId: string,
  assigneeUserId: string,
  departmentId?: string,
): Promise<IIncident> {
  const incident = await Incident.findById(id);

  if (!incident) {
    throw new NotFoundError('Incident');
  }

  incident.assignedTo = new Types.ObjectId(assigneeUserId);
  if (departmentId && Types.ObjectId.isValid(departmentId)) {
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
  if (incident.organizationId) {
    emitToOrg(incident.organizationId.toString(), SOCKET_EVENTS.INCIDENT_UPDATED, payload);
  }

  // Trigger Inngest automated SLA delays workflow
  emitInngestEvent('incident/assigned', {
    incidentId: incident._id.toString(),
    incidentNumber: incident.incidentNumber,
    priority: incident.priority,
    assignedTo: assigneeUserId,
    slaHours: incident.priority === 'critical' ? 2 : incident.priority === 'high' ? 12 : 24,
    assignedAt: new Date().toISOString(),
  });

  // Trigger automated assignment role notifications via Resend
  dispatchIncidentLifecycleNotification({
    incident,
    eventType: 'INCIDENT_ASSIGNED',
  }).catch((emailErr) => {
    logger.warn({ err: emailErr.message }, '[assignIncident] Automated assignment email notification notice');
  });

  return incident;
}

// ── Resolve Incident ─────────────────────────────────────────

export async function resolveIncident(
  id: string,
  _organizationId: string,
  resolvedByUserId: string,
  notes: string,
  evidenceIds?: string[],
): Promise<IIncident> {
  const incident = await Incident.findById(id);

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
  emitToOrg(incident.organizationId?.toString() || _organizationId, SOCKET_EVENTS.INCIDENT_RESOLVED, payload);
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
