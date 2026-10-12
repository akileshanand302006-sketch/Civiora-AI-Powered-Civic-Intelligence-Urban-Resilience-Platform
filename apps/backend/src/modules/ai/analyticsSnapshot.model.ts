// ============================================================
// Analytics Snapshot Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface IAnalyticsSnapshot extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  snapshotDate: Date;
  metrics: {
    totalIncidents: number;
    activeIncidents: number;
    resolvedIncidents: number;
    emergencyIncidents: number;
    avgResolutionTimeHours: number;
    slaAdherenceRate: number; // percentage e.g. 96.4
    categoryBreakdown: Record<string, number>;
    statusBreakdown: Record<string, number>;
    hotspotZones: Array<{
      zoneId: Types.ObjectId;
      name: string;
      incidentCount: number;
    }>;
  };
  createdAt: Date;
}

const analyticsSnapshotSchema = new Schema<IAnalyticsSnapshot>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    period: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly'],
      required: true,
    },
    snapshotDate: { type: Date, required: true },
    metrics: {
      totalIncidents: { type: Number, default: 0 },
      activeIncidents: { type: Number, default: 0 },
      resolvedIncidents: { type: Number, default: 0 },
      emergencyIncidents: { type: Number, default: 0 },
      avgResolutionTimeHours: { type: Number, default: 0 },
      slaAdherenceRate: { type: Number, default: 0 },
      categoryBreakdown: { type: Schema.Types.Mixed, default: {} },
      statusBreakdown: { type: Schema.Types.Mixed, default: {} },
      hotspotZones: [
        {
          zoneId: { type: Schema.Types.ObjectId, ref: 'Zone' },
          name: String,
          incidentCount: Number,
        },
      ],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

analyticsSnapshotSchema.index({ organizationId: 1, period: 1, snapshotDate: -1 });

export const AnalyticsSnapshot: Model<IAnalyticsSnapshot> = mongoose.model<IAnalyticsSnapshot>(
  'AnalyticsSnapshot',
  analyticsSnapshotSchema
);
