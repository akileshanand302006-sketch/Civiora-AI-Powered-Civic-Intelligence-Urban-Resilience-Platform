// ============================================================
// Municipal Zone / Ward Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface IZone extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  code: string;
  type: 'ward' | 'sector' | 'flood_plain' | 'high_risk' | 'industrial';
  centroid: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  boundary?: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: any;
  };
  riskScore: number;
  activeIncidentsCount: number;
  assignedDepartmentIds: Types.ObjectId[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const zoneSchema = new Schema<IZone>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    type: {
      type: String,
      enum: ['ward', 'sector', 'flood_plain', 'high_risk', 'industrial'],
      default: 'sector',
    },
    centroid: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    boundary: {
      type: { type: String, enum: ['Polygon', 'MultiPolygon'] },
      coordinates: { type: Schema.Types.Mixed },
    },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    activeIncidentsCount: { type: Number, default: 0 },
    assignedDepartmentIds: [{ type: Schema.Types.ObjectId, ref: 'Department' }],
    metadata: { type: Schema.Types.Mixed },
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

zoneSchema.index({ organizationId: 1, code: 1 }, { unique: true });
zoneSchema.index({ 'centroid.coordinates': '2dsphere' });
zoneSchema.index({ 'boundary.coordinates': '2dsphere' }, { sparse: true });

export const Zone: Model<IZone> = mongoose.model<IZone>('Zone', zoneSchema);
