// ============================================================
// Incident Cluster Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface IIncidentCluster extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  masterIncidentId: Types.ObjectId;
  category: string;
  centroidLocation: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    approximateAddress: string;
  };
  radiusMeters: number;
  linkedIncidentIds: Types.ObjectId[];
  totalReportsCount: number;
  status: 'active' | 'merged' | 'resolved';
  firstReportedAt: Date;
  lastReportedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const clusterSchema = new Schema<IIncidentCluster>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    masterIncidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      unique: true,
      index: true,
    },
    category: { type: String, required: true, index: true },
    centroidLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
      approximateAddress: { type: String, default: '' },
    },
    radiusMeters: { type: Number, default: 50 },
    linkedIncidentIds: [{ type: Schema.Types.ObjectId, ref: 'Incident' }],
    totalReportsCount: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['active', 'merged', 'resolved'],
      default: 'active',
      index: true,
    },
    firstReportedAt: { type: Date, default: Date.now },
    lastReportedAt: { type: Date, default: Date.now },
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

clusterSchema.index({ 'centroidLocation.coordinates': '2dsphere' });
clusterSchema.index({ organizationId: 1, category: 1, status: 1 });

export const IncidentCluster: Model<IIncidentCluster> = mongoose.model<IIncidentCluster>(
  'IncidentCluster',
  clusterSchema
);
