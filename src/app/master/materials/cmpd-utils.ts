export const MISSING_TOKEN = '__missing__';

export interface MaterialPrice {
  _id: string;
  materialCode: string;
  description: string;
  unit: string;
  location: string;
  district?: string;
  unitCost: number;
  priceSource?: 'cmpd' | 'canvass';
  brand?: string;
  specification?: string;
  supplier?: string;
  effectiveDate: string;
  cmpd_version?: string;
  isActive?: boolean;
  importBatch?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  _id: string;
  materialCode: string;
  works: string;
  materialDescription: string;
  unit: string;
  category?: string;
  includeHauling: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MissingCoverageMaterial {
  materialCode: string;
  description: string;
  unit: string;
  category: string;
}

export interface CoverageData {
  district: string;
  cmpd_version: string;
  location?: string;
  totalMaterials: number;
  cmpdCount: number;
  canvassOnlyCount: number;
  missingCount: number;
  coveragePercent: number;
  missingMaterials: MissingCoverageMaterial[];
}

export const getTodayIso = () => new Date().toISOString().split('T')[0];

export const createInitialEditForm = () => ({
  materialCode: '',
  description: '',
  unit: '',
  location: '',
  district: '',
  cmpd_version: '',
  unitCost: 0,
  priceSource: 'cmpd' as 'cmpd' | 'canvass',
  brand: '',
  specification: '',
  supplier: '',
  effectiveDate: getTodayIso(),
  isActive: true,
});

export const createInitialImportData = () => ({
  file: null as File | null,
  district: '',
  cmpd_version: '',
  location: '',
  effectiveDate: getTodayIso(),
  deactivateOldPrices: false,
  validateMaterialCodes: true,
});

export const createInitialCanvassForm = () => ({
  materialCode: '',
  description: '',
  unit: '',
  unitCost: 0,
  location: '',
  district: '',
  cmpd_version: '',
  effectiveDate: getTodayIso(),
  brand: '',
  specification: '',
  supplier: '',
});

export const createInitialBaseMaterialForm = () => ({
  materialCode: '',
  works: '',
  materialDescription: '',
  unit: '',
  category: '',
  includeHauling: false,
  isActive: true,
});
