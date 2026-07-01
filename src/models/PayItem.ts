import mongoose, { Schema, Document } from 'mongoose';
import { normalizePayItemNumber } from '@/lib/costing/utils/normalize-pay-item';

export interface IPayItem extends Document {
  division: string;
  part: string;
  item: string;
  payItemNumber: string;
  normalizedPayItemNumber?: string;
  description: string;
  unit: string;
  trade?: string;
  category?: string;
  subCategory?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PayItemSchema = new Schema<IPayItem>(
  {
    division: {
      type: String,
      required: false,
      trim: true,
    },
    part: {
      type: String,
      required: true,
      trim: true,
    },
    item: {
      type: String,
      required: false,
      trim: true,
    },
    payItemNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    normalizedPayItemNumber: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    trade: {
      type: String,
      required: false,
      trim: true,
    },
    category: {
      type: String,
      required: false,
      trim: true,
    },
    subCategory: {
      type: String,
      required: false,
      trim: true,
    },
    notes: {
      type: String,
      required: false,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

PayItemSchema.index({ division: 1, part: 1, item: 1 });
PayItemSchema.index({ part: 1 });
PayItemSchema.index({ normalizedPayItemNumber: 1 });
PayItemSchema.index({ trade: 1 });
PayItemSchema.index({ category: 1 });
PayItemSchema.index({ isActive: 1 });
PayItemSchema.index({ description: 'text' });

PayItemSchema.pre('save', function() {
  if (this.isModified('payItemNumber')) {
    this.normalizedPayItemNumber = normalizePayItemNumber(this.payItemNumber);
  }
});

PayItemSchema.pre('findOneAndUpdate', function() {
  const update = this.getUpdate() as Record<string, any> | undefined;
  if (!update) {
    return;
  }

  if (update.payItemNumber) {
    update.normalizedPayItemNumber = normalizePayItemNumber(update.payItemNumber);
  }

  if (update.$set?.payItemNumber) {
    update.$set.normalizedPayItemNumber = normalizePayItemNumber(update.$set.payItemNumber);
  }
});

const PayItem = mongoose.models.PayItem || mongoose.model<IPayItem>('PayItem', PayItemSchema);

export default PayItem;
