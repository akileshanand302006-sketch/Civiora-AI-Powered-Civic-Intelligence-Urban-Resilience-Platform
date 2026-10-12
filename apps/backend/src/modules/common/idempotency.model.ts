// ============================================================
// Idempotency Key Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface IIdempotencyKey extends Document {
  _id: Types.ObjectId;
  key: string;
  organizationId: Types.ObjectId;
  userId?: Types.ObjectId;
  endpoint: string;
  responseStatus: number;
  responseBody: Record<string, unknown>;
  expiresAt: Date;
  createdAt: Date;
}

const idempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    key: {
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    endpoint: { type: String, required: true },
    responseStatus: { type: Number, required: true },
    responseBody: { type: Schema.Types.Mixed, required: true },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

idempotencyKeySchema.index({ organizationId: 1, key: 1 }, { unique: true });

export const IdempotencyKey: Model<IIdempotencyKey> = mongoose.model<IIdempotencyKey>(
  'IdempotencyKey',
  idempotencyKeySchema
);
