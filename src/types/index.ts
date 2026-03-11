/**
 * CORE TYPE DEFINITIONS
 * Stable contracts for the Building Estimate system
 * Following strict layer separation principles
 */

// ===================================
// PROJECT & SETTINGS
// ===================================

export interface ProjectSettings {
  rounding: {
    concrete: number; // decimal places for concrete volumes
    rebar: number; // decimal places for rebar weights
    formwork: number; // decimal places for formwork areas
  };
  waste: {
    concrete: number; // waste percentage (e.g., 0.05 for 5%)
    rebar: number;
    formwork: number;
  };
  lap: {
    defaultLapLength: number; // meters
    minLapLength: number;
    maxLapLength: number;
  };
  units: 'metric'; // locked to metric
}

export interface GridLine {
  label: string; // e.g., "A", "B", "1", "2"
  offset: number; // meters from origin
}

export interface Level {
  label: string; // e.g., "GL", "2F", "ROOF"
  elevation: number; // meters from reference datum
}

export interface RebarConfig {
  // Main reinforcement (longitudinal bars)
  mainBars?: {
    count?: number;       // Number of bars (for beams/columns)
    diameter: number;     // Bar diameter in mm (10, 12, 16, 20, 25, 28, 32, 36, 40)
    spacing?: number;     // Center-to-center spacing in meters (for slabs/foundations)
  };
  // Lateral reinforcement (stirrups/ties)
  stirrups?: {
    diameter: number;    // Stirrup diameter in mm
    spacing: number;     // Center-to-center spacing in meters
  };
  // For slabs/foundations: secondary reinforcement (perpendicular to main)
  secondaryBars?: {
    diameter: number;    // Bar diameter in mm
    spacing: number;     // Center-to-center spacing in meters
  };
  // DPWH rebar item number for BOQ mapping
  dpwhRebarItem?: string; // e.g., "902 (1) a1" - 10mm deformed bars
}

export interface ElementTemplate {
  id: string;
  type: 'beam' | 'slab' | 'column' | 'foundation';
  name: string;
  properties: Record<string, number>; // e.g., { width: 0.3, height: 0.5 }
  dpwhItemNumber?: string; // DPWH catalog item for BOQ mapping (e.g., "900 (1) a")
  rebarConfig?: RebarConfig;
}


export interface ElementInstance {
  id: string;
  templateId: string;
  placement: {
    gridRef?: string[]; // e.g., ["A-B", "1-2"] for slabs
    levelId: string;
    endLevelId?: string; // for columns - level where column ends
    customGeometry?: Record<string, number>; // override template
  };
  tags: string[]; // for filtering/grouping
}

