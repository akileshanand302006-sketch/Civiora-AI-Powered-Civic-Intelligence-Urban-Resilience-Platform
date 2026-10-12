// ============================================================
// AI Prediction / Risk Score Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface IAIPrediction extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  zoneId?: Types.ObjectId;
  infrastructureAssetId?: Types.ObjectId;
  category: string;
  predictedRiskScore: number; // 0-100
  confidence: number; // 0.0 - 1.0
  predictedEvent: string;
  predictionSnippet: string;
  factors: Array<{
    factor: string;
    weight: number;
    description: string;
  }>;
  forecastWindowHours: number;
  validUntil: Date;
  status: 'active' | 'superseded' | 'verified_failure' | 'false_positive';
  createdAt: Date;
  updatedAt: Date;
}

const aiPredictionSchema = new Schema<IAIPrediction>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    zoneId: { type: Schema.Types.ObjectId, ref: 'Zone', index: true },
    infrastructureAssetId: { type: Schema.Types.ObjectId, ref: 'InfrastructureAsset', index: true },
    category: { type: String, required: true, index: true },
    predictedRiskScore: { type: Number, required: true, min: 0, max: 100 },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    predictedEvent: { type: String, required: true },
    predictionSnippet: { type: String, required: true },
    factors: [
      {
        factor: String,
        weight: Number,
        description: String,
      },
    ],
    forecastWindowHours: { type: Number, default: 24 },
    validUntil: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'superseded', 'verified_failure', 'false_positive'],
      default: 'active',
      index: true,
    },
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

aiPredictionSchema.index({ organizationId: 1, category: 1, status: 1 });

export const AIPrediction: Model<IAIPrediction> = mongoose.model<IAIPrediction>(
  'AIPrediction',
  aiPredictionSchema
);
