import mongoose, { Schema, Document } from 'mongoose';

export interface IMaterialPrice extends Document {
  materialCode: string;
  description: string;
  unit: string;
  location: string;
  district?: string; // DPWH district (e.g., "DPWH-NCR-1st", "DPWH-CAR")
  unitCost: number;
  priceSource?: 'cmpd' | 'canvass';
  brand?: string;
  specification?: string;
  supplier?: string;
  effectiveDate: Date;
  cmpd_version?: string; // CMPD version identifier (e.g., "CMPD-2024-Q1")
  isActive?: boolean; // true = current price, false = historical
  importBatch?: string; // Import batch identifier for tracking
  createdAt: Date;
  updatedAt: Date;
}

const MaterialPriceSchema = new Schema<IMaterialPrice>(
  {
    materialCode: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    unit: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    district: {
      type: String,
      default: ''
    },
    unitCost: {
      type: Number,
      required: true,
      default: 0
    },
    priceSource: {
      type: String,
      enum: ['cmpd', 'canvass'],
      default: 'cmpd'
    },
    brand: {
      type: String,
      default: ''
    },
    specification: {
      type: String,
      default: ''
    },
    supplier: {
      type: String,
      default: ''
    },
    effectiveDate: {
      type: Date,
      default: Date.now
    },
    cmpd_version: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    importBatch: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound index for unique material per location per CMPD version and source
MaterialPriceSchema.index({ materialCode: 1, location: 1, cmpd_version: 1, priceSource: 1 }, { unique: true });
MaterialPriceSchema.index({ description: 1 });
MaterialPriceSchema.index({ location: 1 });
MaterialPriceSchema.index({ district: 1, effectiveDate: -1 }); // For district-based price lookup
MaterialPriceSchema.index({ isActive: 1 }); // For filtering active prices

export default mongoose.models.MaterialPrice || mongoose.model<IMaterialPrice>('MaterialPrice', MaterialPriceSchema);
