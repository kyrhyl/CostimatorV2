/**
 * Shared types for Program of Works (POW) components
 * Used across DPWH Forms 13-10, 13-11, and 13-13
 */

// ============================================================================
// Signatory Types
// ============================================================================

export interface Signatory {
  name: string;
  position: string;
  section: string;
}

// ============================================================================
// Form 13-10 (Program of Works) Types
// ============================================================================

export interface WorksItemLine {
  payItemNumber: string;
  payItemDescription: string;
  quantity: number;
  unitOfMeasurement: string;
  directCost: number;
  totalAmount: number;
  ocmCost: number;
  vatCost: number;
  laborItems?: Array<{ amount: number }>;
  equipmentItems?: Array<{ amount: number }>;
  materialItems?: Array<{ amount: number }>;
  part?: string;
  partDescription?: string;
}

export interface WorksPart {
  part: string;
  partDescription: string;
  division: string;
  items: WorksItemLine[];
  asSubmitted: number;
  percent: number;
}

// ============================================================================
// Form 13-11 (Itemized Breakdown) Types
// ============================================================================

export interface ItemizedLineItem {
  payItemNumber: string;
  payItemDescription: string;
  quantity: number;
  quantityEvaluated: number;
  unitOfMeasurement: string;
  directCostTotal: number;
  directCostTotalEvaluated: number;
  directCostUnit: number;
  directCostUnitEvaluated: number;
  totalUnitCost: number;
  totalUnitCostEvaluated: number;
  percentDirectCost: number;
  subGroup?: string;
}

export interface ItemizedPart {
  part: string;
  partDescription: string;
  division: string;
  items: ItemizedLineItem[];
  partTotal: number;
  partPercent: number;
}

// ============================================================================
// Form 13-13 (Detailed Breakdown) Types
// ============================================================================

export interface ComponentBreakdownItemSubmitted {
  percent: number;
  quantity: number;
  unit: string;
  material: number;
  labor: number;
  equipment: number;
  totalDirectCost: number;
  markupPercent: number;
  markupValue: number;
  vat: number;
  totalCost: number;
}

export interface ComponentBreakdownItem {
  itemNumber: string;
  description: string;
  asSubmitted: ComponentBreakdownItemSubmitted;
  subGroup?: string;
}

export interface ComponentBreakdownTotals {
  material: number;
  labor: number;
  equipment: number;
  totalDirectCost: number;
  markupValue: number;
  vat: number;
  totalCost: number;
}

export interface ComponentBreakdownPart {
  part: string;
  partDescription: string;
  division: string;
  items: ComponentBreakdownItem[];
  totals: ComponentBreakdownTotals;
}

// ============================================================================
// Header & Metadata Types
// ============================================================================

export interface PowHeader {
  implementingOffice: string;
  address: string;
  projectName: string;
  projectLocation: string;
  datePrepared: string;
  targetStartDate: string;
  targetCompletionDate: string;
  contractDurationCD: number;
  workingDays: number;
  unworkableDays: {
    sundays: number;
    holidays: number;
    rainyDays: number;
  };
  totalProjectCost: number;
}

export interface ProjectComponent {
  componentId: string;
  infraId: string;
  stationLimits: { start: string; end: string };
  chainage: { start: string; end: string };
  coordinates: { latitude: number; longitude: number };
}

export interface FundingSource {
  source: string;
  projectId: string;
  fundingAgreement: string;
  fundingOrganization: string;
  fiscalYear: string;
  targetAmount: number;
  unitOfMeasure: string;
}

export interface PhysicalTarget {
  infraType: string;
  projectComponentId: string;
  targetAmount: number;
  unitOfMeasure: string;
}

export interface ExpenditureBreakdown {
  labor: number;
  materials: number;
  equipment: number;
  directCost: number;
  ocm: number;
  vat: number;
  totalEstimatedCost: number;
  eao: number;
  eaoPercentage: number;
}

export interface Signatories {
  preparedBy: Signatory;
  checkedBy: Signatory;
  recommendingApproval: Signatory;
  approvedBy: Signatory;
}

// ============================================================================
// Main Report Data Type
// ============================================================================

export interface PowReportData {
  header: PowHeader;
  projectComponent: ProjectComponent;
  fundingSource: FundingSource;
  physicalTarget: PhysicalTarget;
  allottedAmount: number;
  estimatedComponentCost: number;
  worksItems: WorksPart[];
  itemizedParts: ItemizedPart[];
  componentBreakdown: ComponentBreakdownPart[];
  breakdown: ExpenditureBreakdown;
  signatories: Signatories;
}
