import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IPowAdjustment extends Document {
  projectId: mongoose.Types.ObjectId;
  mode: 'manual' | 'takeoff';
  estimateId?: mongoose.Types.ObjectId | null;
  lineKey: string;
  payItemNumber: string;
  quantity?: number;
  unitCost?: number;
  reason?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PowAdjustmentSchema = new Schema<IPowAdjustment>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    mode: { type: String, enum: ['manual', 'takeoff'], required: true, index: true },
    estimateId: { type: Schema.Types.ObjectId, ref: 'CostEstimate', default: null, index: true },
    lineKey: { type: String, required: true },
    payItemNumber: { type: String, required: true },
    quantity: { type: Number, min: 0 },
    unitCost: { type: Number, min: 0 },
    reason: { type: String, default: '' },
    updatedBy: { type: String, default: 'workspace-user' },
  },
  { timestamps: true },
);

PowAdjustmentSchema.index({ projectId: 1, mode: 1, estimateId: 1, lineKey: 1 }, { unique: true });

const PowAdjustment: Model<IPowAdjustment> =
  mongoose.models.PowAdjustment || mongoose.model<IPowAdjustment>('PowAdjustment', PowAdjustmentSchema);

export default PowAdjustment;
