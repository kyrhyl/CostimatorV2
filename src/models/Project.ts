import mongoose, { Schema, Model, Document } from 'mongoose';

// ====================================
// MERGED PROJECT MODEL
// Combines BuildingEstimate's structural modeling with cost-estimate-application's project management
// ====================================

// Grid and structural types from BuildingEstimate
export interface IGridLine {
  label: string;
  offset: number;
}

export interface ILevel {
  label: string;
  elevation: number;
}

export interface IElementTemplate {
  id: string;
  type: 'beam' | 'slab' | 'column' | 'foundation';
  name: string;
  properties: Map<string, number>;
  dpwhItemNumber?: string;
  rebarConfig?: {
    mainBars?: {
      count?: number;
      diameter?: number;
      spacing?: number;
    };
    stirrups?: {
      diameter?: number;
      spacing?: number;
    };
    secondaryBars?: {
      diameter?: number;
      spacing?: number;
    };
    dpwhRebarItem?: string;
  };
}

export interface IElementInstance {
  id: string;
  templateId: string;
  placement: {
    gridRef?: string[];
    levelId: string;
    endLevelId?: string;
    customGeometry?: Map<string, number>;
  };
  tags?: string[];
}

// Project settings from BuildingEstimate
export interface IProjectSettings {
  rounding?: {
    concrete?: number;
    rebar?: number;
    formwork?: number;
  };
  waste?: {
    concrete?: number;
    rebar?: number;
    formwork?: number;
  };
  lap?: {
    defaultLapLength?: number;
    minLapLength?: number;
    maxLapLength?: number;
  };
  units?: string;
}

// Merged Project Interface
export interface IProject extends Document {
  // Core project metadata (from cost-estimate-application)
  projectName: string;
  projectLocation: string;
  district: string;
  cmpdVersion?: string; // Selected CMPD version for pricing (e.g., "CMPD-2024-Q1")
  implementingOffice: string;
  appropriation: number;
  contractId?: string;
  projectType?: 'takeoff' | 'boq' | 'hybrid' | string; // Enhanced to support both types
  powMode?: 'takeoff' | 'manual';
  manualPowMetadata?: {
    lastUpdatedBy?: string;
    lastUpdatedAt?: Date;
    notes?: string;
  } | null;
  manualPowConfig?: {
    laborLocation?: string;
    cmpdVersion?: string;
    district?: string;
    vatPercentage?: number;
    notes?: string;
  } | null;
  status: 'Planning' | 'Approved' | 'Ongoing' | 'Completed' | 'Cancelled';
  startDate?: Date;
  endDate?: Date;
  description?: string;

  // Hauling configuration (from cost-estimate-application)
  haulingCostPerKm?: number;
  distanceFromOffice?: number;
  haulingConfig?: {
    materialName?: string;
    materialSource?: string;
    totalDistance?: number;
    freeHaulingDistance?: number;
    routeSegments?: Array<{
      terrain?: string;
      distanceKm: number;
      speedUnloadedKmh: number;
      speedLoadedKmh: number;
    }>;
    equipmentCapacity?: number;
    equipmentRentalRate?: number;
  };

