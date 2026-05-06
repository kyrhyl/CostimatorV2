import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEquipmentRateScenario extends Document {
  projectId?: Types.ObjectId | null;
  equipmentVersion: string;
  edition: string;
  name: string;
  fuelPricePerLiter: number;
  lubePricePerLiter: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EquipmentRateScenarioSchema = new Schema<IEquipmentRateScenario>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    equipmentVersion: { type: String, required: true, trim: true, uppercase: true },
    edition: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, uppercase: true, default: 'BASE' },
    fuelPricePerLiter: { type: Number, required: true, min: 0, default: 0 },
    lubePricePerLiter: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

EquipmentRateScenarioSchema.index(
  { projectId: 1, equipmentVersion: 1, edition: 1, name: 1 },
  { unique: true }
);

EquipmentRateScenarioSchema.index(
  { equipmentVersion: 1, edition: 1, name: 1 },
  { unique: true, partialFilterExpression: { projectId: null } }
);

export default mongoose.models.EquipmentRateScenario ||
  mongoose.model<IEquipmentRateScenario>('EquipmentRateScenario', EquipmentRateScenarioSchema);
