import mongoose, { Schema, Document, Types } from 'mongoose';

// Computed labor item with snapshot of rates at time of creation
export interface IComputedLabor {
  designation: string;
  noOfPersons: number;
  noOfHours: number;
  hourlyRate: number; // Snapshot from LaborRate at creation time
  amount: number;
}

// Computed equipment item with snapshot of rates
export interface IComputedEquipment {
  equipmentId?: Types.ObjectId;
  description: string;
  noOfUnits: number;
  noOfHours: number;
  hourlyRate: number; // Snapshot from Equipment at creation time
  amount: number;
}

// Computed material item with snapshot of rates
export interface IComputedMaterial {
  materialCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitCost: number; // Snapshot from MaterialPrice at creation time
  amount: number;
  haulingIncluded?: boolean; // Whether hauling cost was added
  basePrice?: number; // Base material price before hauling
  haulingCost?: number; // Hauling cost per unit
  requiresCanvass?: boolean;
}

// ProjectBOQ stores computed instances of DUPA templates for a specific project
export interface IProjectBOQ extends Document {
  projectId: Types.ObjectId;
  templateId: Types.ObjectId; // Reference to source DUPA template
  classificationId?: Types.ObjectId;
  
  // Template information (copied at creation)
  payItemNumber: string;
  payItemDescription: string;
  part?: string;
  unitOfMeasurement: string;
  outputPerHour: number;
  category?: string;
  subCategory?: string;
  specification?: string;
  notes?: string;
  
  // BOQ-specific fields
  quantity: number; // Project-specific quantity
  
  // Computed items with rate snapshots
  laborItems: IComputedLabor[];
  equipmentItems: IComputedEquipment[];
  materialItems: IComputedMaterial[];
  
  // Cost calculations
  directCost: number;
  ocmPercentage: number;
  ocmCost: number;
  cpPercentage: number;
  cpCost: number;
  subtotalWithMarkup: number;
  vatPercentage: number;
  vatCost: number;
  totalCost: number;
  unitCost: number;
  totalAmount: number; // totalCost * quantity
  
  // Metadata
  location: string; // Project location used for rate lookup
  instantiatedAt: Date; // When rates were applied
  createdAt: Date;
  updatedAt: Date;
}

const ComputedLaborSchema = new Schema<IComputedLabor>({
  designation: { type: String, required: true },
  noOfPersons: { type: Number, required: true },
  noOfHours: { type: Number, required: true },
  hourlyRate: { type: Number, required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const ComputedEquipmentSchema = new Schema<IComputedEquipment>({
  equipmentId: { type: Schema.Types.ObjectId, ref: 'Equipment', required: false },
  description: { type: String, required: true },
  noOfUnits: { type: Number, required: true },
  noOfHours: { type: Number, required: true },
  hourlyRate: { type: Number, required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const ComputedMaterialSchema = new Schema<IComputedMaterial>({
  materialCode: { type: String, required: true },
  description: { type: String, required: true },
  unit: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitCost: { type: Number, required: true },
  amount: { type: Number, required: true },
  haulingIncluded: { type: Boolean, default: false },
  basePrice: { type: Number, default: 0 },
  haulingCost: { type: Number, default: 0 },
  requiresCanvass: { type: Boolean, default: false },
}, { _id: false });

const ProjectBOQSchema = new Schema<IProjectBOQ>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'DUPATemplate',
      required: true
    },
    classificationId: {
      type: Schema.Types.ObjectId,
      ref: 'PayItemClassification',
      required: false,
      index: true,
    },
    payItemNumber: { type: String, required: true },
    payItemDescription: { type: String, required: true },
    part: { type: String, default: '' },
    unitOfMeasurement: { type: String, required: true },
    outputPerHour: { type: Number, required: true },
    category: { type: String },
    subCategory: { type: String },
    specification: { type: String },
    notes: { type: String },
    quantity: { type: Number, required: true, min: 0 },
    laborItems: [ComputedLaborSchema],
    equipmentItems: [ComputedEquipmentSchema],
    materialItems: [ComputedMaterialSchema],
    directCost: { type: Number, required: true },
    ocmPercentage: { type: Number, required: true },
    ocmCost: { type: Number, required: true },
    cpPercentage: { type: Number, required: true },
    cpCost: { type: Number, required: true },
    subtotalWithMarkup: { type: Number, required: true },
    vatPercentage: { type: Number, required: true },
    vatCost: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    unitCost: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    location: { type: String, required: true },
    instantiatedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

// Compound index for project + template
ProjectBOQSchema.index({ projectId: 1, payItemNumber: 1 });
ProjectBOQSchema.index({ templateId: 1, updatedAt: -1 });

export default mongoose.models.ProjectBOQ || mongoose.model<IProjectBOQ>('ProjectBOQ', ProjectBOQSchema);
