// ============================================================
// Civiora — Tamper-Evident Incident Event History Mongoose Model
// Append-only cryptographic SHA-256 hash chaining for full auditability
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';
import crypto from 'crypto';

export interface IIncidentEvent extends Document {
  _id: Types.ObjectId;
  incidentId: Types.ObjectId;
  organizationId: Types.ObjectId;
  actorId: Types.ObjectId;
  action: string;
  eventType: string;
  fromStatus?: string;
  toStatus?: string;
  notes?: string;
  changeSummary?: string;
  reason?: string;
  correlationId?: string;
  payload?: Record<string, unknown>;
  previousEventHash: string;
  eventHash: string;
  schemaVersion: string;
  createdAt: Date;
}

const incidentEventSchema = new Schema<IIncidentEvent>(
  {
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      default: 'INCIDENT_ACTION',
      index: true,
    },
    fromStatus: String,
    toStatus: String,
    notes: String,
    changeSummary: String,
    reason: String,
    correlationId: {
      type: String,
      index: true,
    },
    payload: { type: Schema.Types.Mixed },
    previousEventHash: {
      type: String,
      required: true,
      default: '0'.repeat(64),
    },
    eventHash: {
      type: String,
      required: true,
      index: true,
    },
    schemaVersion: {
      type: String,
      default: '1.0',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        ret._id = ret.id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

incidentEventSchema.index({ organizationId: 1, incidentId: 1, createdAt: -1 });
incidentEventSchema.index({ incidentId: 1, createdAt: 1 });

/**
 * Computes canonical SHA-256 digest of an event payload
 */
export function computeEventHash(params: {
  previousEventHash: string;
  incidentId: string;
  actorId: string;
  action: string;
  eventType: string;
  fromStatus?: string;
  toStatus?: string;
  changeSummary?: string;
  reason?: string;
  timestamp: string;
}): string {
  const canonicalString = [
    params.previousEventHash,
    params.incidentId,
    params.actorId,
    params.eventType,
    params.action,
    params.fromStatus || '',
    params.toStatus || '',
    params.changeSummary || '',
    params.reason || '',
    params.timestamp,
  ].join('|');

  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

/**
 * Appends an auditable, hash-chained event to the incident's ledger
 */
export async function recordChainedIncidentEvent(params: {
  incidentId: Types.ObjectId | string;
  organizationId: Types.ObjectId | string;
  actorId: Types.ObjectId | string;
  action: string;
  eventType?: string;
  fromStatus?: string;
  toStatus?: string;
  notes?: string;
  changeSummary?: string;
  reason?: string;
  correlationId?: string;
  payload?: Record<string, unknown>;
}): Promise<IIncidentEvent> {
  const incId = new mongoose.Types.ObjectId(params.incidentId);
  const orgId = new mongoose.Types.ObjectId(params.organizationId);
  const actId = new mongoose.Types.ObjectId(params.actorId);

  // Find the most recent event to continue the hash chain
  const latestEvent = await IncidentEvent.findOne({ incidentId: incId }).sort({ createdAt: -1 });
  const previousEventHash = latestEvent?.eventHash || '0'.repeat(64);

  const now = new Date();
  const eventType = params.eventType || params.action;

  const eventHash = computeEventHash({
    previousEventHash,
    incidentId: String(incId),
    actorId: String(actId),
    action: params.action,
    eventType,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    changeSummary: params.changeSummary || params.notes,
    reason: params.reason,
    timestamp: now.toISOString(),
  });

  return IncidentEvent.create({
    incidentId: incId,
    organizationId: orgId,
    actorId: actId,
    action: params.action,
    eventType,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    notes: params.notes,
    changeSummary: params.changeSummary,
    reason: params.reason,
    correlationId: params.correlationId,
    payload: params.payload,
    previousEventHash,
    eventHash,
    schemaVersion: '1.0',
    createdAt: now,
  });
}

/**
 * Verifies cryptographic integrity of an incident's event chain
 */
export async function verifyIncidentAuditChain(incidentId: Types.ObjectId | string): Promise<{
  valid: boolean;
  length: number;
  events: Array<{
    action: string;
    eventType: string;
    eventHash: string;
    previousEventHash: string;
    timestamp: Date;
    verified: boolean;
  }>;
  error?: string;
}> {
  const incId = new mongoose.Types.ObjectId(incidentId);
  const events = await IncidentEvent.find({ incidentId: incId }).sort({ createdAt: 1 });

  if (events.length === 0) {
    return { valid: true, length: 0, events: [] };
  }

  let expectedPreviousHash = '0'.repeat(64);
  const verifiedList = [];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!;
    const hashMatchesPrevious = ev.previousEventHash === expectedPreviousHash;

    const recalculatedHash = computeEventHash({
      previousEventHash: ev.previousEventHash,
      incidentId: String(ev.incidentId),
      actorId: String(ev.actorId),
      action: ev.action,
      eventType: ev.eventType,
      fromStatus: ev.fromStatus,
      toStatus: ev.toStatus,
      changeSummary: ev.changeSummary || ev.notes,
      reason: ev.reason,
      timestamp: ev.createdAt.toISOString(),
    });

    const hashSelfValid = recalculatedHash === ev.eventHash;
    const isLinkValid = hashMatchesPrevious && hashSelfValid;

    verifiedList.push({
      action: ev.action,
      eventType: ev.eventType,
      eventHash: ev.eventHash,
      previousEventHash: ev.previousEventHash,
      timestamp: ev.createdAt,
      verified: isLinkValid,
    });

    if (!isLinkValid) {
      return {
        valid: false,
        length: events.length,
        events: verifiedList,
        error: `Integrity breach detected at index ${i} (Event ID: ${ev._id}). Expected prev: ${expectedPreviousHash}, Found: ${ev.previousEventHash}`,
      };
    }

    expectedPreviousHash = ev.eventHash;
  }

  return {
    valid: true,
    length: events.length,
    events: verifiedList,
  };
}

export const IncidentEvent: Model<IIncidentEvent> = mongoose.model<IIncidentEvent>(
  'IncidentEvent',
  incidentEventSchema
);
