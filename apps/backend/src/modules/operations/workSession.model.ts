// ============================================================
// Civiora — Work Session Mongoose Model
// Authoritative server-side UTC timestamps, pause/resume tracking,
// active work duration calculation and evidence documentation
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export type SessionStatus = 'active' | 'paused' | 'completed' | 'abandoned';

export interface IPauseInterval {
  pausedAt: Date;
  resumedAt?: Date;
  reason: string;
}

export interface IWorkEvidence {
  url: string;
  caption?: string;
  type: 'before' | 'during' | 'after';
  uploadedAt: Date;
}

export interface IWorkSession extends Document {
  _id: Types.ObjectId;
  workSessionId: string;
  incidentId: Types.ObjectId;
  assignmentId?: Types.ObjectId;
  workerId: Types.ObjectId;
  organizationId: Types.ObjectId;
  startedAt: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  completedAt?: Date;
  elapsedSeconds: number;
  activeWorkSeconds: number;
  sessionStatus: SessionStatus;
  pauseHistory: IPauseInterval[];
  workNotes: string;
  inspectionNotes?: string;
  completionSummary?: string;
  resolutionCategory?: string;
  materialsUsed?: string;
  evidence: IWorkEvidence[];
  createdAt: Date;
  updatedAt: Date;
}

const workSessionSchema = new Schema<IWorkSession>(
  {
    workSessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true,
    },
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      index: true,
    },
    workerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    pausedAt: Date,
    resumedAt: Date,
    completedAt: Date,
    elapsedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    activeWorkSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    sessionStatus: {
      type: String,
      enum: ['active', 'paused', 'completed', 'abandoned'],
      default: 'active',
      index: true,
    },
    pauseHistory: [
      {
        pausedAt: { type: Date, required: true },
        resumedAt: Date,
        reason: { type: String, required: true, trim: true },
      },
    ],
    workNotes: {
      type: String,
      default: '',
    },
    inspectionNotes: {
      type: String,
      default: '',
    },
    completionSummary: {
      type: String,
      default: '',
    },
    resolutionCategory: {
      type: String,
      default: '',
    },
    materialsUsed: {
      type: String,
      default: '',
    },
    evidence: [
      {
        url: { type: String, required: true },
        caption: String,
        type: { type: String, enum: ['before', 'during', 'after'], default: 'during' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        ret._id = ret.id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

workSessionSchema.index({ incidentId: 1, workerId: 1, sessionStatus: 1 });
workSessionSchema.index({ organizationId: 1, startedAt: -1 });

export const WorkSession: Model<IWorkSession> = mongoose.model<IWorkSession>(
  'WorkSession',
  workSessionSchema
);
