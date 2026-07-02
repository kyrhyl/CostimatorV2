import mongoose, { Document, Schema } from 'mongoose';

export interface IPayItemClassification extends Document {
  part: string;
  category: string;
  subCategory?: string;
  displayLabel: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PayItemClassificationSchema = new Schema<IPayItemClassification>(
  {
    part: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true },
    subCategory: { type: String, default: '', trim: true },
    displayLabel: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

PayItemClassificationSchema.index({ part: 1, category: 1, subCategory: 1 }, { unique: true });
PayItemClassificationSchema.index({ part: 1, isActive: 1, category: 1, subCategory: 1 });

const PayItemClassification = mongoose.models.PayItemClassification
  || mongoose.model<IPayItemClassification>('PayItemClassification', PayItemClassificationSchema);

export default PayItemClassification;
