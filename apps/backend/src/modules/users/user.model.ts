// ============================================================
// User Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';
import { ALL_ROLES } from '@civicpulse/shared';

export interface ISavedLocation {
  _id?: Types.ObjectId;
  name: string;
  type: 'home' | 'college' | 'work' | 'other';
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude] GeoJSON
    formattedAddress: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    placeId?: string;
  };
  isDefault: boolean;
  createdAt: Date;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  email: string;
  passwordHash: string;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    avatarUrl?: string;
  };
  role: string;
  permissions: string[];
  departmentId?: Types.ObjectId;
  savedLocations: ISavedLocation[];
  lastSelectedLocation?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    formattedAddress: string;
    city?: string;
    state?: string;
    selectedAt: Date;
  };
  trust: {
    score: number;
    verifiedReports: number;
    falseReports: number;
    spamFlags: number;
    lastUpdated: Date;
  };
  security: {
    mfaEnabled: boolean;
    mfaSecret?: string;
    emailVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpiry?: Date;
    passwordResetToken?: string;
    passwordResetExpiry?: Date;
    failedLoginAttempts: number;
    lockoutUntil?: Date;
    lastPasswordChange: Date;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: {
      inApp: boolean;
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    language: string;
  };
  isActive: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
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
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned by default
    },
    profile: {
      firstName: { type: String, required: true, trim: true, maxlength: 100 },
      lastName: { type: String, required: true, trim: true, maxlength: 100 },
      phone: { type: String, maxlength: 20 },
      avatarUrl: String,
    },
    role: {
      type: String,
      required: true,
      enum: ALL_ROLES,
      default: 'citizen',
    },
    permissions: {
      type: [String],
      default: [],
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    trust: {
      score: { type: Number, default: 50, min: 0, max: 100 },
      verifiedReports: { type: Number, default: 0 },
      falseReports: { type: Number, default: 0 },
      spamFlags: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
    },
    security: {
      mfaEnabled: { type: Boolean, default: false },
      mfaSecret: { type: String, select: false },
      emailVerified: { type: Boolean, default: false },
      emailVerificationToken: { type: String, select: false },
      emailVerificationExpiry: { type: Date },
      passwordResetToken: { type: String, select: false },
      passwordResetExpiry: { type: Date },
      failedLoginAttempts: { type: Number, default: 0 },
      lockoutUntil: { type: Date },
      lastPasswordChange: { type: Date, default: Date.now },
    },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      notifications: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
      },
      language: { type: String, default: 'en' },
    },
    savedLocations: [
      {
        name: { type: String, required: true },
        type: { type: String, enum: ['home', 'college', 'work', 'other'], default: 'other' },
        location: {
          type: { type: String, enum: ['Point'], default: 'Point' },
          coordinates: { type: [Number], required: true }, // [longitude, latitude]
          formattedAddress: { type: String, required: true },
          city: String,
          state: String,
          country: String,
          postalCode: String,
          placeId: String,
        },
        isDefault: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    lastSelectedLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
      formattedAddress: String,
      city: String,
      state: String,
      selectedAt: { type: Date, default: Date.now },
    },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        const idStr = (ret._id as { toString(): string })?.toString();
        ret.id = idStr;
        ret._id = idStr;
        delete ret.__v;
        delete ret.passwordHash;
        if (ret.security) {
          delete ret.security.mfaSecret;
          delete ret.security.emailVerificationToken;
          delete ret.security.passwordResetToken;
        }
        return ret;
      },
    },
  },
);

// ── Indexes ───────────────────────────────────────────────
userSchema.index({ organizationId: 1, email: 1 }, { unique: true });
userSchema.index({ organizationId: 1, role: 1 });
userSchema.index({ 'security.emailVerificationToken': 1 }, { sparse: true });
userSchema.index({ 'security.passwordResetToken': 1 }, { sparse: true });
userSchema.index({ 'lastSelectedLocation.coordinates': '2dsphere' }, { sparse: true });

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