export interface ProjectModel {
  _id?: string;
  name: string;
  description?: string;
  settings: ProjectSettings;
  gridX?: GridLine[];
  gridY?: GridLine[];
  levels?: Level[];
  elementTemplates?: ElementTemplate[];
  elementInstances?: ElementInstance[];
  // Finishing Works (Mode A)
  spaces?: Space[];
  openings?: Opening[];
  finishTypes?: FinishType[];
  spaceFinishAssignments?: SpaceFinishAssignment[];
  wallSurfaces?: WallSurface[]; // Grid-based wall surface definitions
  wallSurfaceFinishAssignments?: WallSurfaceFinishAssignment[]; // Finish assignments for walls
  // Roofing (Mode B)
  trussDesign?: TrussDesign;
  roofTypes?: RoofType[];
  roofPlanes?: RoofPlane[];
  // Schedule Items (Mode C)
  scheduleItems?: ScheduleItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TrussDesign {
  trussParams: {
    type: 'howe' | 'fink' | 'kingpost';
    span_mm: number;
    middleRise_mm: number;
    overhang_mm: number;
    spacing_mm: number;
    verticalWebCount: number;
    plateThickness: string;
    topChordMaterial: { section: string; weight_kg_per_m: number };
    bottomChordMaterial: { section: string; weight_kg_per_m: number };
    webMaterial: { section: string; weight_kg_per_m: number };
  };
  buildingLength_mm: number;
  framingParams: {
    roofingMaterial: { type: string; maxPurlinSpacing_mm: number };
    purlinSpacing_mm: number;
    purlinSpec: { section: string; weight_kg_per_m: number };
    bracing: {
      type: 'X-Brace' | 'Diagonal' | 'K-Brace';
      interval_mm: number;
      material: { section: string; weight_kg_per_m: number };
    };
    includeRidgeCap: boolean;
    includeEaveGirt: boolean;
  };
  lastModified?: Date;
}

// ===================================
// FINISHING WORKS
// ===================================

export interface Space {
  id: string;
  name: string;
  levelId: string;
  boundary: {
    type: 'gridRect' | 'polygon';
    data: GridRectBoundary | PolygonBoundary;
  };
  computed: {
    area_m2: number;
    perimeter_m: number;
  };
  metadata?: Record<string, string>;
  tags: string[];
}

export interface GridRectBoundary {
  gridX: [string, string]; // [startLabel, endLabel]
  gridY: [string, string];
}

export interface PolygonBoundary {
  points: [number, number][]; // [[x, y], ...]
}

export interface Opening {
  id: string;
  levelId: string;
  spaceId?: string; // optional - for space-based calculations (legacy)
  wallSurfaceId?: string; // optional - for wall surface-based calculations
  type: 'door' | 'window' | 'vent' | 'louver' | 'other';
  width_m: number;
  height_m: number;
  qty: number;
  computed: {
    area_m2: number;
  };
  tags: string[];
}

export interface WallSurface {
  id: string;
  name: string; // e.g., "North Exterior Wall", "Living Room Partition"
  gridLine: {
    axis: 'X' | 'Y'; // X = gridX lines (typically labeled A, B, C), Y = gridY lines (typically 1, 2, 3)
    label: string; // e.g., "A" or "1"
    span: [string, string]; // e.g., ["1", "5"] for grid A from row 1 to 5
  };
  levelStart: string; // Starting level label
  levelEnd: string; // Ending level label
  surfaceType: 'exterior' | 'interior' | 'both'; // Classification
  facing?: 'north' | 'south' | 'east' | 'west'; // Optional orientation
  computed: {
    length_m: number; // Horizontal length from grid span
    height_m: number; // Vertical height from level difference
    grossArea_m2: number; // length × height
    sidesCount: number; // 1 for exterior, 2 for interior (both faces)
    totalArea_m2: number; // grossArea × sidesCount
  };
  tags: string[];
}

export interface FinishType {
  id: string;
  category: 'floor' | 'wall' | 'ceiling' | 'plaster' | 'paint';
  finishName: string;
  dpwhItemNumberRaw: string; // must exist in catalog
  unit: string; // must match DPWH unit
  wallHeightRule?: {
    mode: 'fullHeight' | 'fixed';
    value_m?: number; // required if mode=fixed
  };
  deductionRule?: {
    enabled: boolean;
    minOpeningAreaToDeduct_m2: number;
    includeTypes: string[]; // e.g., ["door", "window"]
  };
  assumptions?: {
    wastePercent?: number;
    rounding?: number;
    notes?: string;
  };
}

export interface SpaceFinishAssignment {
  id: string;
  spaceId: string;
  finishTypeId: string;
  scope: string; // "base", "plaster", "paint", "tile", "ceiling", etc.
  overrides?: {
    height_m?: number;
    wastePercent?: number;
  };
}

export interface WallSurfaceFinishAssignment {
  id: string;
  wallSurfaceId: string;
  finishTypeId: string;
  scope: string; // "plaster", "paint", "tile", etc.
  side?: 'single' | 'both'; // Override default sides count from surface type
  overrides?: {
    wastePercent?: number;
  };
}

// ===================================
// ROOFING (MODE B)
// ===================================

export interface RoofType {
  id: string;
  name: string;
  dpwhItemNumberRaw: string; // must exist in catalog (e.g., "1013", "1014", "1015")
  unit: string; // must match DPWH unit (typically "Square Meter")
  areaBasis: 'slopeArea' | 'planArea'; // default slopeArea
  lapAllowancePercent: number; // e.g., 0.10 for 10% lap
  wastePercent: number; // e.g., 0.05 for 5%
  assumptions?: {
    accessoriesBundled?: boolean; // ridges, valleys, etc.
    fastenersIncluded?: boolean;
    notes?: string;
  };
}

export interface RoofPlane {
  id: string;
  name: string;
  levelId: string; // roof level reference
  boundary: {
    type: 'gridRect' | 'polygon';
    data: GridRectBoundary | PolygonBoundary;
  };
  slope: {
    mode: 'ratio' | 'degrees';
    value: number; // rise/run ratio (e.g., 0.25 for 1:4) or degrees (e.g., 14.04)
  };
  roofTypeId: string;
  computed: {
    planArea_m2: number;
    slopeFactor: number;
    slopeArea_m2: number;
  };
  tags: string[];
}

// Truss Design (Part E - Steel Roof Trusses & Framing)
export interface DPWHItemMapping {
  dpwhItemNumberRaw: string; // e.g., "1047 (8) a"
  description: string; // from catalog
  unit: string; // e.g., "Kilogram"
}

export interface TrussDesign {
  trussParams: {
    type: 'howe' | 'fink' | 'kingpost';
    span_mm: number;
    middleRise_mm: number;
    overhang_mm: number;
    spacing_mm: number;
    verticalWebCount: number;
    plateThickness: string;
    topChordMaterial: { section: string; weight_kg_per_m: number };
    bottomChordMaterial: { section: string; weight_kg_per_m: number };
    webMaterial: { section: string; weight_kg_per_m: number };
  };
  buildingLength_mm: number;
  framingParams: {
    roofingMaterial: { type: string; maxPurlinSpacing_mm: number };
    purlinSpacing_mm: number;
    purlinSpec: { section: string; weight_kg_per_m: number };
    bracing: {
      type: 'X-Brace' | 'Diagonal' | 'K-Brace';
      interval_mm: number;
      material: { section: string; weight_kg_per_m: number };
    };
    includeRidgeCap: boolean;
    includeEaveGirt: boolean;
  };
  dpwhItemMappings?: {
    trussSteel?: DPWHItemMapping;
    purlinSteel?: DPWHItemMapping;
    bracingSteel?: DPWHItemMapping;
    sagRods?: DPWHItemMapping;
    boltsAndRods?: DPWHItemMapping;
    steelPlates?: DPWHItemMapping;
    roofingSheets?: DPWHItemMapping;
    ridgeCap?: DPWHItemMapping;
  };
  lastModified?: Date;
}

// ===================================
// SCHEDULE ITEMS (MODE C)
// ===================================

export type ScheduleItemCategory = 
  // Part E - Finishing Works
  | 'termite-control'
  | 'drainage'
  | 'plumbing'
  | 'carpentry'
  | 'hardware'
  | 'doors'
  | 'windows'
  | 'glazing'
  | 'waterproofing'
  | 'cladding'
  | 'insulation'
  | 'acoustical'
  | 'other'
  // Part C - Earthworks
  | 'earthworks-clearing'
  | 'earthworks-removal-trees'
  | 'earthworks-removal-structures'
  | 'earthworks-excavation'
  | 'earthworks-structure-excavation'
  | 'earthworks-embankment'
  | 'earthworks-site-development';

export interface ScheduleItem {
  id: string;
  category: ScheduleItemCategory;
  // Legacy fields kept for compatibility
  itemName?: string;
  dpwhItemNumberRaw: string; // must exist in catalog
  descriptionOverride?: string; // optional custom description
  unit: string; // must match DPWH unit (e.g., "Each", "Lump Sum", "Linear Meter")
  qty: number;
  quantity?: number;
  basisNote: string; // e.g., "per door schedule", "lump sum as per plans"
  tags: string[]; // e.g., ["level:2F", "zone:admin", "type:flush-door"]
  
