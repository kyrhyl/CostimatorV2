import type { PowHeader, Signatories } from './program-of-works';

export interface DupaLaborLine {
  designation: string;
  noOfPersons: number;
  noOfHours: number;
  hourlyRate: number;
  amount: number;
}

export interface DupaEquipmentLine {
  equipmentId?: string;
  description: string;
  noOfUnits: number;
  noOfHours: number;
  hourlyRate: number;
  amount: number;
}

export interface DupaMaterialLine {
  materialCode?: string;
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
  amount: number;
}

export interface DupaItemBreakdown {
  payItemNumber: string;
  payItemDescription: string;
  part: string;
  unitOfMeasurement: string;
  outputPerHour: number;
  quantity: number;
  laborItems: DupaLaborLine[];
  equipmentItems: DupaEquipmentLine[];
  materialItems: DupaMaterialLine[];
  totals: {
    laborSubmitted: number;
    equipmentSubmitted: number;
    directCostSubmitted: number;
    outputSubmitted: number;
    directUnitCostSubmitted: number;
    materialsSubmitted: number;
    directUnitPlusMaterialsSubmitted: number;
    ocmPercent: number;
    ocmValue: number;
    cpPercent: number;
    cpValue: number;
    vatPercent: number;
    vatValue: number;
    totalUnitCostSubmitted: number;
  };
}

export interface DupaReportData {
  header: PowHeader;
  signatories: Signatories;
  items: DupaItemBreakdown[];
}
