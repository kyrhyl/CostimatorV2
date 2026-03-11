/**
 * Rate Matching Service
 * Server-side only - uses Mongoose models
 * Use via API routes: /api/rates/match
 */

'use server';

import DUPATemplate, { type IDUPATemplate } from '@/models/DUPATemplate';
import LaborRate, { type ILaborRate } from '@/models/LaborRate';
import MaterialPrice, { type IMaterialPrice } from '@/models/MaterialPrice';
import Equipment, { type IEquipment } from '@/models/Equipment';
import { normalizePayItemNumber } from '../utils/normalize-pay-item';

export interface RateMatchingResult {
  dupaTemplate: IDUPATemplate | null;
  laborRates: ILaborRate | null;
  materialPrices: Map<string, IMaterialPrice>;
  equipmentRates: Map<string, IEquipment>;
  matchStatus: 'exact' | 'normalized' | 'not-found';
  message?: string;
}

/**
 * Find DUPA template for a pay item number
 */
export async function findDUPATemplate(payItemNumber: string): Promise<{
  template: IDUPATemplate | null;
  matchStatus: 'exact' | 'normalized' | 'not-found';
}> {
  // Try exact match first
  const template = await DUPATemplate.findOne({ 
    payItemNumber, 
    isActive: true 
  });
  
  if (template) {
    return { template, matchStatus: 'exact' };
  }
  
  // Try normalized match
  const normalized = normalizePayItemNumber(payItemNumber);
  const allTemplates = await DUPATemplate.find({ isActive: true });
  
  for (const tmpl of allTemplates) {
    if (normalizePayItemNumber(tmpl.payItemNumber) === normalized) {
      return { template: tmpl, matchStatus: 'normalized' };
    }
  }
  
  return { template: null, matchStatus: 'not-found' };
}

/**
 * Get labor rates for a location
 */
export async function getLaborRates(location: string): Promise<ILaborRate | null> {
  // Find most recent labor rates for location
  const rates = await LaborRate.findOne({ location })
    .sort({ effectiveDate: -1 });
  
  if (!rates) {
    // Try to find default rates (any location)
    return await LaborRate.findOne().sort({ effectiveDate: -1 });
  }
  
  return rates;
}

/**
 * Get material prices for multiple material codes at a location
 */
export async function getMaterialPrices(
  materialCodes: string[],
  location: string
): Promise<Map<string, IMaterialPrice>> {
  const prices = new Map<string, IMaterialPrice>();
  
  // Find all materials for this location
  const materials = await MaterialPrice.find({
    materialCode: { $in: materialCodes },
    location
  }).sort({ effectiveDate: -1 });
  
  // Map by material code
  materials.forEach(material => {
    if (!prices.has(material.materialCode)) {
      prices.set(material.materialCode, material);
    }
  });
  
  // For missing materials, try to find from any location
  const missingCodes = materialCodes.filter(code => !prices.has(code));
  if (missingCodes.length > 0) {
    const fallbackMaterials = await MaterialPrice.find({
      materialCode: { $in: missingCodes }
    }).sort({ effectiveDate: -1 });
    
    fallbackMaterials.forEach(material => {
      if (!prices.has(material.materialCode)) {
        prices.set(material.materialCode, material);
      }
    });
  }
  
  return prices;
}

/**
 * Get equipment rates for multiple equipment IDs
 */
export async function getEquipmentRates(
  equipmentIds: string[]
): Promise<Map<string, IEquipment>> {
  const rates = new Map<string, IEquipment>();
  
  const equipment = await Equipment.find({
    _id: { $in: equipmentIds }
  });
  
  equipment.forEach(equip => {
    rates.set(equip._id.toString(), equip);
  });
  
  return rates;
}

/**
 * Match BOQ item with DUPA template and retrieve all rates
 */
export async function matchBOQItemWithRates(
  payItemNumber: string,
  location: string
): Promise<RateMatchingResult> {
  // Find DUPA template
  const { template, matchStatus } = await findDUPATemplate(payItemNumber);
  
  if (!template) {
    return {
      dupaTemplate: null,
      laborRates: null,
      materialPrices: new Map(),
      equipmentRates: new Map(),
      matchStatus: 'not-found',
      message: `No DUPA template found for pay item: ${payItemNumber}`
    };
  }
  
  // Get labor rates for location
  const laborRates = await getLaborRates(location);
  
  // Get material codes from template
  const materialCodes = template.materialTemplate
    .map(m => m.materialCode)
    .filter(Boolean) as string[];
  
  // Get material prices
  const materialPrices = await getMaterialPrices(materialCodes, location);
  
  // Get equipment IDs from template
  const equipmentIds = template.equipmentTemplate
    .map(e => e.equipmentId?.toString())
    .filter(Boolean) as string[];
  
  // Get equipment rates
  const equipmentRates = await getEquipmentRates(equipmentIds);
  
  return {
    dupaTemplate: template,
    laborRates,
    materialPrices,
    equipmentRates,
    matchStatus,
    message: matchStatus === 'normalized' 
      ? `Pay item matched using normalized comparison`
      : undefined
  };
}

/**
 * Get labor rate by designation
 */
export function getLaborRateByDesignation(
  laborRates: ILaborRate | null,
  designation: string
): number {
  if (!laborRates) return 0;
  
  const normalizedDesignation = designation.toLowerCase().replace(/[^a-z]/g, '');
  
  // Map common designations to labor rate fields
  const mapping: Record<string, keyof ILaborRate> = {
    'foreman': 'foreman',
    'leadman': 'leadman',
    'equipmentoperatorheavy': 'equipmentOperatorHeavy',
    'equipmentoperatorhighskilled': 'equipmentOperatorHighSkilled',
    'equipmentoperatorlightskilled': 'equipmentOperatorLightSkilled',
    'driver': 'driver',
    'skilled': 'laborSkilled',
    'semiskilled': 'laborSemiSkilled',
    'unskilled': 'laborUnskilled'
  };
  
  const field = mapping[normalizedDesignation];
  if (field && typeof laborRates[field] === 'number') {
    return laborRates[field] as number;
  }
  
  // Default to unskilled labor rate
  return laborRates.laborUnskilled || 0;
}


