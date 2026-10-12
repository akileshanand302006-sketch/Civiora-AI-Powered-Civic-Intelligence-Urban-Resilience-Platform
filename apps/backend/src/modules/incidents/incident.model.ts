// ============================================================
// Incident Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';
import {
  ALL_INCIDENT_CATEGORIES,
  ALL_INCIDENT_STATUSES,
  ALL_INCIDENT_PRIORITIES,
  INCIDENT_STATUSES,
  INCIDENT_PRIORITIES,
  type IncidentCategory,
  type IncidentStatus,
  type IncidentPriority,
} from '@civicpulse/shared';

export interface IIncident extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  incidentNumber: string;
  category: IncidentCategory;
  subcategory?: string;
  title: string;
  description: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  isEmergency: boolean;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    address: string;
    precisionLevel: 'exact' | 'approximate' | 'zone';
    publicCoordinates: [number, number];
  };
  risk: {
    score: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: Array<{
      factor: string;
      weight: number;
      explanation: string;
    }>;
    calculatedAt: Date;
  };
  ai: {
    category?: string;
    confidence?: number;
    severity?: string;
    detectedObjects: string[];
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
    processedAt?: Date;
    modelVersion?: string;
  };
  cluster: {
    masterIncidentId?: Types.ObjectId;
    isMaster: boolean;
    linkedReports: Types.ObjectId[];
    totalReports: number;
  };
  sla: {
    policyId?: Types.ObjectId;
    deadline?: Date;
    breached: boolean;
    escalationLevel: number;
  };
  departmentId?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  reportedBy: Types.ObjectId;
  communityVerification: {
    yesCount: number;
    noCount: number;
    unsureCount: number;
    verificationScore: number;
  };
  evidence: Types.ObjectId[];
  resolutionEvidence: Types.ObjectId[];
  resolution?: {
    resolvedAt: Date;
    resolvedBy: Types.ObjectId;
    resolutionNotes: string;
    aiResolutionConfidence?: number;
    verifiedByHuman: boolean;
  };
  metadata: {
    source: 'web' | 'mobile' | 'api';
    deviceInfo?: Record<string, unknown>;
    reportingMode: 'standard' | 'emergency' | 'voice' | 'quick';
  };
  timeline: Array<{
    action: string;
    performedBy: Types.ObjectId;
    timestamp: Date;
    details?: Record<string, unknown>;
  }>;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const incidentSchema = new Schema<IIncident>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    incidentNumber: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ALL_INCIDENT_CATEGORIES,
      required: true,
      index: true,
    },
    subcategory: { type: String },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    status: {
      type: String,
      enum: ALL_INCIDENT_STATUSES,
      default: INCIDENT_STATUSES.REPORTED,
      index: true,
    },
    priority: {
      type: String,
      enum: ALL_INCIDENT_PRIORITIES,
      default: INCIDENT_PRIORITIES.MEDIUM,
      index: true,
    },
    isEmergency: { type: Boolean, default: false, index: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
      address: { type: String, required: true },
      precisionLevel: {
        type: String,
        enum: ['exact', 'approximate', 'zone'],
        default: 'exact',
      },
      publicCoordinates: {
        type: [Number],
        required: true,
      },
    },
    risk: {
      score: { type: Number, default: 0, min: 0, max: 100 },
      level: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low',
        index: true,
      },
      factors: [
        {
          factor: { type: String },
          weight: { type: Number },
          explanation: { type: String },
        },
      ],
      calculatedAt: { type: Date, default: Date.now },
    },
    ai: {
      category: { type: String },
      confidence: { type: Number },
      severity: { type: String },
      detectedObjects: [{ type: String }],
      boundingBoxes: [
        {
          x: { type: Number },
          y: { type: Number },
          w: { type: Number },
          h: { type: Number },
          label: { type: String },
        },
      ],
      nlpExtraction: {
        category: { type: String },
        issue: { type: String },
        severity: { type: String },
        impact: { type: String },
        potentialRisk: { type: String },
      },
      processedAt: { type: Date },
      modelVersion: { type: String },
    },
    cluster: {
      masterIncidentId: { type: Schema.Types.ObjectId, ref: 'Incident' },
      isMaster: { type: Boolean, default: true },
      linkedReports: [{ type: Schema.Types.ObjectId, ref: 'Incident' }],
      totalReports: { type: Number, default: 1 },
    },
    sla: {
      policyId: { type: Schema.Types.ObjectId },
      deadline: { type: Date },
      breached: { type: Boolean, default: false, index: true },
      escalationLevel: { type: Number, default: 0 },
    },
    departmentId: { type: Schema.Types.ObjectId, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    communityVerification: {
      yesCount: { type: Number, default: 0 },
      noCount: { type: Number, default: 0 },
      unsureCount: { type: Number, default: 0 },
      verificationScore: { type: Number, default: 0 },
    },
    evidence: [{ type: Schema.Types.ObjectId, ref: 'Evidence' }],
    resolutionEvidence: [{ type: Schema.Types.ObjectId, ref: 'Evidence' }],
    resolution: {
      resolvedAt: { type: Date },
      resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      resolutionNotes: { type: String },
      aiResolutionConfidence: { type: Number },
      verifiedByHuman: { type: Boolean, default: true },
    },
    metadata: {
      source: {
        type: String,
        enum: ['web', 'mobile', 'api'],
        default: 'web',
      },
      deviceInfo: { type: Schema.Types.Mixed },
      reportingMode: {
        type: String,
        enum: ['standard', 'emergency', 'voice', 'quick'],
        default: 'standard',
      },
    },
    timeline: [
      {
        action: { type: String, required: true },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        timestamp: { type: Date, default: Date.now },
        details: { type: Schema.Types.Mixed },
      },
    ],
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Indexes
incidentSchema.index({ organizationId: 1, incidentNumber: 1 }, { unique: true });
incidentSchema.index({ organizationId: 1, status: 1, priority: 1 });
incidentSchema.index({ organizationId: 1, category: 1 });
incidentSchema.index({ organizationId: 1, createdAt: -1 });
incidentSchema.index({ 'location.coordinates': '2dsphere' });
incidentSchema.index({ 'location.publicCoordinates': '2dsphere' });

export const Incident: Model<IIncident> = mongoose.model<IIncident>('Incident', incidentSchema);
