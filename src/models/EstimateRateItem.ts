import mongoose, { Schema, Model, Document } from 'mongoose';

/**
 * ESTIMATE RATE ITEM MODEL
 * BOQ line item with full DUPA costing breakdown for cost estimates
 * Each EstimateRateItem belongs to a CostEstimate and represents a fully-priced BOQ line
 * 
 * Note: This is different from RateItem which is for DUPA templates
 */

// ====================================
// INTERFACES
// ====================================

export interface IEstimateLaborItem {
  designation: string;
  noOfPersons: number;
  noOfHours: number;
  hourlyRate: number;
  amount: number;
}

export interface IEstimateEquipmentItem {
  equipmentId?: mongoose.Types.ObjectId;
  description: string;
  noOfUnits: number;
  noOfHours: number;
  hourlyRate: number;
  amount: number;
}

export interface IEstimateMaterialItem {
  materialCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
  amount: number;
  haulingIncluded?: boolean;
  basePrice?: number;
  haulingCost?: number;
  priceSource?: 'cmpd' | 'canvass' | 'missing';
  requiresCanvass?: boolean;
}

export interface IEstimateCostBreakdown {
  laborCost: number;
  equipmentCost: number;
  materialCost: number;
  directCost: number;
  ocmPercentage: number;
  ocmCost: number;
  cpPercentage: number;
  cpCost: number;
  vatPercentage: number;
  vatCost: number;
  subtotalWithMarkup: number;
  totalUnitCost: number;
  totalAmount: number;
}

export interface IEstimateRateItem extends Document {
  // Parent reference
  costEstimateId: mongoose.Types.ObjectId;
  
  // Item Reference
  payItemNumber: string;
  description: string;
  unit: string;
  quantity: number;
  
  // DUPA Breakdown
  laborItems: IEstimateLaborItem[];
  equipmentItems: IEstimateEquipmentItem[];
  materialItems: IEstimateMaterialItem[];
  
  // Cost Breakdown (per unit)
  costBreakdown: IEstimateCostBreakdown;
  
  // Metadata
  location: string;
  district: string;
  cmpdVersion: string;
  effectiveDate: Date;
  ratesAppliedAt: Date;
  
  // Traceability
  sourceBoqLineId?: string;           // Link back to takeoff BOQLine
  dupaTemplateId?: mongoose.Types.ObjectId;  // Which DUPA was used
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  calculateCosts(ocmPercentage?: number, cpPercentage?: number, vatPercentage?: number): void;
  getCostSummary(): IEstimateCostBreakdown;
  getEstimateItems(): {
    laborItems: IEstimateLaborItem[];
    equipmentItems: IEstimateEquipmentItem[];
    materialItems: IEstimateMaterialItem[];
  };
}

// Static methods interface
export interface IEstimateRateItemModel extends Model<IEstimateRateItem> {
  getEstimateItems(costEstimateId: string): Promise<IEstimateRateItem[]>;
  getCostSummary(costEstimateId: string): Promise<{
    totalDirectCost: number;
    totalOCM: number;
    totalCP: number;
    subtotalWithMarkup: number;
    totalVAT: number;
    grandTotal: number;
    rateItemsCount: number;
  }>;
  deleteEstimateItems(costEstimateId: string): Promise<void>;
}

// ====================================
// SUB-SCHEMAS
// ====================================