  // DPWH Program of Works fields (from cost-estimate-application)
  address?: string;
  targetStartDate?: Date;
  targetCompletionDate?: Date;
  contractDurationCD?: number;
  workingDays?: number;
  unworkableDays?: {
    sundays?: number;
    holidays?: number;
    rainyDays?: number;
  };
  fundSource?: {
    projectId?: string;
    fundingAgreement?: string;
    fundingOrganization?: string;
  };
  physicalTarget?: {
    infraType?: string;
    projectComponentId?: string;
    targetAmount?: number;
    unitOfMeasure?: string;
  };
  projectComponent?: {
    componentId?: string;
    infraId?: string;
    chainage?: {
      start?: string;
      end?: string;
    };
    stationLimits?: {
      start?: string;
      end?: string;
    };
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  allotedAmount?: number;
  estimatedComponentCost?: number;

  // Structural/Takeoff specific (from BuildingEstimate)
  // Only populated if projectType includes 'takeoff'
  grid?: {
    xLines?: IGridLine[];
    yLines?: IGridLine[];
  };
  gridX?: IGridLine[];
  gridY?: IGridLine[];
  levels?: ILevel[];
  elementTemplates?: IElementTemplate[];
  elementInstances?: IElementInstance[];
  settings?: IProjectSettings;

  // Part E - Finishing Works
  spaces?: any[];
  openings?: any[];
  finishTypes?: any[];
  spaceFinishAssignments?: any[];
  wallSurfaces?: any[];
  wallSurfaceFinishAssignments?: any[];
  
  // Part E - Roofing
  trussDesign?: any;
  roofTypes?: any[];
  roofPlanes?: any[];
  scheduleItems?: any[];

  // Multi-version architecture references
  activeTakeoffVersionId?: mongoose.Types.ObjectId;
  activeCostEstimateId?: mongoose.Types.ObjectId;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Default settings
const defaultSettings: IProjectSettings = {
  rounding: {
    concrete: 3,
    rebar: 2,
    formwork: 2,
  },
  waste: {
    concrete: 0.05,
    rebar: 0.03,
    formwork: 0.02,
  },
  lap: {
    defaultLapLength: 0.4,
    minLapLength: 0.3,
    maxLapLength: 0.6,
  },
  units: 'metric',
};

// Sub-schemas
const GridLineSchema = new Schema<IGridLine>({
  label: { type: String, required: true },
  offset: { type: Number, required: true },
});

const LevelSchema = new Schema<ILevel>({
  label: { type: String, required: true },
  elevation: { type: Number, required: true },
});

const ElementTemplateSchema = new Schema<IElementTemplate>({
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

const ElementInstanceSchema = new Schema<IElementInstance>({
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

// ===================================
// PART E - FINISHING WORKS SCHEMAS
// ===================================

const SpaceSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  levelId: { type: String, required: true },
  boundary: {
    type: { type: String, enum: ['gridRect', 'polygon'], required: true },
    data: { type: Schema.Types.Mixed, required: true },
  },
  computed: {
    area_m2: { type: Number, default: 0 },
    perimeter_m: { type: Number, default: 0 },
  },
  metadata: { type: Map, of: String },
  tags: [String],
});

const OpeningSchema = new Schema({
  id: { type: String, required: true },
  levelId: { type: String, required: true },
  spaceId: String,
  wallSurfaceId: String,
  type: { type: String, enum: ['door', 'window', 'vent', 'louver', 'other'], required: true },
  width_m: { type: Number, required: true },
  height_m: { type: Number, required: true },
  qty: { type: Number, required: true, default: 1 },
  computed: {
    area_m2: { type: Number, default: 0 },
  },
  tags: [String],
});

const FinishTypeSchema = new Schema({
  id: { type: String, required: true },
  category: { type: String, enum: ['floor', 'wall', 'ceiling', 'plaster', 'paint'], required: true },
  finishName: { type: String, required: true },
  dpwhItemNumberRaw: { type: String, required: true },
  unit: { type: String, required: true },
  wallHeightRule: {
    mode: { type: String, enum: ['fullHeight', 'fixed'], default: 'fullHeight' },
    value_m: Number,
  },
  deductionRule: {
    enabled: { type: Boolean, default: true },
    minOpeningAreaToDeduct_m2: { type: Number, default: 0.5 },
    includeTypes: [String],
  },
  assumptions: {
    wastePercent: Number,
    rounding: Number,
    notes: String,
  },
});

const SpaceFinishAssignmentSchema = new Schema({
  id: { type: String, required: true },
  spaceId: { type: String, required: true },
  finishTypeId: { type: String, required: true },
  scope: { type: String, required: true },
  overrides: {
    height_m: Number,
    wastePercent: Number,
  },
});

const WallSurfaceSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  gridLine: {
    axis: { type: String, enum: ['X', 'Y'], required: true },
    label: { type: String, required: true },
    span: { type: [String], required: true },
  },
  levelStart: { type: String, required: true },
  levelEnd: { type: String, required: true },
  surfaceType: { type: String, enum: ['exterior', 'interior', 'both'], required: true },
  facing: { type: String, enum: ['north', 'south', 'east', 'west'] },
  computed: {
    length_m: { type: Number, default: 0 },
    height_m: { type: Number, default: 0 },
    grossArea_m2: { type: Number, default: 0 },
    sidesCount: { type: Number, default: 1 },
    totalArea_m2: { type: Number, default: 0 },
  },
  tags: [String],
});

const WallSurfaceFinishAssignmentSchema = new Schema({
  id: { type: String, required: true },
  wallSurfaceId: { type: String, required: true },
  finishTypeId: { type: String, required: true },
  scope: { type: String, required: true },
  side: { type: String, enum: ['single', 'both'] },
  overrides: {
    wastePercent: Number,
  },
});

// ===================================
// PART E - ROOFING SCHEMAS
// ===================================

const TrussDesignSchema = new Schema({
  trussParams: {
    type: { type: String, enum: ['howe', 'fink', 'kingpost'], default: 'howe' },
    span_mm: { type: Number, default: 8000 },
    middleRise_mm: { type: Number, default: 1600 },
    overhang_mm: { type: Number, default: 450 },
    spacing_mm: { type: Number, default: 600 },
    verticalWebCount: { type: Number, default: 3 },
    plateThickness: { type: String, default: '1.0mm (20 gauge)' },
    topChordMaterial: {
      section: { type: String, default: 'C100x50x20x2.5' },
      weight_kg_per_m: { type: Number, default: 4.89 }
    },
    bottomChordMaterial: {
      section: { type: String, default: 'C100x50x20x2.5' },
      weight_kg_per_m: { type: Number, default: 4.89 }
    },
    webMaterial: {
      section: { type: String, default: '2L50x50x6' },
      weight_kg_per_m: { type: Number, default: 4.5 }
    }
  },
  buildingLength_mm: { type: Number, default: 10000 },
  framingParams: {
    roofingMaterial: {
      type: { type: String, default: 'GI_Sheet' },
      maxPurlinSpacing_mm: { type: Number, default: 1200 }
    },
    purlinSpacing_mm: { type: Number, default: 600 },
    purlinSpec: {
      section: { type: String, default: 'C100x50x20x2.0' },
      weight_kg_per_m: { type: Number, default: 4.07 }
    },
    bracing: {
      type: { type: String, enum: ['X-Brace', 'Diagonal', 'K-Brace'], default: 'X-Brace' },
      interval_mm: { type: Number, default: 6000 },
      material: {
        section: { type: String, default: '2L50x50x6' },
        weight_kg_per_m: { type: Number, default: 4.6 }
      }
    },
    includeRidgeCap: { type: Boolean, default: true },
    includeEaveGirt: { type: Boolean, default: true }
  },
  dpwhItemMappings: {
    trussSteel: {
      dpwhItemNumberRaw: { type: String, default: '1047 (8) a' },
      description: { type: String, default: 'Structural Steel Trusses' },
      unit: { type: String, default: 'Kilogram' }
    },
    purlinSteel: {
      dpwhItemNumberRaw: { type: String, default: '1047 (8) b' },
      description: { type: String, default: 'Structural Steel Purlins' },
      unit: { type: String, default: 'Kilogram' }
    },
    bracingSteel: {
      dpwhItemNumberRaw: { type: String, default: '1047 (4) b' },
      description: { type: String, default: 'Metal Structure Accessories Turnbuckle' },
      unit: { type: String, default: 'Each' }
    },
    sagRods: {
      dpwhItemNumberRaw: { type: String, default: '1047 (5) b' },
      description: { type: String, default: 'Metal Structure Accessories Sagrods' },
      unit: { type: String, default: 'Kilogram' }
    },
    boltsAndRods: {
      dpwhItemNumberRaw: { type: String, default: '1047 (5) a' },
      description: { type: String, default: 'Metal Structure Accessories Bolts and Rods' },
      unit: { type: String, default: 'Kilogram' }
    },
    steelPlates: {
      dpwhItemNumberRaw: { type: String, default: '1047 (5) d' },
      description: { type: String, default: 'Metal Structure Accessories Steel Plates' },
      unit: { type: String, default: 'Kilogram' }
    },
  },
  lastModified: { type: Date, default: Date.now }
});

const RoofTypeSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  roofingMaterial: { type: String, default: 'GI_Sheet' },
  pitch: { type: Number, default: 4 },
  overhang_m: { type: Number, default: 0.6 },
  assumptions: {
    wastePercent: Number,
    notes: String,
  },
});

const RoofPlaneSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  roofTypeId: { type: String, required: true },
  boundary: {
    type: { type: String, enum: ['gridRect', 'polygon'], required: true },
    data: { type: Schema.Types.Mixed, required: true },
  },
  computed: {
    area_m2: { type: Number, default: 0 },
    slopedArea_m2: { type: Number, default: 0 },
  },
  tags: [String],
});

const ScheduleItemSchema = new Schema({
  id: { type: String, required: true },
  category: { type: String, required: true },
  // Legacy fields (kept for backward compatibility)
  itemName: { type: String, default: '' },
  dpwhItemNumberRaw: { type: String, required: true },
  descriptionOverride: { type: String, default: '' },
  unit: { type: String, required: true },
  qty: { type: Number, required: true },
  quantity: { type: Number, default: 0 },
  basisNote: { type: String, default: '' },
  tags: { type: [String], default: [] },

  // Optional fields for doors & windows
  mark: { type: String, default: '' },
  width_m: { type: Number, default: 0 },
  height_m: { type: Number, default: 0 },
  location: { type: String, default: '' },
});

// Main Project Schema
const ProjectSchema = new Schema<IProject>(
  {
    // Core metadata
    projectName: {
      type: String,
      required: true,
    },
    projectLocation: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
      default: 'Bukidnon 1st',
    },
    cmpdVersion: {
      type: String,
      default: '',
    },
    implementingOffice: {
      type: String,
      required: true,
      default: 'DPWH Bukidnon 1st District Engineering Office',
    },
    appropriation: {
      type: Number,
      required: true,
      default: 0,
    },
    contractId: {
      type: String,
      default: '',
    },
    projectType: {
      type: String,
      default: 'boq', // 'takeoff' | 'boq' | 'hybrid'
    },
    powMode: {
      type: String,
      enum: ['takeoff', 'manual'],
      default: 'takeoff',
    },
    manualPowMetadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    manualPowConfig: {
      type: Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: ['Planning', 'Approved', 'Ongoing', 'Completed', 'Cancelled'],
      default: 'Planning',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    description: {
      type: String,
      default: '',
    },

    // Hauling config
    haulingCostPerKm: {
      type: Number,
      min: 0,
      default: 0,
    },
    distanceFromOffice: {
      type: Number,
      min: 0,
      default: 0,
    },
    haulingConfig: {
      type: Schema.Types.Mixed,
      default: null,
    },

    // DPWH fields
    address: {
      type: String,
      default: '',
    },
    targetStartDate: {
      type: Date,
    },
    targetCompletionDate: {
      type: Date,
    },
    contractDurationCD: {
      type: Number,
      default: 0,
    },
    workingDays: {
      type: Number,
      default: 0,
    },
    unworkableDays: {
      type: Schema.Types.Mixed,
      default: null,
    },
    fundSource: {
      type: Schema.Types.Mixed,
      default: null,
    },
    physicalTarget: {
      type: Schema.Types.Mixed,
      default: null,
    },
    projectComponent: {
      type: Schema.Types.Mixed,
      default: null,
    },
    allotedAmount: {
      type: Number,
      default: 0,
    },
    estimatedComponentCost: {
      type: Number,
      default: 0,
    },

    // Structural/Takeoff specific
    grid: {
      xLines: [GridLineSchema],
      yLines: [GridLineSchema],
    },
    levels: [LevelSchema],
    elementTemplates: [ElementTemplateSchema],
    elementInstances: [ElementInstanceSchema],
    settings: {
      type: Schema.Types.Mixed,
      default: defaultSettings,
    },

    // Part E - Finishing Works
    spaces: [SpaceSchema],
    openings: [OpeningSchema],
    finishTypes: [FinishTypeSchema],
    spaceFinishAssignments: [SpaceFinishAssignmentSchema],
    wallSurfaces: [WallSurfaceSchema],
    wallSurfaceFinishAssignments: [WallSurfaceFinishAssignmentSchema],
    
    // Part E - Roofing
    trussDesign: TrussDesignSchema,
    roofTypes: [RoofTypeSchema],
    roofPlanes: [RoofPlaneSchema],
    scheduleItems: [ScheduleItemSchema],

    // Multi-version architecture references
    activeTakeoffVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'TakeoffVersion',
      default: null,
    },
    activeCostEstimateId: {
      type: Schema.Types.ObjectId,
      ref: 'CostEstimate',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ProjectSchema.index({ projectName: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ projectType: 1 });
ProjectSchema.index({ createdAt: -1 });

const Project: Model<IProject> = 
  mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);

export default Project;
