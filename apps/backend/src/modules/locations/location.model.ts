// ============================================================
// Canonical Location Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface ILocationDoc extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  type: 'home' | 'work' | 'campus' | 'jurisdiction' | 'incident_origin' | 'other';
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    formattedAddress: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    placeId?: string;
  };
  accuracyMeters?: number;
  source: 'CURRENT_GPS' | 'MAP_PIN' | 'SEARCH_GEOCODE' | 'DEFAULT_CITY';
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<ILocationDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    type: {
      type: String,
      enum: ['home', 'work', 'campus', 'jurisdiction', 'incident_origin', 'other'],
      default: 'other',
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      formattedAddress: { type: String, required: true },
      city: String,
      state: String,
      country: String,
      postalCode: String,
      placeId: String,
    },
    accuracyMeters: { type: Number, default: 10 },
    source: {
      type: String,
      enum: ['CURRENT_GPS', 'MAP_PIN', 'SEARCH_GEOCODE', 'DEFAULT_CITY'],
      default: 'MAP_PIN',
    },
    isDefault: { type: Boolean, default: false },
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

locationSchema.index({ 'location.coordinates': '2dsphere' });
locationSchema.index({ organizationId: 1, userId: 1, isDefault: 1 });

export const LocationModel: Model<ILocationDoc> = mongoose.model<ILocationDoc>(
  'Location',
  locationSchema
);
