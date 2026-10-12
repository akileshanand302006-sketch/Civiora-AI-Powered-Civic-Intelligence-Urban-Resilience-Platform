// ============================================================
// Security Threat & Event Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export type SecurityEventType =
  | 'failed_login'
  | 'brute_force'
  | 'suspicious_login'
  | 'mfa_failure'
  | 'rate_limit'
  | 'unauthorized_access'
  | 'token_reuse'
  | 'session_anomaly'
  | 'api_anomaly';

export interface ISecurityEvent extends Document {
  _id: Types.ObjectId;
  organizationId?: Types.ObjectId;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: Types.ObjectId;
  ip: string;
  details: Record<string, unknown>;
  isResolved: boolean;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  timestamp: Date;
}

const securityEventSchema = new Schema<ISecurityEvent>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    ip: { type: String, required: true, index: true },
    details: { type: Schema.Types.Mixed, default: {} },
    isResolved: { type: Boolean, default: false, index: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
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

securityEventSchema.index({ organizationId: 1, type: 1, timestamp: -1 });
securityEventSchema.index({ ip: 1, timestamp: -1 });

export const SecurityEvent: Model<ISecurityEvent> = mongoose.model<ISecurityEvent>(
  'SecurityEvent',
  securityEventSchema
);
