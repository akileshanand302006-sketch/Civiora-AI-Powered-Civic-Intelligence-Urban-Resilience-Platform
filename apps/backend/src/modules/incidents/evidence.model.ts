// ============================================================
// Incident Evidence Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export type EvidenceType = 'image' | 'video' | 'audio' | 'document';
export type EvidencePhase = 'report' | 'before' | 'during' | 'after';

export interface IEvidence extends Document {
  _id: Types.ObjectId;
  incidentId: Types.ObjectId;
  organizationId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  type: EvidenceType;
  phase: EvidencePhase;
  storageKey: string;
  storageUrl: string;
  mimeType: string;
  fileSize: number;
  perceptualHash?: string;
  sha256Hash?: string;
  dimensions?: { width: number; height: number };
  metadata: {
    capturedAt?: Date;
    capturedLocation?: {
      type: 'Point';
      coordinates: [number, number]; // [lng, lat]
    };
    deviceInfo?: string;
    cameraExif?: Record<string, unknown>;
  };
  aiAnalysis?: {
    labels: string[];
    confidence: number;
    detectedIssues: string[];
    isTampered?: boolean;
  };
  isVerified: boolean;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const evidenceSchema = new Schema<IEvidence>(
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
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'document'],
      default: 'image',
    },
    phase: {
      type: String,
      enum: ['report', 'before', 'during', 'after'],
      default: 'report',
      index: true,
    },
    storageKey: { type: String, required: true },
    storageUrl: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    perceptualHash: { type: String, index: true },
    sha256Hash: { type: String },
    dimensions: {
      width: Number,
      height: Number,
    },
    metadata: {
      capturedAt: { type: Date },
      capturedLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] },
      },
      deviceInfo: { type: String },
      cameraExif: { type: Schema.Types.Mixed },
    },
    aiAnalysis: {
      labels: [{ type: String }],
      confidence: { type: Number },
      detectedIssues: [{ type: String }],
      isTampered: { type: Boolean, default: false },
    },
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
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

evidenceSchema.index({ organizationId: 1, incidentId: 1, phase: 1 });
evidenceSchema.index({ 'metadata.capturedLocation.coordinates': '2dsphere' }, { sparse: true });

export const Evidence: Model<IEvidence> = mongoose.model<IEvidence>('Evidence', evidenceSchema);
