// ============================================================
// Mobile Offline Sync Record Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface ISyncRecord extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  deviceId: string;
  clientType: 'flutter_mobile' | 'pwa_web';
  lastSyncTimestamp: Date;
  syncedEntities: {
    incidents: number;
    assignments: number;
    notifications: number;
  };
  conflictResolutionStrategy: 'server_wins' | 'client_wins' | 'merge';
  createdAt: Date;
  updatedAt: Date;
}

const syncRecordSchema = new Schema<ISyncRecord>(
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
      index: true,
    },
    deviceId: { type: String, required: true },
    clientType: {
      type: String,
      enum: ['flutter_mobile', 'pwa_web'],
      default: 'flutter_mobile',
    },
    lastSyncTimestamp: { type: Date, default: Date.now },
    syncedEntities: {
      incidents: { type: Number, default: 0 },
      assignments: { type: Number, default: 0 },
      notifications: { type: Number, default: 0 },
    },
    conflictResolutionStrategy: {
      type: String,
      enum: ['server_wins', 'client_wins', 'merge'],
      default: 'server_wins',
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

syncRecordSchema.index({ organizationId: 1, userId: 1, deviceId: 1 }, { unique: true });

export const SyncRecord: Model<ISyncRecord> = mongoose.model<ISyncRecord>(
  'SyncRecord',
  syncRecordSchema
);
