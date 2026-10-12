// ============================================================
// Community Verification Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface ICommunityVerification extends Document {
  _id: Types.ObjectId;
  incidentId: Types.ObjectId;
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  vote: 'confirm' | 'reject' | 'unsure';
  confidenceScore: number;
  userTrustWeight: number;
  notes?: string;
  verifierLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
  distanceToIncidentMeters?: number;
  createdAt: Date;
}

const communityVerificationSchema = new Schema<ICommunityVerification>(
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vote: {
      type: String,
      enum: ['confirm', 'reject', 'unsure'],
      required: true,
    },
    confidenceScore: { type: Number, default: 1.0, min: 0, max: 1 },
    userTrustWeight: { type: Number, default: 1.0 },
    notes: { type: String, maxlength: 500 },
    verifierLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
    },
    distanceToIncidentMeters: { type: Number },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

// One vote per user per incident
communityVerificationSchema.index({ incidentId: 1, userId: 1 }, { unique: true });
communityVerificationSchema.index({ organizationId: 1, incidentId: 1 });
communityVerificationSchema.index({ 'verifierLocation.coordinates': '2dsphere' }, { sparse: true });

export const CommunityVerification: Model<ICommunityVerification> = mongoose.model<ICommunityVerification>(
  'CommunityVerification',
  communityVerificationSchema
);
