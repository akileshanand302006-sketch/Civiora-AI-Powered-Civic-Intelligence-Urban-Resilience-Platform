// ============================================================
// Emergency Event Broadcast Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface IEmergencyEvent extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  title: string;
  description: string;
  severity: 'high' | 'critical' | 'catastrophic';
  category: 'flood_warning' | 'power_grid_failure' | 'structural_collapse' | 'weather_storm' | 'evacuation';
  affectedZoneIds: Types.ObjectId[];
  affectedLocation?: {
    type: 'Point';
    coordinates: [number, number];
    radiusMeters: number;
  };
  broadcastChannels: Array<'siren' | 'push_emergency' | 'sms' | 'public_feed'>;
  initiatedBy: Types.ObjectId;
  isActive: boolean;
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const emergencyEventSchema = new Schema<IEmergencyEvent>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ['high', 'critical', 'catastrophic'],
      default: 'critical',
      index: true,
    },
    category: {
      type: String,
      enum: ['flood_warning', 'power_grid_failure', 'structural_collapse', 'weather_storm', 'evacuation'],
      required: true,
      index: true,
    },
    affectedZoneIds: [{ type: Schema.Types.ObjectId, ref: 'Zone' }],
    affectedLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
      radiusMeters: { type: Number, default: 2000 },
    },
    broadcastChannels: [{ type: String, enum: ['siren', 'push_emergency', 'sms', 'public_feed'] }],
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    cancelledAt: Date,
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
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

emergencyEventSchema.index({ organizationId: 1, isActive: 1, createdAt: -1 });
emergencyEventSchema.index({ 'affectedLocation.coordinates': '2dsphere' }, { sparse: true });

export const EmergencyEvent: Model<IEmergencyEvent> = mongoose.model<IEmergencyEvent>(
  'EmergencyEvent',
  emergencyEventSchema
);
