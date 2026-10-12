// ============================================================
// Infrastructure Asset Mongoose Model (Digital Twin Core)
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface IInfrastructureAsset extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  assetId: string;
  name: string;
  type: 'roadway' | 'bridge' | 'drainage_culvert' | 'power_substation' | 'water_pipeline' | 'telecom_node';
  conditionRating: number; // 0-100 (100 = brand new)
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    address: string;
  };
  zoneId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  lastInspectedAt?: Date;
  historicalRepairsCount: number;
  predictedFailureRisk: string;
  sensorReadings: {
    vibrationStrain?: string;
    subsurfaceMoisture?: string;
    trafficFlow?: string;
    waterFlowLitresPerSec?: number;
    voltageLoadKVA?: number;
  };
  status: 'operational' | 'degraded' | 'critical_maintenance' | 'offline';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const infrastructureAssetSchema = new Schema<IInfrastructureAsset>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    assetId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['roadway', 'bridge', 'drainage_culvert', 'power_substation', 'water_pipeline', 'telecom_node'],
      required: true,
      index: true,
    },
    conditionRating: { type: Number, default: 85, min: 0, max: 100 },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
      address: { type: String, default: '' },
    },
    zoneId: { type: Schema.Types.ObjectId, ref: 'Zone' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    lastInspectedAt: { type: Date, default: Date.now },
    historicalRepairsCount: { type: Number, default: 0 },
    predictedFailureRisk: { type: String, default: 'Nominal' },
    sensorReadings: {
      vibrationStrain: String,
      subsurfaceMoisture: String,
      trafficFlow: String,
      waterFlowLitresPerSec: Number,
      voltageLoadKVA: Number,
    },
    status: {
      type: String,
      enum: ['operational', 'degraded', 'critical_maintenance', 'offline'],
      default: 'operational',
      index: true,
    },
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

infrastructureAssetSchema.index({ organizationId: 1, assetId: 1 }, { unique: true });
infrastructureAssetSchema.index({ 'location.coordinates': '2dsphere' });
infrastructureAssetSchema.index({ organizationId: 1, status: 1 });

export const InfrastructureAsset: Model<IInfrastructureAsset> = mongoose.model<IInfrastructureAsset>(
  'InfrastructureAsset',
  infrastructureAssetSchema
);
