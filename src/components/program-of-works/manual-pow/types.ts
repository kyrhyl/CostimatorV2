export interface ProjectBoqItem {
  _id: string;
  projectId: string;
  templateId: string;
  payItemNumber: string;
  payItemDescription: string;
  unitOfMeasurement: string;
  quantity: number;
  part?: string;
  category?: string;
  unitCost?: number;
  totalAmount?: number;
  directCost?: number;
  ocmPercentage?: number;
  ocmCost?: number;
  cpPercentage?: number;
  cpCost?: number;
  subtotalWithMarkup?: number;
  vatPercentage?: number;
  vatCost?: number;
  totalCost?: number;
  laborItems?: Array<{ designation?: string; noOfPersons?: number; noOfHours?: number; hourlyRate?: number; amount?: number }>;
  equipmentItems?: Array<{ description?: string; noOfUnits?: number; noOfHours?: number; hourlyRate?: number; amount?: number }>;
  materialItems?: Array<{ description?: string; unit?: string; quantity?: number; unitCost?: number; amount?: number }>;
}

export interface ManualPowConfigForm {
  laborLocation: string;
  district: string;
  cmpdVersion: string;
  laborVersion: string;
  vatPercentage: number;
  notes: string;
}

export interface TemplateSummary {
  _id: string;
  payItemNumber: string;
  payItemDescription: string;
  unitOfMeasurement: string;
  part?: string;
  category?: string;
  isPinnedCommon?: boolean;
}

export interface StagedTemplate extends TemplateSummary {
  quantity: number;
}

export interface SaveVersionForm {
  name: string;
  description: string;
}
