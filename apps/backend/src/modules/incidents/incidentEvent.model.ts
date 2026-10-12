// ============================================================
// Incident Event History Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface IIncidentEvent extends Document {
  _id: Types.ObjectId;
  incidentId: Types.ObjectId;
  organizationId: Types.ObjectId;
  actorId: Types.ObjectId;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  notes?: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}

const incidentEventSchema = new Schema<IIncidentEvent>(
  {
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    fromStatus: String,
    toStatus: String,
    notes: String,
    payload: { type: Schema.Types.Mixed },
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

incidentEventSchema.index({ organizationId: 1, incidentId: 1, createdAt: -1 });

export const IncidentEvent: Model<IIncidentEvent> = mongoose.model<IIncidentEvent>(
  'IncidentEvent',
  incidentEventSchema
);
