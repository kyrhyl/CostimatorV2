import mongoose, { Schema, Document } from 'mongoose';

// Material Reference Database
// Canonical base material registry (metadata and hauling control)
export interface IMaterial extends Document {
  materialCode: string;
  works: string;
  materialDescription: string;
  unit: string;
  category?: string; // e.g., 'MG01', 'MG02', etc.
  includeHauling: boolean; // Whether to add hauling cost for this material
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialSchema = new Schema<IMaterial>(
  {
    materialCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    materialDescription: {
      type: String,
      required: true,
      trim: true,
    },
    works: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      trim: true,
      uppercase: true,
    },
    includeHauling: {
      type: Boolean,
      default: false, // Default to excluded
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

// Indexes
MaterialSchema.index({ category: 1 });
MaterialSchema.index({ works: 1 });
MaterialSchema.index({ works: 1, category: 1 });
MaterialSchema.index({ isActive: 1 });
MaterialSchema.index({ materialDescription: 'text' });

export default mongoose.models.Material || mongoose.model<IMaterial>('Material', MaterialSchema);
