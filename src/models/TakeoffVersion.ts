import mongoose, { Schema, Model, Document } from 'mongoose';
import { 
  IGridLine, 
  ILevel, 
  IElementTemplate, 
  IElementInstance 
} from './Project';

/**
 * TAKEOFF VERSION MODEL
 * Captures a snapshot of design quantities at a specific point in time
 * Supports multiple versions per project for design revision tracking
 */

// ====================================
// INTERFACES
// ====================================

export interface IChangeSummary {
  elementsAdded: number;
  elementsRemoved: number;
  elementsModified: number;
  quantityDelta_concrete?: number;
  quantityDelta_rebar?: number;
  quantityDelta_formwork?: number;
}

export interface ITakeoffVersion extends Document {
  // Parent reference
  projectId: mongoose.Types.ObjectId;
  
  // Version Metadata
  versionNumber: number;           // Auto-incremented: 1, 2, 3...
  versionLabel: string;             // "Preliminary Design", "Final Design", "As-Built"
  versionType: 'preliminary' | 'detailed' | 'revised' | 'final' | 'as-built';
  description?: string;             // What changed in this version
  
  // Status & Workflow
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'superseded';
  createdBy: string;
  createdAt: Date;
  submittedBy?: string;
  submittedAt?: Date;
  approvedBy?: string;
  approvedDate?: Date;
  rejectionReason?: string;
  
  // Design Data (Snapshot) - Core Structural
  grid: {
    xLines: IGridLine[];
    yLines: IGridLine[];
  };
  levels: ILevel[];
  elementTemplates: IElementTemplate[];
  elementInstances: IElementInstance[];
  
  // Design Data (Snapshot) - Part E Finishing Works
  spaces?: any[];
  openings?: any[];
  finishTypes?: any[];
  spaceFinishAssignments?: any[];
  wallSurfaces?: any[];
  wallSurfaceFinishAssignments?: any[];
  
  // Design Data (Snapshot) - Part E Roofing
  trussDesign?: any;
  roofTypes?: any[];
  roofPlanes?: any[];
  scheduleItems?: any[];
  
  // Computed Quantities (Cached for performance)
  boqLines: any[];                  // Full BOQ snapshot
  totalConcrete_m3: number;
  totalRebar_kg: number;
  totalFormwork_m2: number;
  boqLineCount: number;
  
  // Comparison Metadata
  parentVersionId?: mongoose.Types.ObjectId;  // Reference to version this was based on
  changesSummary?: IChangeSummary;
  
  // Timestamps
  updatedAt: Date;
  
  // Instance methods
  supersede(): Promise<void>;
  submit(submittedBy: string): Promise<void>;
  approve(approvedBy: string): Promise<void>;
  reject(rejectedBy: string, reason: string): Promise<void>;
}

// Static methods interface
export interface ITakeoffVersionModel extends Model<ITakeoffVersion> {
  getNextVersionNumber(projectId: string): Promise<number>;
  getActiveVersion(projectId: string): Promise<ITakeoffVersion | null>;
  getProjectVersions(projectId: string, options?: { includeSuperseded?: boolean }): Promise<ITakeoffVersion[]>;
}

// ====================================
// SUB-SCHEMAS (imported from Project model)
// ====================================

const GridLineSchema = new Schema({
  label: { type: String, required: true },
  offset: { type: Number, required: true },
});

const LevelSchema = new Schema({
  label: { type: String, required: true },
  elevation: { type: Number, required: true },
});

const ElementTemplateSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['beam', 'slab', 'column', 'foundation'], required: true },
  name: { type: String, required: true },
  properties: { type: Map, of: Number, required: true },
  dpwhItemNumber: String,
  rebarConfig: {
    mainBars: {
      count: Number,
      diameter: Number,
      spacing: Number,
    },
    stirrups: {
      diameter: Number,
      spacing: Number,
    },
    secondaryBars: {
      diameter: Number,
      spacing: Number,
    },
    dpwhRebarItem: String,
  },
});

const ElementInstanceSchema = new Schema({
  id: { type: String, required: true },
  templateId: { type: String, required: true },
  placement: {
    gridRef: [String],
    levelId: { type: String, required: true },
    endLevelId: String,
    customGeometry: { type: Map, of: Number },
  },
  tags: [String],
});

const ChangeSummarySchema = new Schema({
  elementsAdded: { type: Number, default: 0 },
  elementsRemoved: { type: Number, default: 0 },
  elementsModified: { type: Number, default: 0 },
  quantityDelta_concrete: Number,
  quantityDelta_rebar: Number,
  quantityDelta_formwork: Number,
}, { _id: false });

// ====================================
// MAIN SCHEMA
// ====================================

