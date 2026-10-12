// ============================================================
// AI Inference & Vision Detection Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface IAIInference extends Document {
  _id: Types.ObjectId;
  incidentId: Types.ObjectId;
  evidenceId?: Types.ObjectId;
  organizationId: Types.ObjectId;
  modelName: string;
  modelVersion: string;
  detectedCategory: string;
  confidence: number;
  detectedObjects: string[];
  boundingBoxes: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    confidence: number;
  }>;
  nlpSummary?: {
    issue: string;
    severity: string;
    impact: string;
    potentialRisk: string;
  };
  processingDurationMs: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const aiInferenceSchema = new Schema<IAIInference>(
  {
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true,
    },
    evidenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Evidence',
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    modelName: { type: String, required: true },
    modelVersion: { type: String, required: true },
    detectedCategory: { type: String, required: true },
    confidence: { type: Number, required: true },
    detectedObjects: [{ type: String }],
    boundingBoxes: [
      {
        x: Number,
        y: Number,
        w: Number,
        h: Number,
        label: String,
        confidence: Number,
      },
    ],
    nlpSummary: {
      issue: String,
      severity: String,
      impact: String,
      potentialRisk: String,
    },
    processingDurationMs: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed },
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

aiInferenceSchema.index({ organizationId: 1, incidentId: 1 });

export const AIInference: Model<IAIInference> = mongoose.model<IAIInference>(
  'AIInference',
  aiInferenceSchema
);
