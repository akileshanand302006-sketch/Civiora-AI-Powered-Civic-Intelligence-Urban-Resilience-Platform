// ============================================================
// Civiora — Official Resolution Document Mongoose Model
// Immutable, versioned civic resolution dossier metadata and SHA-256 checksum
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface IResolutionDocument extends Document {
  _id: Types.ObjectId;
  resolutionId: string;
  incidentId: Types.ObjectId;
  incidentNumber: string;
  organizationId: Types.ObjectId;
  version: number;
  filename: string;
  contentHash: string; // SHA-256 integrity checksum
  pdfBufferBase64?: string; // Cache of generated vector PDF for rapid, authorized delivery
  pdfSizeBytes: number;
  workSessionId?: Types.ObjectId;
  approvedBy: Types.ObjectId;
  verifierName: string;
  workerName: string;
  departmentName?: string;
  startedAt?: Date;
  completedAt?: Date;
  totalDurationSeconds: number;
  activeDurationSeconds: number;
  completionSummary: string;
  inspectionNotes?: string;
  resolutionCategory?: string;
  status: 'approved' | 'superseded';
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const resolutionDocumentSchema = new Schema<IResolutionDocument>(
  {
    resolutionId: {
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
    incidentNumber: {
      type: String,
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    filename: {
      type: String,
      required: true,
    },
    contentHash: {
      type: String,
      required: true,
      index: true,
    },
    pdfBufferBase64: {
      type: String,
      select: false, // excluded by default for query performance
    },
    pdfSizeBytes: {
      type: Number,
      default: 0,
    },
    workSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkSession',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    verifierName: {
      type: String,
      required: true,
    },
    workerName: {
      type: String,
      required: true,
    },
    departmentName: String,
    startedAt: Date,
    completedAt: Date,
    totalDurationSeconds: {
      type: Number,
      default: 0,
    },
    activeDurationSeconds: {
      type: Number,
      default: 0,
    },
    completionSummary: {
      type: String,
      required: true,
    },
    inspectionNotes: String,
    resolutionCategory: String,
    status: {
      type: String,
      enum: ['approved', 'superseded'],
      default: 'approved',
      index: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        ret._id = ret.id;
        delete ret.__v;
        delete ret.pdfBufferBase64;
        return ret;
      },
    },
  }
);

resolutionDocumentSchema.index({ incidentId: 1, version: -1 });

export const ResolutionDocument: Model<IResolutionDocument> = mongoose.model<IResolutionDocument>(
  'ResolutionDocument',
  resolutionDocumentSchema
);
