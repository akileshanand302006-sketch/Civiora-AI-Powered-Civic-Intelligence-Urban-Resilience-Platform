// ============================================================
// Session Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface ISession extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  tokenFamily: string;
  refreshTokenHash: string;
  deviceInfo: {
    userAgent: string;
    os: string;
    browser: string;
    deviceType: 'mobile' | 'desktop' | 'tablet';
    deviceName: string;
  };
  ip: string;
  approximateLocation?: string;
  isRevoked: boolean;
  lastActiveAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    tokenFamily: {
      type: String,
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
    },
    deviceInfo: {
      userAgent: { type: String, default: '' },
      os: { type: String, default: 'Unknown' },
      browser: { type: String, default: 'Unknown' },
      deviceType: { type: String, enum: ['mobile', 'desktop', 'tablet'], default: 'desktop' },
      deviceName: { type: String, default: 'Unknown Device' },
    },
    ip: { type: String, required: true },
    approximateLocation: String,
    isRevoked: { type: Boolean, default: false },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        delete ret._id;
        delete ret.__v;
        delete ret.refreshTokenHash;
        return ret;
      },
    },
  },
);

export const Session: Model<ISession> = mongoose.model<ISession>('Session', sessionSchema);
