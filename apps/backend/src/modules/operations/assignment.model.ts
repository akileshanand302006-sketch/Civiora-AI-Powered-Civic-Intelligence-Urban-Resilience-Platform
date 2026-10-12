// ============================================================
// Field Assignment / Work Order Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export type AssignmentStatus =
  | 'assigned'
  | 'accepted'
  | 'en_route'
  | 'on_site'
  | 'in_progress'
  | 'evidence_submitted'
  | 'verification'
  | 'completed'
  | 'rejected'
  | 'reassigned';

export interface IAssignment extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  incidentId: Types.ObjectId;
  assignedTo: Types.ObjectId;
  assignedBy: Types.ObjectId;
  departmentId?: Types.ObjectId;
  status: AssignmentStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  notes: string;
  slaDeadline?: Date;
  slaBreached: boolean;
  workerLocation?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    updatedAt: Date;
  };
  timeline: Array<{
    status: AssignmentStatus;
    timestamp: Date;
    location?: { type: 'Point'; coordinates: [number, number] };
    notes?: string;
  }>;
  resolutionEvidence: Types.ObjectId[];
  resolutionProofHash?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'assigned',
        'accepted',
        'en_route',
        'on_site',
        'in_progress',
        'evidence_submitted',
        'verification',
        'completed',
        'rejected',
        'reassigned',
      ],
      default: 'assigned',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    notes: { type: String, default: '' },
    slaDeadline: { type: Date, index: true },
    slaBreached: { type: Boolean, default: false, index: true },
    workerLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
      updatedAt: { type: Date, default: Date.now },
    },
    timeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        location: {
          type: { type: String, enum: ['Point'], default: 'Point' },
          coordinates: { type: [Number] },
        },
        notes: String,
      },
    ],
    resolutionEvidence: [{ type: Schema.Types.ObjectId, ref: 'Evidence' }],
    resolutionProofHash: String,
    completedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

assignmentSchema.index({ organizationId: 1, assignedTo: 1, status: 1 });
assignmentSchema.index({ 'workerLocation.coordinates': '2dsphere' }, { sparse: true });

export const Assignment: Model<IAssignment> = mongoose.model<IAssignment>(
  'Assignment',
  assignmentSchema
);
