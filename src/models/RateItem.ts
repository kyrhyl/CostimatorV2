import mongoose, { Schema, Model } from 'mongoose';

// =============================================
// Labor Entry Interface & Schema
// =============================================
export interface ILaborEntry {
  designation: string;           // e.g., "Foreman", "Unskilled Labor"
  noOfPersons: number;
  noOfHours: number;
  hourlyRate: number;
  amount: number;                 // computed: noOfPersons × noOfHours × hourlyRate
}

const laborEntrySchema = new Schema<ILaborEntry>({
  designation: { type: String, required: true },
  noOfPersons: { type: Number, required: true, default: 0 },
  noOfHours: { type: Number, required: true, default: 0 },
  hourlyRate: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 }
}, { _id: false });

// =============================================
// Equipment Entry Interface & Schema
// =============================================
export interface IEquipmentEntry {
  nameAndCapacity: string;        // e.g., "Minor Tools (10% of Labor Cost)"
  noOfUnits: number;
  noOfHours: number;
  hourlyRate: number;
  amount: number;
}

const equipmentEntrySchema = new Schema<IEquipmentEntry>({
  nameAndCapacity: { type: String, required: true },
  noOfUnits: { type: Number, required: true, default: 0 },
  noOfHours: { type: Number, required: true, default: 0 },
  hourlyRate: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 }
}, { _id: false });

// =============================================
// Material Entry Interface & Schema
// =============================================
export interface IMaterialEntry {
  nameAndSpecification: string;   // e.g., "Portland Cement, Type I"
  unit: string;                    // e.g., "bag", "cu.m", "kg"
  quantity: number;
  unitCost: number;
  amount: number;                  // computed: quantity × unitCost
  haulingIncluded?: boolean;       // Indicates if hauling cost was added to unitCost
  basePrice?: number;              // Base material price before hauling
  haulingCost?: number;            // Hauling cost per unit
}

const materialEntrySchema = new Schema<IMaterialEntry>({
  nameAndSpecification: { type: String, required: true },
  unit: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  unitCost: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 },
  haulingIncluded: { type: Boolean, default: false },
  basePrice: { type: Number, default: 0 },
  haulingCost: { type: Number, default: 0 }
}, { _id: false });

// =============================================
// Add-On Percentages Interface & Schema
// =============================================
export interface IAddOnPercentages {
  ocmSubmitted: number;            // Overhead, Contingencies & Miscellaneous (OCM) - As Submitted (%)
  ocmEvaluated: number;            // OCM - As Evaluated (%)
  cpSubmitted: number;             // Contractor's Profit (CP) - As Submitted (%)
  cpEvaluated: number;             // CP - As Evaluated (%)
  vatSubmitted: number;            // Value Added Tax (VAT) - As Submitted (%)
  vatEvaluated: number;            // VAT - As Evaluated (%)
}

const addOnPercentagesSchema = new Schema<IAddOnPercentages>({
  ocmSubmitted: { type: Number, default: 0 },
  ocmEvaluated: { type: Number, default: 15 },     // From screenshot: 15%
  cpSubmitted: { type: Number, default: 10 },      // From screenshot: 10%
  cpEvaluated: { type: Number, default: 0 },
  vatSubmitted: { type: Number, default: 12 },     // From screenshot: 12%
  vatEvaluated: { type: Number, default: 0 }
}, { _id: false });

// =============================================
// RateItem (Unit Price Analysis) Interface & Schema
// =============================================
export interface IRateItem {
  _id: mongoose.Types.ObjectId;
  
  // Header Information
  payItemNumber: string;           // e.g., "801 (1)"
  payItemDescription: string;      // e.g., "Removal of Structures and Obstruction"
  unitOfMeasurement: string;       // e.g., "l.s."
  outputPerHourSubmitted: number;  // e.g., 1.00
  outputPerHourEvaluated: number;
  
  // A-1: Labor - As Submitted
  laborSubmitted: ILaborEntry[];
  
  // A-2: Labor - As Evaluated
  laborEvaluated: ILaborEntry[];
  
  // B-1: Equipment - As Submitted
  equipmentSubmitted: IEquipmentEntry[];
  
  // B-2: Equipment - As Evaluated
  equipmentEvaluated: IEquipmentEntry[];
  
  // F-1: Material - As Submitted
  materialSubmitted: IMaterialEntry[];
  
  // F-2: Material - As Evaluated
  materialEvaluated: IMaterialEntry[];
  
  // Add-on percentages (G, H, I, J)
  addOnPercentages: IAddOnPercentages;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const rateItemSchema = new Schema<IRateItem>({
  payItemNumber: { type: String, required: true, unique: true },
  payItemDescription: { type: String, required: true },
  unitOfMeasurement: { type: String, required: true },
  outputPerHourSubmitted: { type: Number, default: 1.0 },
  outputPerHourEvaluated: { type: Number, default: 1.0 },
  
  laborSubmitted: { type: [laborEntrySchema], default: [] },
  laborEvaluated: { type: [laborEntrySchema], default: [] },
  
  equipmentSubmitted: { type: [equipmentEntrySchema], default: [] },
  equipmentEvaluated: { type: [equipmentEntrySchema], default: [] },
  
  materialSubmitted: { type: [materialEntrySchema], default: [] },
  materialEvaluated: { type: [materialEntrySchema], default: [] },
  
  addOnPercentages: { type: addOnPercentagesSchema, default: () => ({}) }
}, {
  timestamps: true
});

// Create or retrieve the model
const RateItem: Model<IRateItem> = mongoose.models.RateItem || mongoose.model<IRateItem>('RateItem', rateItemSchema);

export default RateItem;
