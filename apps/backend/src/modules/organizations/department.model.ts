// ============================================================
// Department Mongoose Model
// ============================================================

import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export interface IDepartment extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  categories: string[];
  managerId?: Types.ObjectId;
  contactEmail: string;
  contactPhone?: string;
  headquartersLocation?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    address: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
    },
    description: { type: String, trim: true, maxlength: 500 },
    categories: [{ type: String, trim: true }],
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, trim: true },
    headquartersLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
      address: { type: String, default: '' },
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
  }
);

departmentSchema.index({ organizationId: 1, code: 1 }, { unique: true });
departmentSchema.index({ organizationId: 1, isActive: 1 });
departmentSchema.index({ 'headquartersLocation.coordinates': '2dsphere' }, { sparse: true });

export const Department: Model<IDepartment> = mongoose.model<IDepartment>(
  'Department',
  departmentSchema
);
