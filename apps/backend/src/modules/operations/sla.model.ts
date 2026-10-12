// ============================================================
// SLA Policy Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface ISLAPolicy extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  category: string;
  priority: string;
  isEmergency: boolean;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  escalationRules: Array<{
    level: number;
    afterMinutes: number;
    notifyRoles: string[];
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const slaPolicySchema = new Schema<ISLAPolicy>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true },
    priority: { type: String, required: true, index: true },
    isEmergency: { type: Boolean, default: false },
    responseTimeMinutes: { type: Number, required: true, default: 30 },
    resolutionTimeMinutes: { type: Number, required: true, default: 240 },
    escalationRules: [
      {
        level: { type: Number, required: true },
        afterMinutes: { type: Number, required: true },
        notifyRoles: [{ type: String }],
      },
    ],
    isActive: { type: Boolean, default: true },
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

slaPolicySchema.index({ organizationId: 1, category: 1, priority: 1 });

export const SLAPolicy: Model<ISLAPolicy> = mongoose.model<ISLAPolicy>(
  'SLAPolicy',
  slaPolicySchema
);
