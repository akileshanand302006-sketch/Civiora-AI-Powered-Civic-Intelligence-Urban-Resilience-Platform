// ============================================================
// Member Invitation Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';
import { ALL_ROLES } from '@civicpulse/shared';

export interface IInvitation extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  email: string;
  role: string;
  departmentId?: Types.ObjectId;
  token: string;
  invitedBy: Types.ObjectId;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    role: {
      type: String,
      required: true,
      enum: ALL_ROLES,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'revoked'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    acceptedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as { toString(): string }).toString();
        delete ret._id;
        delete ret.__v;
        delete ret.token;
        return ret;
      },
    },
  }
);

invitationSchema.index({ organizationId: 1, email: 1, status: 1 });

export const Invitation: Model<IInvitation> = mongoose.model<IInvitation>(
  'Invitation',
  invitationSchema
);