const TakeoffVersionSchema = new Schema<ITakeoffVersion>(
  {
    // Parent reference
    projectId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Project', 
      required: true,
      index: true 
    },
    
    // Version Metadata
    versionNumber: { 
      type: Number, 
      required: true,
      min: 1
    },
    versionLabel: { 
      type: String, 
      required: true,
      trim: true
    },
    versionType: {
      type: String,
      enum: ['preliminary', 'detailed', 'revised', 'final', 'as-built'],
      required: true,
      index: true
    },
    description: { 
      type: String,
      default: ''
    },
    
    // Status & Workflow
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'superseded'],
      default: 'draft',
      index: true
    },
    createdBy: { 
      type: String, 
      required: true 
    },
    submittedBy: String,
    submittedAt: Date,
    approvedBy: String,
    approvedDate: Date,
    rejectionReason: String,
    
    // Design Data - Core Structural
    grid: {
      xLines: [GridLineSchema],
      yLines: [GridLineSchema]
    },
    levels: {
      type: [LevelSchema],
      default: []
    },
    elementTemplates: {
      type: [ElementTemplateSchema],
      default: []
    },
    elementInstances: {
      type: [ElementInstanceSchema],
      default: []
    },
    
    // Design Data - Part E Finishing Works
    spaces: {
      type: Schema.Types.Mixed,
      default: []
    },
    openings: {
      type: Schema.Types.Mixed,
      default: []
    },
    finishTypes: {
      type: Schema.Types.Mixed,
      default: []
    },
    spaceFinishAssignments: {
      type: Schema.Types.Mixed,
      default: []
    },
    wallSurfaces: {
      type: Schema.Types.Mixed,
      default: []
    },
    wallSurfaceFinishAssignments: {
      type: Schema.Types.Mixed,
      default: []
    },
    
    // Design Data - Part E Roofing
    trussDesign: {
      type: Schema.Types.Mixed,
      default: null
    },
    roofTypes: {
      type: Schema.Types.Mixed,
      default: []
    },
    roofPlanes: {
      type: Schema.Types.Mixed,
      default: []
    },
    scheduleItems: {
      type: Schema.Types.Mixed,
      default: []
    },
    
    // Computed Quantities (Cached)
    boqLines: {
      type: Schema.Types.Mixed,
      default: []
    },
    totalConcrete_m3: {
      type: Number,
      default: 0,
      min: 0
    },
    totalRebar_kg: {
      type: Number,
      default: 0,
      min: 0
    },
    totalFormwork_m2: {
      type: Number,
      default: 0,
      min: 0
    },
    boqLineCount: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Comparison Metadata
    parentVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'TakeoffVersion',
      default: null
    },
    changesSummary: {
      type: ChangeSummarySchema,
      default: null
    }
  },
  { 
    timestamps: true,
    collection: 'takeoffversions'
  }
);

// ====================================
// INDEXES
// ====================================

// Compound index: Ensure unique version numbers per project
TakeoffVersionSchema.index({ projectId: 1, versionNumber: 1 }, { unique: true });

// Query indexes
TakeoffVersionSchema.index({ projectId: 1, status: 1 });
TakeoffVersionSchema.index({ projectId: 1, versionType: 1 });
TakeoffVersionSchema.index({ projectId: 1, createdAt: -1 });
TakeoffVersionSchema.index({ createdAt: -1 });

// ====================================
// METHODS
// ====================================

/**
 * Get next version number for a project
 */
TakeoffVersionSchema.statics.getNextVersionNumber = async function(
  projectId: string
): Promise<number> {
  const latestVersion = await this.findOne({ projectId })
    .sort({ versionNumber: -1 })
    .select('versionNumber')
    .lean();
  
  return (latestVersion?.versionNumber || 0) + 1;
};

/**
 * Get active/approved version for a project
 */
TakeoffVersionSchema.statics.getActiveVersion = async function(
  projectId: string
): Promise<ITakeoffVersion | null> {
  return this.findOne({ 
    projectId, 
    status: 'approved' 
  })
    .sort({ versionNumber: -1 })
    .lean();
};

/**
 * Get all versions for a project
 */
TakeoffVersionSchema.statics.getProjectVersions = async function(
  projectId: string,
  options: { includeSuperseded?: boolean } = {}
): Promise<ITakeoffVersion[]> {
  const query: any = { projectId };
  
  if (!options.includeSuperseded) {
    query.status = { $ne: 'superseded' };
  }
  
  return this.find(query)
    .sort({ versionNumber: -1 })
    .lean();
};

/**
 * Mark version as superseded
 */
TakeoffVersionSchema.methods.supersede = async function(): Promise<void> {
  this.status = 'superseded';
  await this.save();
};

/**
 * Submit version for approval
 */
TakeoffVersionSchema.methods.submit = async function(submittedBy: string): Promise<void> {
  if (this.status !== 'draft') {
    throw new Error('Only draft versions can be submitted');
  }
  
  this.status = 'submitted';
  this.submittedBy = submittedBy;
  this.submittedAt = new Date();
  await this.save();
};

/**
 * Approve version
 */
TakeoffVersionSchema.methods.approve = async function(approvedBy: string): Promise<void> {
  if (this.status !== 'submitted') {
    throw new Error('Only submitted versions can be approved');
  }
  
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedDate = new Date();
  await this.save();
};

/**
 * Reject version
 */
TakeoffVersionSchema.methods.reject = async function(
  rejectedBy: string, 
  reason: string
): Promise<void> {
  if (this.status !== 'submitted') {
    throw new Error('Only submitted versions can be rejected');
  }
  
  this.status = 'rejected';
  this.rejectionReason = reason;
  await this.save();
};

// ====================================
// MODEL EXPORT
// ====================================

const TakeoffVersion = (mongoose.models.TakeoffVersion || 
  mongoose.model<ITakeoffVersion, ITakeoffVersionModel>('TakeoffVersion', TakeoffVersionSchema)) as ITakeoffVersionModel;

export default TakeoffVersion;
