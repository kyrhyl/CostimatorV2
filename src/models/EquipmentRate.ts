import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEquipmentRate extends Document {
  equipmentId: Types.ObjectId;
  edition: string;
  mode: 'fixed' | 'variable_fuel_lube';
  category?: string;
  source: 'acel' | 'manual' | 'legacy';
  ratePerHour: number;
  dryRate?: number;
  fuel?: {
    lowLph?: number;
    highLph?: number;
    avgLph?: number;
    unitCostPerLiter?: number;
    costPerHour?: number;
  };
  lube?: {
    avgLph?: number;
    unitCostPerLiter?: number;
    costPerHour?: number;
  };
  effectiveFrom?: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EquipmentRateSchema = new Schema<IEquipmentRate>(
  {
    equipmentId: { type: Schema.Types.ObjectId, ref: 'Equipment', required: true, index: true },
    edition: { type: String, required: true, trim: true, uppercase: true },
    mode: { type: String, enum: ['fixed', 'variable_fuel_lube'], required: true },
    category: { type: String, default: '', trim: true },
    source: { type: String, enum: ['acel', 'manual', 'legacy'], default: 'acel' },
    ratePerHour: { type: Number, required: true, min: 0 },
    dryRate: { type: Number, min: 0, default: 0 },
    fuel: {
      lowLph: { type: Number, min: 0, default: 0 },
      highLph: { type: Number, min: 0, default: 0 },
      avgLph: { type: Number, min: 0, default: 0 },
      unitCostPerLiter: { type: Number, min: 0, default: 0 },
      costPerHour: { type: Number, min: 0, default: 0 },
    },
    lube: {
      avgLph: { type: Number, min: 0, default: 0 },
      unitCostPerLiter: { type: Number, min: 0, default: 0 },
      costPerHour: { type: Number, min: 0, default: 0 },
    },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

EquipmentRateSchema.index({ equipmentId: 1, edition: 1, mode: 1 }, { unique: true });
EquipmentRateSchema.index({ edition: 1, mode: 1, isActive: 1 });

export default mongoose.models.EquipmentRate || mongoose.model<IEquipmentRate>('EquipmentRate', EquipmentRateSchema);
