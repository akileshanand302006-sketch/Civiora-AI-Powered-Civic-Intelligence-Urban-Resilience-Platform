// ============================================================
// Civiora - Contact Inquiry Model
// Stores citizen, municipal, and partner inquiries securely
// ============================================================

import { Schema, model, type Document, type Types } from 'mongoose';

export type ContactCategory =
  | 'general'
  | 'support'
  | 'municipal'
  | 'partnership'
  | 'incident_report';

export type ContactInquiryStatus =
  | 'received'
  | 'forwarded_to_email'
  | 'email_delivery_failed'
  | 'resolved';

export interface IContactInquiry extends Document {
  name: string;
  email: string;
  phone?: string;
  category: ContactCategory;
  subject: string;
  message: string;
  incidentId?: Types.ObjectId;
  incidentNumber?: string;
  status: ContactInquiryStatus;
  emailMessageId?: string;
  clientIp?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactInquirySchema = new Schema<IContactInquiry>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    category: {
      type: String,
      required: true,
      enum: ['general', 'support', 'municipal', 'partnership', 'incident_report'],
      default: 'general',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
    },
    incidentNumber: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['received', 'forwarded_to_email', 'email_delivery_failed', 'resolved'],
      default: 'received',
    },
    emailMessageId: {
      type: String,
    },
    clientIp: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

contactInquirySchema.index({ email: 1, createdAt: -1 });
contactInquirySchema.index({ status: 1, createdAt: -1 });

export const ContactInquiry = model<IContactInquiry>('ContactInquiry', contactInquirySchema);
