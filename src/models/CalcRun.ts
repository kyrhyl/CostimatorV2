import mongoose, { Schema, Model } from 'mongoose';
import type { CalcRun, CalcRunSummary, TakeoffLine, BOQLine } from '@/types';

const TakeoffLineSchema = new Schema<TakeoffLine>({
  id: { type: String, required: true },
  sourceElementId: { type: String, required: true },
  trade: { 
    type: String, 
    enum: [
      'Concrete', 
      'Rebar', 
      'Formwork',
      'Earthwork',
      'Plumbing',
      'Carpentry',
      'Hardware',
      'Doors & Windows',
      'Glass & Glazing',
      'Roofing',
      'Waterproofing',
      'Finishes',
      'Painting',
      'Masonry',
      'Structural Steel',
      'Structural',
      'Foundation',
      'Railing',
      'Cladding',
      'MEPF',
      'Marine Works',
      'General Requirements',
      'Other'
    ], 
    required: true 
  },
  resourceKey: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  formulaText: { type: String, required: true },
  inputsSnapshot: { type: Map, of: Number, required: true },
  assumptions: [String],
  tags: [String],
  calculatedAt: Date,
});

const BOQLineSchema = new Schema<BOQLine>({
  id: { type: String, required: true },
  dpwhItemNumberRaw: { type: String, required: true },
  description: { type: String, required: true },
  unit: { type: String, required: true },
  quantity: { type: Number, required: true },
  sourceTakeoffLineIds: [String],
  tags: [String],
});

const CalcRunSummarySchema = new Schema<CalcRunSummary>({
  totalConcrete: { type: Number, default: 0 },
  totalRebar: { type: Number, default: 0 },
  totalFormwork: { type: Number, default: 0 },
  takeoffLineCount: { type: Number, default: 0 },
  boqLineCount: { type: Number, default: 0 },
});

const CalcRunSchema = new Schema<CalcRun>(
  {
    runId: { type: String, required: true, unique: true },
    projectId: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ['running', 'completed', 'failed'], 
      required: true,
      default: 'running',
    },
    summary: CalcRunSummarySchema,
    takeoffLines: [TakeoffLineSchema],
    boqLines: [BOQLineSchema],
    validationErrors: [String], // Renamed from 'errors' to avoid Mongoose reserved keyword
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
CalcRunSchema.index({ projectId: 1, timestamp: -1 });

// Prevent model recompilation during hot reload
const CalcRunModel: Model<CalcRun> = 
  mongoose.models.CalcRun || mongoose.model<CalcRun>('CalcRun', CalcRunSchema);

export default CalcRunModel;
