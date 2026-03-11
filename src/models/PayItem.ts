import mongoose, { Schema, Document } from 'mongoose';
import { normalizePayItemNumber } from '@/lib/costing/utils/normalize-pay-item';

/**
 * PayItem Model - DPWH Standard Pay Items Database
 * Based on DPWH Standard Specifications
 * Organized by Division, Part, and Item with unique pay item codes
 */
export interface IPayItem extends Document {
  division: string; // e.g., "DIVISION I - GENERAL"
  part: string; // e.g., "PART C"
  item: string; // e.g., "ITEM 800 - CLEARING AND GRUBBING"
  payItemNumber: string; // e.g., "800 (1)", "800 (3)a1"
  normalizedPayItemNumber?: string; // normalized for matching
  description: string; // Full description of the pay item
  unit: string; // Unit of measurement (e.g., "Square Meter", "Each", "Lump Sum")
  trade?: string; // e.g., "Concrete", "Rebar", "Formwork", "Earthwork", etc. (from BuildingEstimate integration)
  category?: string; // e.g., "Concrete Works", "Reinforcing Steel", etc. (from BuildingEstimate integration)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PayItemSchema = new Schema<IPayItem>(
  {
    division: {
      type: String,
      required: false, // Made optional since some pay items don't have divisions
      trim: true,
    },
    part: {
      type: String,
      required: true,
      trim: true,
    },
    item: {
      type: String,
      required: false, // Made optional since some pay items don't have items
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
PayItemSchema.index({ division: 1, part: 1, item: 1 });
// Note: payItemNumber index is created by unique: true in schema
PayItemSchema.index({ part: 1 });
PayItemSchema.index({ normalizedPayItemNumber: 1 });
PayItemSchema.index({ trade: 1 });
PayItemSchema.index({ category: 1 });
PayItemSchema.index({ isActive: 1 });
PayItemSchema.index({ description: 'text' }); // Removed payItemNumber to avoid conflict with unique index

// Normalize pay item numbers for consistent matching
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
