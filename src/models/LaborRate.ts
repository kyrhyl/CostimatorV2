import mongoose, { Schema, Document } from 'mongoose';

export interface ILaborRate extends Document {
  location: string;
  district: string;
  foreman: number;
  leadman: number;
  equipmentOperatorHeavy: number;
  equipmentOperatorHighSkilled: number;
  equipmentOperatorLightSkilled: number;
  driver: number;
  laborSkilled: number;
  laborSemiSkilled: number;
  laborUnskilled: number;
  effectiveDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LaborRateSchema = new Schema<ILaborRate>(
  {
    location: {
      type: String,
      required: true
    },
    district: {
      type: String,
      required: true,
      default: 'Bukidnon 1st'
    },
    foreman: {
      type: Number,
      required: true,
      default: 0
    },
    leadman: {
      type: Number,
      required: true,
      default: 0
    },
    equipmentOperatorHeavy: {
      type: Number,
      required: true,
      default: 0
    },
    equipmentOperatorHighSkilled: {
      type: Number,
      required: true,
      default: 0
    },
    equipmentOperatorLightSkilled: {
      type: Number,
      required: true,
      default: 0
    },
    driver: {
      type: Number,
      required: true,
      default: 0
    },
    laborSkilled: {
      type: Number,
      required: true,
      default: 0
    },
    laborSemiSkilled: {
      type: Number,
      required: true,
      default: 0
    },
    laborUnskilled: {
      type: Number,
      required: true,
      default: 0
    },
    effectiveDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Index for faster searches
LaborRateSchema.index({ location: 1 });
LaborRateSchema.index({ district: 1 });

export default mongoose.models.LaborRate || mongoose.model<ILaborRate>('LaborRate', LaborRateSchema);
