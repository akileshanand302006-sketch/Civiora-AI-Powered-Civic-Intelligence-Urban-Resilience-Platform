// ============================================================
// Organization Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  type: 'municipality' | 'campus' | 'residential' | 'industrial' | 'smart_city';
  branding: {
    primaryColor: string;
    logoUrl: string;
    favicon: string;
  };
  settings: {
    timezone: string;
    locale: string;
    defaultMapCenter: {
      type: 'Point';
      coordinates: [number, number];
    };
    defaultMapZoom: number;
    locationPrecisionPublic: number;
    evidenceRetentionDays: number;
    autoEscalationEnabled: boolean;
  };
  subscription: {
    plan: 'free' | 'pro' | 'enterprise';
    maxUsers: number;
    maxDepartments: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 100,
      match: /^[a-z0-9-]+$/,
    },
    type: {
      type: String,
      required: true,
      enum: ['municipality', 'campus', 'residential', 'industrial', 'smart_city'],
    },
    branding: {
      primaryColor: { type: String, default: '#0A84FF' },
      logoUrl: { type: String, default: '' },
      favicon: { type: String, default: '' },
    },
    settings: {
      timezone: { type: String, default: 'UTC' },
      locale: { type: String, default: 'en' },
      defaultMapCenter: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
      },
      defaultMapZoom: { type: Number, default: 12 },
      locationPrecisionPublic: { type: Number, default: 200 }, // 200m fuzzing
      evidenceRetentionDays: { type: Number, default: 365 },
      autoEscalationEnabled: { type: Boolean, default: true },
    },
    subscription: {
      plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
      maxUsers: { type: Number, default: 100 },
      maxDepartments: { type: Number, default: 5 },
    },
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
  },
);

// Geospatial index for map center
organizationSchema.index({ 'settings.defaultMapCenter': '2dsphere' });

export const Organization: Model<IOrganization> = mongoose.model<IOrganization>(
  'Organization',
  organizationSchema,
);