  // Optional fields for doors & windows (auto-calculate qty = width * height * quantity)
  mark?: string; // D1, D2, W1, W2, etc.
  width_m?: number; // width in meters
  height_m?: number; // height in meters
  location?: string; // placement location or remarks
}

// ===================================
// TAKEOFF & ESTIMATION
// ===================================

export type Trade = 
  | 'Concrete' 
  | 'Rebar' 
  | 'Formwork'
  | 'Earthwork'
  | 'Plumbing'
  | 'Carpentry'
  | 'Hardware'
  | 'Doors & Windows'
  | 'Glass & Glazing'
  | 'Roofing'
  | 'Waterproofing'
  | 'Finishes'
  | 'Painting'
  | 'Masonry'
  | 'Structural Steel'
  | 'Structural'
  | 'Foundation'
  | 'Railing'
  | 'Cladding'
  | 'MEPF'
  | 'Marine Works'
  | 'General Requirements'
  | 'Other';

export interface TakeoffLine {
  id: string;
  sourceElementId: string; // references ElementInstance
  trade: Trade;
  resourceKey: string; // e.g., "concrete-class-a", "rebar-16mm"
  quantity: number;
  unit: string; // e.g., "m³", "kg", "m²"
  formulaText: string; // human-readable formula
  inputsSnapshot: Record<string, number>; // inputs used in calculation
  assumptions: string[]; // e.g., ["Waste: 5%", "Lap: 40Ø"]
  tags: string[]; // e.g., ["level:2F", "grid:A-B", "type:beam"]
  calculatedAt?: Date;
}

// ===================================
// BOQ (Bill of Quantities)
// ===================================

// ===================================
// COSTING TYPES (for DPWH cost estimation)
// ===================================

export interface IComputedLabor {
  designation: string;
  noOfPersons: number;
  noOfHours: number;
  hourlyRate: number;
  amount: number;
}

export interface IComputedEquipment {
  description: string;
  noOfUnits: number;
  noOfHours: number;
  hourlyRate: number;
  amount: number;
}

export interface IComputedMaterial {
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
  amount: number;
  haulingIncluded?: boolean;
  basePrice?: number;
  haulingCost?: number;
}

export interface BOQLine {
  id: string;
  dpwhItemNumberRaw: string; // e.g., "301(1)a", "301(2)b"
  description: string; // DPWH item description
  unit: string;
  quantity: number;
  sourceTakeoffLineIds: string[]; // traceability
  tags: string[];
  