const EstimateLaborItemSchema = new Schema({
  designation: { type: String, required: true },
  noOfPersons: { type: Number, required: true, min: 0 },
  noOfHours: { type: Number, required: true, min: 0 },
  hourlyRate: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const EstimateEquipmentItemSchema = new Schema({
  equipmentId: { type: Schema.Types.ObjectId, ref: 'Equipment' },
  description: { type: String, required: true },
  noOfUnits: { type: Number, required: true, min: 0 },
  noOfHours: { type: Number, required: true, min: 0 },
  hourlyRate: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const EstimateMaterialItemSchema = new Schema({
  materialCode: { type: String, required: true },
  description: { type: String, required: true },
  unit: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  haulingIncluded: { type: Boolean, default: false },
  basePrice: { type: Number, min: 0 },
  haulingCost: { type: Number, min: 0 },
  priceSource: { type: String, enum: ['cmpd', 'canvass', 'missing'], default: 'cmpd' },
  requiresCanvass: { type: Boolean, default: false }
}, { _id: false });

const EstimateCostBreakdownSchema = new Schema({
  laborCost: { type: Number, required: true, default: 0, min: 0 },
  equipmentCost: { type: Number, required: true, default: 0, min: 0 },
  materialCost: { type: Number, required: true, default: 0, min: 0 },
  directCost: { type: Number, required: true, default: 0, min: 0 },
  ocmPercentage: { type: Number, required: true, default: 12, min: 0 },
  ocmCost: { type: Number, required: true, default: 0, min: 0 },
  cpPercentage: { type: Number, required: true, default: 10, min: 0 },
  cpCost: { type: Number, required: true, default: 0, min: 0 },
  vatPercentage: { type: Number, required: true, default: 12, min: 0 },
  vatCost: { type: Number, required: true, default: 0, min: 0 },
  subtotalWithMarkup: { type: Number, required: true, default: 0, min: 0 },
  totalUnitCost: { type: Number, required: true, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, default: 0, min: 0 }
}, { _id: false });

// ====================================
// MAIN SCHEMA
// ====================================

const EstimateRateItemSchema = new Schema<IEstimateRateItem>(
  {
    // Parent reference
    costEstimateId: { 
      type: Schema.Types.ObjectId, 
      ref: 'CostEstimate', 
      required: true,
      index: true 
    },
    
    // Item Reference
    payItemNumber: { 
      type: String, 
      required: true,
      trim: true,
      index: true
    },
    description: { 
      type: String, 
      required: true,
      trim: true
    },
    unit: { 
      type: String, 
      required: true,
      trim: true
    },
    quantity: { 
      type: Number, 
      required: true,
      min: 0
    },
    
    // DUPA Breakdown
    laborItems: {
      type: [EstimateLaborItemSchema],
      default: []
    },
    equipmentItems: {
      type: [EstimateEquipmentItemSchema],
      default: []
    },
    materialItems: {
      type: [EstimateMaterialItemSchema],
      default: []
    },
    
    // Cost Breakdown
    costBreakdown: {
      type: EstimateCostBreakdownSchema,
      required: true,
      default: () => ({
        laborCost: 0,
        equipmentCost: 0,
        materialCost: 0,
        directCost: 0,
        ocmPercentage: 12,
        ocmCost: 0,
        cpPercentage: 10,
        cpCost: 0,
        vatPercentage: 12,
        vatCost: 0,
        subtotalWithMarkup: 0,
        totalUnitCost: 0,
        totalAmount: 0
      })
    },
    
    // Metadata
    location: { 
      type: String, 
      required: true,
      trim: true
    },
    district: { 
      type: String, 
      required: true,
      trim: true
    },
    cmpdVersion: { 
      type: String, 
      required: true,
      trim: true
    },
    effectiveDate: { 
      type: Date, 
      required: true
    },
    ratesAppliedAt: { 
      type: Date, 
      required: true,
      default: Date.now
    },
    
    // Traceability
    sourceBoqLineId: {
      type: String,
      default: null
    },
    dupaTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'DUPATemplate',
      default: null
    }
  },
  { 
    timestamps: true,
    collection: 'estimaterateitems'
  }
);

// ====================================
// INDEXES
// ====================================

// Main query indexes
EstimateRateItemSchema.index({ costEstimateId: 1, payItemNumber: 1 });
EstimateRateItemSchema.index({ costEstimateId: 1, createdAt: -1 });

// Search index
EstimateRateItemSchema.index({ description: 'text' });

// ====================================
// STATIC METHODS
// ====================================

/**
 * Get all rate items for a cost estimate
 */
EstimateRateItemSchema.statics.getEstimateItems = async function(
  costEstimateId: string
): Promise<IEstimateRateItem[]> {
  return this.find({ costEstimateId })
    .sort({ payItemNumber: 1 })
    .lean();
};

/**
 * Get cost summary for a cost estimate
 */
EstimateRateItemSchema.statics.getCostSummary = async function(
  costEstimateId: string
): Promise<{
  totalDirectCost: number;
  totalOCM: number;
  totalCP: number;
  subtotalWithMarkup: number;
  totalVAT: number;
  grandTotal: number;
  rateItemsCount: number;
}> {
  const items = await this.find({ costEstimateId }).lean();
  
  if (items.length === 0) {
    return {
      totalDirectCost: 0,
      totalOCM: 0,
      totalCP: 0,
      subtotalWithMarkup: 0,
      totalVAT: 0,
      grandTotal: 0,
      rateItemsCount: 0
    };
  }
  
  const totalDirectCost = items.reduce((sum: number, item: any) => {
    return sum + (item.costBreakdown.directCost * item.quantity);
  }, 0);
  
  const totalOCM = items.reduce((sum: number, item: any) => {
    return sum + item.costBreakdown.ocmCost;
  }, 0);
  
  const totalCP = items.reduce((sum: number, item: any) => {
    return sum + item.costBreakdown.cpCost;
  }, 0);
  
  const subtotalWithMarkup = items.reduce((sum: number, item: any) => {
    return sum + item.costBreakdown.subtotalWithMarkup;
  }, 0);
  
  const totalVAT = items.reduce((sum: number, item: any) => {
    return sum + item.costBreakdown.vatCost;
  }, 0);
  
  const grandTotal = items.reduce((sum: number, item: any) => {
    return sum + item.costBreakdown.totalAmount;
  }, 0);
  
  return {
    totalDirectCost,
    totalOCM,
    totalCP,
    subtotalWithMarkup,
    totalVAT,
    grandTotal,
    rateItemsCount: items.length
  };
};

/**
 * Delete all rate items for a cost estimate
 */
EstimateRateItemSchema.statics.deleteEstimateItems = async function(
  costEstimateId: string
): Promise<void> {
  await this.deleteMany({ costEstimateId });
};

// ====================================
// INSTANCE METHODS
// ====================================

/**
 * Calculate cost breakdown from DUPA components
 */
EstimateRateItemSchema.methods.calculateCosts = function(
  ocmPercentage: number,
  cpPercentage: number,
  vatPercentage: number
): void {
  // Calculate component totals
  const laborCost = this.laborItems.reduce((sum: number, item: any) => sum + item.amount, 0);
  const equipmentCost = this.equipmentItems.reduce((sum: number, item: any) => sum + item.amount, 0);
  const materialCost = this.materialItems.reduce((sum: number, item: any) => sum + item.amount, 0);
  
  // Direct cost (per unit of work)
  const directCost = laborCost + equipmentCost + materialCost;
  
  // Markups (DPWH percentages)
  const ocmCost = directCost * (ocmPercentage / 100);
  const cpCost = directCost * (cpPercentage / 100);
  const subtotalWithMarkup = directCost + ocmCost + cpCost;
  
  // VAT
  const vatCost = subtotalWithMarkup * (vatPercentage / 100);
  
  // Total unit cost
  const totalUnitCost = subtotalWithMarkup + vatCost;
  
  // Total amount (unit cost × quantity)
  const totalAmount = totalUnitCost * this.quantity;
  
  // Update cost breakdown
  this.costBreakdown = {
    laborCost,
    equipmentCost,
    materialCost,
    directCost,
    ocmPercentage,
    ocmCost,
    cpPercentage,
    cpCost,
    vatPercentage,
    vatCost,
    subtotalWithMarkup,
    totalUnitCost,
    totalAmount
  };
};

// ====================================
// MODEL EXPORT
// ====================================

const EstimateRateItem = (mongoose.models.EstimateRateItem || 
  mongoose.model<IEstimateRateItem, IEstimateRateItemModel>('EstimateRateItem', EstimateRateItemSchema)) as IEstimateRateItemModel;

export default EstimateRateItem;
