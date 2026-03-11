import mongoose, { Schema, Document } from 'mongoose';
import { normalizePayItemNumber } from '../lib/costing/utils/normalize-pay-item';

// =============================================
// Template Labor Entry - References designation only
// =============================================
export interface ILaborTemplate {
  designation: string;           // Reference: "foreman", "unskilled", "skilled", etc.
  noOfPersons: number;
  noOfHours: number;
}

const laborTemplateSchema = new Schema<ILaborTemplate>({
  designation: { type: String, required: true },
  noOfPersons: { type: Number, required: true, default: 0 },
  noOfHours: { type: Number, required: true, default: 0 }
}, { _id: false });

// =============================================
// Template Equipment Entry - References equipment database
// =============================================
export interface IEquipmentTemplate {
  equipmentId?: mongoose.Types.ObjectId;  // Reference to Equipment collection
  description: string;                     // Fallback if no equipmentId
  noOfUnits: number;
  noOfHours: number;
}

const equipmentTemplateSchema = new Schema<IEquipmentTemplate>({
  equipmentId: { type: Schema.Types.ObjectId, ref: 'Equipment' },
  description: { type: String, default: '' },
  noOfUnits: { type: Number, required: true, default: 0 },
  noOfHours: { type: Number, required: true, default: 0 }
}, { _id: false });

// =============================================
// Template Material Entry - References material code
// =============================================
export interface IMaterialTemplate {
  materialCode?: string;          // Reference to MaterialPrice collection
  description: string;             // Fallback description
  unit: string;
  quantity: number;
}

const materialTemplateSchema = new Schema<IMaterialTemplate>({
  materialCode: { type: String, default: '' },
  description: { type: String, required: true },
  unit: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 }
}, { _id: false });

// =============================================
// DUPA Template - Reusable template without location-specific rates
// =============================================
export interface IDUPATemplate extends Document {
  payItemId?: mongoose.Types.ObjectId;    // Reference to PayItem collection (optional)
  payItemNumber: string;
  normalizedPayItemNumber?: string;
  payItemDescription: string;
  unitOfMeasurement: string;
  outputPerHour: number;
  
  // Template entries (no rates, just structure)
  laborTemplate: ILaborTemplate[];
  equipmentTemplate: IEquipmentTemplate[];
  materialTemplate: IMaterialTemplate[];
  
  // Add-on percentages (can be template defaults)
  ocmPercentage: number;
  cpPercentage: number;
  vatPercentage: number;
  
  // Minor Tools configuration
  includeMinorTools: boolean;
  minorToolsPercentage: number;
  
  // Template metadata
  part?: string;                // e.g., "PART C", "PART D" (from PayItem)
  category?: string;
  specification?: string;
  notes?: string;
  isActive: boolean;
  isPinnedCommon: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const dupaTemplateSchema = new Schema<IDUPATemplate>(
  {
    payItemId: {
      type: Schema.Types.ObjectId,
      ref: 'PayItem',
      required: false
    },
    payItemNumber: {
      type: String,
      required: true,
      unique: true
    },
    normalizedPayItemNumber: {
      type: String,
      default: ''
    },
    payItemDescription: {
      type: String,
      required: true
    },
    unitOfMeasurement: {
      type: String,
      required: true
    },
    outputPerHour: {
      type: Number,
      default: 1.0
    },
    laborTemplate: {
      type: [laborTemplateSchema],
      default: []
    },
    equipmentTemplate: {
      type: [equipmentTemplateSchema],
      default: []
    },
    materialTemplate: {
      type: [materialTemplateSchema],
      default: []
    },
    ocmPercentage: {
      type: Number,
      default: 15
    },
    cpPercentage: {
      type: Number,
      default: 10
    },
    vatPercentage: {
      type: Number,
      default: 12
    },
    includeMinorTools: {
      type: Boolean,
      default: false
    },
    minorToolsPercentage: {
      type: Number,
      default: 10
    },
    part: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      default: ''
    },
    specification: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isPinnedCommon: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Indexes
dupaTemplateSchema.index({ normalizedPayItemNumber: 1 });
dupaTemplateSchema.index({ part: 1 });
dupaTemplateSchema.index({ category: 1 });
dupaTemplateSchema.index({ isActive: 1 });
dupaTemplateSchema.index({ isPinnedCommon: 1, isActive: 1 });

// Normalize pay item numbers for matching
dupaTemplateSchema.pre('save', function() {
  if (this.isModified('payItemNumber')) {
    this.normalizedPayItemNumber = normalizePayItemNumber(this.payItemNumber);
  }
});

dupaTemplateSchema.pre('findOneAndUpdate', function() {
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

export default mongoose.models.DUPATemplate || mongoose.model<IDUPATemplate>('DUPATemplate', dupaTemplateSchema);