  // COSTING FIELDS (added for integrated cost estimation)
  dupaTemplateId?: string;        // Reference to DUPA template used
  
  // Component costs
  laborCost?: number;
  equipmentCost?: number;
  materialCost?: number;
  directCost?: number;
  
  // Add-ons (DPWH compliant)
  ocmPercentage?: number;         // Overhead, Contingencies & Miscellaneous %
  ocmCost?: number;
  cpPercentage?: number;          // Contractor's Profit %
  cpCost?: number;
  vatPercentage?: number;         // Value Added Tax % (typically 12%)
  vatCost?: number;
  
  // Totals
  subtotalWithMarkup?: number;    // Direct + OCM + CP
  totalUnitCost?: number;         // Subtotal + VAT
  totalAmount?: number;           // totalUnitCost × quantity
  
  // Computed breakdown (for detailed view)
  laborItems?: IComputedLabor[];
  equipmentItems?: IComputedEquipment[];
  materialItems?: IComputedMaterial[];
  
  // Metadata
  location?: string;              // For location-based pricing
  ratesAppliedAt?: Date;          // When rates were applied
  costingEnabled?: boolean;       // Whether costing has been applied
}

// ===================================
// CALCULATION RUN
// ===================================

export type CalcRunStatus = 'running' | 'completed' | 'failed';

export interface CalcRunSummary {
  totalConcrete: number; // m³
  totalRebar: number; // kg
  totalFormwork: number; // m²
  takeoffLineCount: number;
  boqLineCount: number;
}

export interface CalcRun {
  _id?: string;
  runId: string;
  projectId: string;
  timestamp: Date;
  status: CalcRunStatus;
  summary?: CalcRunSummary;
  takeoffLines?: TakeoffLine[];
  boqLines?: BOQLine[];
  validationErrors?: string[]; // Renamed from 'errors' to avoid Mongoose reserved keyword
}

// ===================================
// DPWH CATALOG
// ===================================

export interface DPWHCatalogItem {
  itemNumber: string; // e.g., "900 (1)", "902 (1) a1" - unique identifier from DPWH catalog
  description: string;
  unit: string; // e.g., "Cubic Meter", "Kilogram", "Square Meter"
  category: string; // e.g., "Concrete Works", "Reinforcing Steel", "Formwork"
  trade: Trade; // Concrete, Rebar, or Formwork
  subCategory?: string;
  notes?: string;
  part?: string; // DPWH Part (e.g., "PART A", "PART C", etc.)
  partName?: string; // DPWH Part name (e.g., "General Requirements", "Earthwork")
}

export interface CatalogSearchParams {
  query?: string; // search in item number or description
  trade?: Trade;
  category?: string;
  limit?: number;
}

// ===================================
// MATH LAYER INPUTS/OUTPUTS
// ===================================

export interface ConcreteInput {
  elementType: 'beam' | 'slab' | 'column';
  dimensions: {
    length?: number;
    width?: number;
    height?: number;
    diameter?: number; // for circular columns
  };
  waste: number; // percentage as decimal
}

export interface ConcreteOutput {
  volume: number; // m³
  formulaText: string;
  inputs: Record<string, number>;
}

export interface RebarInput {
  barDiameter: number; // mm
  barLength: number; // m
  barCount: number;
  lapLength?: number; // m
  waste?: number; // percentage as decimal
}

export interface RebarOutput {
  weight: number; // kg
  formulaText: string;
  inputs: Record<string, number>;
}

export interface FormworkInput {
  elementType: 'beam' | 'slab' | 'column';
  dimensions: {
    length?: number;
    width?: number;
    height?: number;
    diameter?: number;
  };
  exposedSides: string[]; // e.g., ["bottom", "left", "right"]
}

export interface FormworkOutput {
  area: number; // m²
  formulaText: string;
  inputs: Record<string, number>;
}
