import mongoose, { Schema, Model } from 'mongoose';

/**
 * ESTIMATE MODEL (LEGACY)
 * 
 * ⚠️ LEGACY: This model is for direct BOQ import/manipulation workflows.
 * 
 * For new development, prefer:
 * - CostEstimate: Takeoff-driven estimates with CMPD pricing and DUPA templates
 * - ProjectEstimate: Versioned estimates with approval workflow
 * 
 * This model is maintained for backward compatibility with the import/export
 * BOQ functionality and standalone estimate creation without takeoff data.
 */

// =============================================
// BOQLine Interface & Schema
// =============================================
export interface IBOQLine {
  itemNo: string;                  // BOQ item number (e.g., "1.01", "2.03")
  description: string;             // Work description from BOQ
  unit: string;                    // Unit of measurement (e.g., "cu.m", "l.s.")
  quantity: number;                // Quantity from BOQ
  
  // DPWH Grouping
  part?: string;                   // e.g., "PART B", "PART C", "ITEM 1000"
  partDescription?: string;        // e.g., "OTHER GENERAL REQUIREMENTS", "EARTHWORK"
  division?: string;               // e.g., "DIVISION I", "DIVISION II"
  
  // Linked Rate Item (optional - if UPA exists for this item)
  rateItemId?: mongoose.Types.ObjectId;
  payItemNumber?: string;          // Reference to RateItem.payItemNumber
  
  // Computed Costs (populated during estimation)
  unitPrice?: number;               // Final unit price from pricing engine
  totalAmount?: number;            // quantity × unitPrice
  
  // Cost breakdown by component
  materialCost?: number;
  laborCost?: number;
  equipmentCost?: number;
  materialPercent?: number;        // % of direct cost
  laborPercent?: number;           // % of direct cost
  equipmentPercent?: number;       // % of direct cost
  
  breakdown?: {
    directCostSubmitted: number;
    directCostEvaluated: number;
    ocmSubmitted: number;
    ocmEvaluated: number;
    cpSubmitted: number;
    cpEvaluated: number;
    vatSubmitted: number;
    vatEvaluated: number;
    totalSubmitted: number;
    totalEvaluated: number;
  };
}

const boqLineSchema = new Schema<IBOQLine>({
  itemNo: { type: String, required: true },
  description: { type: String, required: true },
  unit: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  
  part: { type: String },
  partDescription: { type: String },
  division: { type: String },
  
  rateItemId: { type: Schema.Types.ObjectId, ref: 'RateItem' },
  payItemNumber: { type: String },
  
  unitPrice: { type: Number },
  totalAmount: { type: Number },
  materialCost: { type: Number },
  laborCost: { type: Number },
  equipmentCost: { type: Number },
  materialPercent: { type: Number },
  laborPercent: { type: Number },
  equipmentPercent: { type: Number },
  breakdown: {
    directCostSubmitted: { type: Number },
    directCostEvaluated: { type: Number },
    ocmSubmitted: { type: Number },
    ocmEvaluated: { type: Number },
    cpSubmitted: { type: Number },
    cpEvaluated: { type: Number },
    vatSubmitted: { type: Number },
    vatEvaluated: { type: Number },
    totalSubmitted: { type: Number },
    totalEvaluated: { type: Number }
  }
}, { _id: false });

// =============================================
// Estimate Interface & Schema
// =============================================
export interface IEstimate {
  _id: mongoose.Types.ObjectId;
  
  // Project Information
  projectName: string;
  projectLocation: string;
  implementingOffice: string;      // e.g., "DPWH Bukidnon 1st District Engineering Office"
  
  // BOQ Lines
  boqLines: IBOQLine[];
  
  // Summary Totals
  totalDirectCostSubmitted: number;
  totalDirectCostEvaluated: number;
  totalOCMSubmitted: number;
  totalOCMEvaluated: number;
  totalCPSubmitted: number;
  totalCPEvaluated: number;
  totalVATSubmitted: number;
  totalVATEvaluated: number;
  grandTotalSubmitted: number;
  grandTotalEvaluated: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const estimateSchema = new Schema<IEstimate>({
  projectName: { type: String, required: true },
  projectLocation: { type: String, required: true },
  implementingOffice: { type: String, required: true },
  
  boqLines: { type: [boqLineSchema], default: [] },
  
  totalDirectCostSubmitted: { type: Number, default: 0 },
  totalDirectCostEvaluated: { type: Number, default: 0 },
  totalOCMSubmitted: { type: Number, default: 0 },
  totalOCMEvaluated: { type: Number, default: 0 },
  totalCPSubmitted: { type: Number, default: 0 },
  totalCPEvaluated: { type: Number, default: 0 },
  totalVATSubmitted: { type: Number, default: 0 },
  totalVATEvaluated: { type: Number, default: 0 },
  grandTotalSubmitted: { type: Number, default: 0 },
  grandTotalEvaluated: { type: Number, default: 0 }
}, {
  timestamps: true
});

const Estimate: Model<IEstimate> = mongoose.models.Estimate || mongoose.model<IEstimate>('Estimate', estimateSchema);

export default Estimate;
