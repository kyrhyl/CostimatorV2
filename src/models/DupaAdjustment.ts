import mongoose, { Schema, type Document, type Model } from 'mongoose';

interface DupaLaborLine {
  designation: string;
  noOfPersons: number;
  noOfHours: number;
  hourlyRate: number;
  amount: number;
}

interface DupaEquipmentLine {
  equipmentId?: string;
  description: string;
  noOfUnits: number;
  noOfHours: number;
  hourlyRate: number;
  amount: number;
}

interface DupaMaterialLine {
  materialCode?: string;
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
  amount: number;
}

interface DupaTotals {
  laborSubmitted: number;
  equipmentSubmitted: number;
  directCostSubmitted: number;
  outputSubmitted: number;
  directUnitCostSubmitted: number;
  materialsSubmitted: number;
  directUnitPlusMaterialsSubmitted: number;
  ocmPercent: number;
  ocmValue: number;
  cpPercent: number;
  cpValue: number;
  vatPercent: number;
  vatValue: number;
  totalUnitCostSubmitted: number;
}

export interface IDupaAdjustment extends Document {
  projectId: mongoose.Types.ObjectId;
  estimateRef: string;
  itemKey: string;
  payItemNumber: string;
  payItemDescription: string;
  part: string;
  unitOfMeasurement: string;
  outputPerHour: number;
  quantity: number;
  laborItems: DupaLaborLine[];
  equipmentItems: DupaEquipmentLine[];
  materialItems: DupaMaterialLine[];
  totals: DupaTotals;
  reason?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LaborSchema = new Schema<DupaLaborLine>(
  {
    designation: { type: String, default: '' },
    noOfPersons: { type: Number, default: 0 },
    noOfHours: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
);

const EquipmentSchema = new Schema<DupaEquipmentLine>(
  {
    equipmentId: { type: String, default: '' },
    description: { type: String, default: '' },
    noOfUnits: { type: Number, default: 0 },
    noOfHours: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
);

const MaterialSchema = new Schema<DupaMaterialLine>(
  {
    materialCode: { type: String, default: '' },
    description: { type: String, default: '' },
    unit: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
);

const TotalsSchema = new Schema<DupaTotals>(
  {
    laborSubmitted: { type: Number, default: 0 },
    equipmentSubmitted: { type: Number, default: 0 },
    directCostSubmitted: { type: Number, default: 0 },
    outputSubmitted: { type: Number, default: 0 },
    directUnitCostSubmitted: { type: Number, default: 0 },
    materialsSubmitted: { type: Number, default: 0 },
    directUnitPlusMaterialsSubmitted: { type: Number, default: 0 },
    ocmPercent: { type: Number, default: 0 },
    ocmValue: { type: Number, default: 0 },
    cpPercent: { type: Number, default: 0 },
    cpValue: { type: Number, default: 0 },
    vatPercent: { type: Number, default: 0 },
    vatValue: { type: Number, default: 0 },
    totalUnitCostSubmitted: { type: Number, default: 0 },
  },
  { _id: false },
);

const DupaAdjustmentSchema = new Schema<IDupaAdjustment>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    estimateRef: { type: String, required: true, index: true },
    itemKey: { type: String, required: true },
    payItemNumber: { type: String, required: true },
    payItemDescription: { type: String, required: true },
    part: { type: String, required: true },
    unitOfMeasurement: { type: String, required: true },
    outputPerHour: { type: Number, required: true },
    quantity: { type: Number, required: true },
    laborItems: [LaborSchema],
    equipmentItems: [EquipmentSchema],
    materialItems: [MaterialSchema],
    totals: { type: TotalsSchema, required: true },
    reason: { type: String, default: '' },
    updatedBy: { type: String, default: 'workspace-user' },
  },
  { timestamps: true },
);

DupaAdjustmentSchema.index({ projectId: 1, estimateRef: 1, itemKey: 1 }, { unique: true });

const DupaAdjustment: Model<IDupaAdjustment> =
  mongoose.models.DupaAdjustment || mongoose.model<IDupaAdjustment>('DupaAdjustment', DupaAdjustmentSchema);

export default DupaAdjustment;
