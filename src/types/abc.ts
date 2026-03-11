import type { PowHeader, Signatories } from './program-of-works';

export interface AbcLineItem {
  payItemNumber: string;
  payItemDescription: string;
  quantity: number;
  unitOfMeasurement: string;
  directCost: number;
  markupPercent: number;
  markupValue: number;
  vat: number;
  totalIndirectCost: number;
  totalCost: number;
  unitCost: number;
}

export interface AbcPart {
  part: string;
  partDescription: string;
  division: string;
  items: AbcLineItem[];
  totals: {
    directCost: number;
    markupValue: number;
    vat: number;
    totalIndirectCost: number;
    totalCost: number;
  };
}

export interface AbcDivisionTotal {
  division: string;
  directCost: number;
  markupValue: number;
  vat: number;
  totalIndirectCost: number;
  totalCost: number;
}

export interface AbcTotals {
  directCost: number;
  markupValue: number;
  vat: number;
  totalIndirectCost: number;
  totalCost: number;
}

export interface AbcReportData {
  header: PowHeader;
  parts: AbcPart[];
  divisionTotals: AbcDivisionTotal[];
  totals: AbcTotals;
  signatories: Signatories;
}
