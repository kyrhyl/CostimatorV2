import mongoose, { Schema, Document } from 'mongoose';

/**
 * BOQ (Bill of Quantities) Model
 * 
 * Simple persistent storage of BOQ items generated from takeoff calculations.
 * Contains ONLY quantities - NO pricing data.
 * Pricing is calculated later during cost estimate creation.
 */

export interface IBOQ extends Document {
  projectId: mongoose.Types.ObjectId;
  
  // BOQ line data (quantities only)
  payItemNumber: string;
  payItemDescription: string;
  quantity: number;
  unit: string;
  part: string;  // DPWH part (C, D, E, F, G)
  
  // Traceability
  sourceTakeoffLineIds: string[];  // Link back to TakeoffLines
  sourceCalcRunId?: mongoose.Types.ObjectId;  // Which CalcRun generated this
  
  // Versioning
  version?: number;  // BOQ version number (1, 2, 3...)
  versionName?: string;  // User-friendly name (e.g., "Initial BOQ", "Revised BOQ")
  
  // Metadata
  createdFrom: 'takeoff' | 'manual';  // How was this created
  tags?: string[];
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const BOQSchema = new Schema<IBOQ>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    
    payItemNumber: {
      type: String,
      required: true,
      trim: true
    },
    
    payItemDescription: {
      type: String,
      required: true
    },
    
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    
    unit: {
      type: String,
      required: true
    },
    
    part: {
      type: String,
      required: true,
      enum: ['C', 'D', 'E', 'F', 'G']
    },
    
    sourceTakeoffLineIds: {
      type: [String],
      default: []
    },
    
    sourceCalcRunId: {
      type: Schema.Types.ObjectId,
      ref: 'CalcRun'
    },
    
    version: {
      type: Number,
      default: 1
    },
    
    versionName: {
      type: String,
      default: 'Initial BOQ'
    },
    
    createdFrom: {
      type: String,
      enum: ['takeoff', 'manual'],
      default: 'takeoff'
    },
    
    tags: {
      type: [String],
      default: []
    },
    
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound index for querying BOQ by project and version
BOQSchema.index({ projectId: 1, version: 1 });
BOQSchema.index({ projectId: 1, payItemNumber: 1 });
BOQSchema.index({ payItemNumber: 1 });

export default mongoose.models.BOQ || mongoose.model<IBOQ>('BOQ', BOQSchema);
