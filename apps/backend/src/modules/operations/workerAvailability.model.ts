// ============================================================
// Field Worker Availability Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface IWorkerAvailability extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  departmentId?: Types.ObjectId;
  status: 'available' | 'busy' | 'on_break' | 'offline';
  currentLocation?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    speedKmph?: number;
    headingDeg?: number;
    batteryLevel?: number;
    updatedAt: Date;
  };
  activeWorkOrderCount: number;
  maxConcurrentOrders: number;
  shiftStartTime?: Date;
  shiftEndTime?: Date;
  lastHeartbeat: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workerAvailabilitySchema = new Schema<IWorkerAvailability>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    status: {
      type: String,
      enum: ['available', 'busy', 'on_break', 'offline'],
      default: 'available',
      index: true,
    },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
      speedKmph: Number,
      headingDeg: Number,
      batteryLevel: Number,
      updatedAt: { type: Date, default: Date.now },
    },
    activeWorkOrderCount: { type: Number, default: 0 },
    maxConcurrentOrders: { type: Number, default: 3 },
    shiftStartTime: Date,
    shiftEndTime: Date,
    lastHeartbeat: { type: Date, default: Date.now },
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

workerAvailabilitySchema.index({ organizationId: 1, status: 1 });
workerAvailabilitySchema.index({ 'currentLocation.coordinates': '2dsphere' }, { sparse: true });

export const WorkerAvailability: Model<IWorkerAvailability> = mongoose.model<IWorkerAvailability>(
  'WorkerAvailability',
  workerAvailabilitySchema
);
