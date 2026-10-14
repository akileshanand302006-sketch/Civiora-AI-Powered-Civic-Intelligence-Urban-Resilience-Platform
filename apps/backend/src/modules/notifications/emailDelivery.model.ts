// ============================================================
// Civiora — Email Delivery Record Model
// Durable audit log for role-based notifications, Resend message IDs,
// idempotency keys, and delivery status tracking
// ============================================================

import mongoose, { type Document, Schema, type Types } from 'mongoose';

export type EmailDeliveryStatus =
  | 'pending'
  | 'sending'
  | 'accepted'
  | 'delivered'
  | 'failed'
  | 'retry_scheduled';

export type EmailEventType =
  | 'INCIDENT_REPORTED'
  | 'INCIDENT_ASSIGNED'
  | 'WORK_STARTED'
  | 'WORK_COMPLETED'
  | 'RESOLUTION_APPROVED';

export interface IEmailDeliveryRecord extends Document {
  _id: Types.ObjectId;
  incidentId: Types.ObjectId;
  incidentNumber: string;
  eventType: EmailEventType;
  recipientEmail: string;
  recipientRole?: string;
  subject: string;
  template: string;
  idempotencyKey: string;
  status: EmailDeliveryStatus;
  provider: 'resend' | 'mock';
  providerMessageId?: string;
  attemptCount: number;
  lastAttemptAt?: Date;
  lastError?: string;
  hasAttachment: boolean;
  attachmentFilename?: string;
  createdAt: Date;
  updatedAt: Date;
}

const emailDeliveryRecordSchema = new Schema<IEmailDeliveryRecord>(
  {
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true,
    },
    incidentNumber: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        'INCIDENT_REPORTED',
        'INCIDENT_ASSIGNED',
        'WORK_STARTED',
        'WORK_COMPLETED',
        'RESOLUTION_APPROVED',
      ],
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
    },
    subject: {
      type: String,
      required: true,
    },
    template: {
      type: String,
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sending', 'accepted', 'delivered', 'failed', 'retry_scheduled'],
      default: 'pending',
      index: true,
    },
    provider: {
      type: String,
      enum: ['resend', 'mock'],
      default: 'resend',
    },
    providerMessageId: {
      type: String,
    },
    attemptCount: {
      type: Number,
      default: 1,
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
    lastError: {
      type: String,
    },
    hasAttachment: {
      type: Boolean,
      default: false,
    },
    attachmentFilename: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

emailDeliveryRecordSchema.index({ incidentId: 1, eventType: 1, recipientEmail: 1 });

export const EmailDeliveryRecord = mongoose.model<IEmailDeliveryRecord>(
  'EmailDeliveryRecord',
  emailDeliveryRecordSchema
);
