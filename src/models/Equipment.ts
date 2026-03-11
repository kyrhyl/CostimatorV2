import mongoose, { Schema, Document } from 'mongoose';

export interface IEquipment extends Document {
  no: number;
  completeDescription: string;
  description: string;
  equipmentModel?: string;
  capacity?: string;
  flywheelHorsepower?: number;
  rentalRate: number;
  hourlyRate: number;
  createdAt: Date;
  updatedAt: Date;
}

const EquipmentSchema = new Schema<IEquipment>(
  {
    no: {
      type: Number,
      required: true,
      unique: true
    },
    completeDescription: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    equipmentModel: {
      type: String,
      default: ''
    },
    capacity: {
      type: String,
      default: ''
    },
    flywheelHorsepower: {
      type: Number,
      default: 0
    },
    rentalRate: {
      type: Number,
      required: true,
      default: 0
    },
    hourlyRate: {
      type: Number,
      required: true,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Index for faster searches
EquipmentSchema.index({ description: 1 });

export default mongoose.models.Equipment || mongoose.model<IEquipment>('Equipment', EquipmentSchema);
