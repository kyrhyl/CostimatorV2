import mongoose, { Schema } from 'mongoose';

/**
 * PROJECT ESTIMATE MODEL (CURRENT - Approval Workflow)
 * 
 * ✅ CURRENT: Use this model for project-based estimates with approval workflows.
 * 
 * This model provides:
 * - Versioned cost estimates linked to projects
 * - Multi-step approval workflow (draft → submitted → approved/rejected)
 * - Rate item-based pricing
 * - Historical tracking of estimate versions
 * 
 * Key Features:
 * - Status tracking: draft, submitted, approved, rejected
 * - Version control with effectiveDate
 * - Approval metadata (preparedBy, approvedBy, dates, comments)
 * - Supports price comparisons across versions
 * 
 * Related Models:
 * - Project: Parent project reference
 * - RateItem: Pay item pricing data
 * - CostEstimate: Alternative takeoff-driven estimation (simpler, no workflow)
 */

// =============================================
// ProjectEstimate Model
// Cost estimates generated from a project's BOQ items
// Supports versioning and approval workflow
// =============================================

export interface IProjectEstimate {
  // Relationship
  projectId: mongoose.Types.ObjectId;
  
  // Version Control
  version: number;                  // 1, 2, 3... for revisions
  estimateType: 'preliminary' | 'detailed' | 'revised' | 'final';
  
  // Status Workflow
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  
  // Approval Chain
  preparedBy?: string;
  preparedDate?: Date;
  reviewedBy?: string;
  reviewedDate?: Date;
  approvedBy?: string;
  approvedDate?: Date;
  
  // Cost Summary (aggregated from ProjectBOQ at time of generation)
  totalDirectCost: number;
  totalOCM: number;
  totalCP: number;
  totalVAT: number;
  grandTotal: number;
  
  // Markup Percentages (captured at estimate time)
  ocmPercentage: number;
  cpPercentage: number;
  vatPercentage: number;
  
  // Submitted vs Evaluated (for bid comparison)
  submittedTotal?: number;
  evaluatedTotal?: number;
  variance?: number;
  
  // Metadata
  notes?: string;
  revisionReason?: string;          // Why this version was created
  
  // BOQ Snapshot (freeze BOQ state at estimate time for audit trail)
  boqSnapshot: Array<{
    projectBOQId: mongoose.Types.ObjectId;
    payItemNumber: string;
    description: string;
    quantity: number;
    unitCost: number;
    totalAmount: number;
    category?: string;
  }>;
  
  // Item count for quick reference
  totalItems: number;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

const projectEstimateSchema = new Schema<IProjectEstimate>({
  projectId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true, 
    index: true 
  },
  
  version: { type: Number, required: true, default: 1 },
  estimateType: { 
    type: String, 
    enum: ['preliminary', 'detailed', 'revised', 'final'],
    default: 'detailed',
    required: true
  },
  
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'draft',
    required: true
  },
  
  preparedBy: { type: String },
  preparedDate: { type: Date },
  reviewedBy: { type: String },
  reviewedDate: { type: Date },
  approvedBy: { type: String },
  approvedDate: { type: Date },
  
  totalDirectCost: { type: Number, required: true, default: 0 },
  totalOCM: { type: Number, required: true, default: 0 },
  totalCP: { type: Number, required: true, default: 0 },
  totalVAT: { type: Number, required: true, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },
  
  ocmPercentage: { type: Number, required: true, default: 10 },
  cpPercentage: { type: Number, required: true, default: 10 },
  vatPercentage: { type: Number, required: true, default: 12 },
  
  submittedTotal: { type: Number },
  evaluatedTotal: { type: Number },
  variance: { type: Number },
  
  notes: { type: String },
  revisionReason: { type: String },
  
  boqSnapshot: [{
    projectBOQId: { type: Schema.Types.ObjectId, ref: 'ProjectBOQ', required: true },
    payItemNumber: { type: String, required: true },
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    category: { type: String }
  }],
  
  totalItems: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Compound index for project + version (ensure unique versions per project)
projectEstimateSchema.index({ projectId: 1, version: 1 }, { unique: true });
projectEstimateSchema.index({ projectId: 1, status: 1 });
projectEstimateSchema.index({ status: 1 });

export default mongoose.models.ProjectEstimate || 
  mongoose.model<IProjectEstimate>('ProjectEstimate', projectEstimateSchema);
