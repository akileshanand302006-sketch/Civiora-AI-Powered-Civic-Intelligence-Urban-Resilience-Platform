// ============================================================
// Civiora Dispatch Record Model
// Tracks municipal delivery attempts, Resend message IDs & idempotency
// ============================================================

import mongoose, { type Document, Schema, type Types } from 'mongoose';

export type DispatchStatus = 'pending' | 'generating_pdf' | 'sent' | 'failed';

export interface IDispatchRecord extends Document {
  _id: Types.ObjectId;
  incidentId: Types.ObjectId;
  incidentNumber: string;
  recipientEmail: string;
  reporterName: string;
  reporterEmail: string;
  reporterPhone?: string;
  additionalMessage?: string;
  idempotencyKey?: string;
  status: DispatchStatus;
  provider: 'resend' | 'mock';
  providerMessageId?: string;
  pdfSizeBytes?: number;
  errorMessage?: string;
  dispatchedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const dispatchRecordSchema = new Schema<IDispatchRecord>(
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
    recipientEmail: {
      type: String,
      required: true,
    },
    reporterName: {
      type: String,
      required: true,
    },
    reporterEmail: {
      type: String,
      required: true,
    },
    reporterPhone: {
      type: String,
    },
    additionalMessage: {
      type: String,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'generating_pdf', 'sent', 'failed'],
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
    pdfSizeBytes: {
      type: Number,
    },
    errorMessage: {
      type: String,
    },
    dispatchedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const DispatchRecord = mongoose.model<IDispatchRecord>(
  'DispatchRecord',
  dispatchRecordSchema
);
