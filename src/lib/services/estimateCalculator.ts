/**
 * ESTIMATE CALCULATOR SERVICE
 * Processes TakeoffVersion BOQ lines and applies pricing to create estimate lines
 */

import DUPATemplate from '@/models/DUPATemplate';
import Material from '@/models/Material';
import MaterialPrice from '@/models/MaterialPrice';
import Equipment, { IEquipment } from '@/models/Equipment';
import LaborRate, { ILaborRate } from '@/models/LaborRate';
import { computeHaulingCost, HaulingTemplate } from '@/lib/calc/hauling';
import { getDPWHMarkupRates } from '@/lib/utils/dpwhMarkups';
import { normalizePayItemNumber } from '@/lib/costing/utils/normalize-pay-item';
import mongoose from 'mongoose';
import type { IEstimateLine, ILaborRateSnapshot, ICostSummary } from '@/models/CostEstimate';

interface CalculateEstimateOptions {
  takeoffVersionId: string | mongoose.Types.ObjectId;
  location: string;
  district: string;
  cmpdVersion?: string;  // When provided, will lookup MaterialPrice for CMPD or canvass prices
  ocmPercentage?: number;  // Optional - will auto-calculate from project cost if not provided
  cpPercentage?: number;   // Optional - will auto-calculate from project cost if not provided
  vatPercentage?: number;  // Optional - defaults to 12%
  haulingConfig?: any;
  distanceFromOffice?: number;
  haulingCostPerKm?: number;
}

interface EstimateResult {
  estimateLines: IEstimateLine[];
  laborRateSnapshot: ILaborRateSnapshot;
  costSummary: ICostSummary;
  unmappedLines: string[];  // Pay item numbers without DUPA templates
  missingMaterialPrices: { materialCode: string; description: string; unit: string }[];
  usedMarkups: {  // Actual percentages used in calculation
    ocmPercentage: number;
    cpPercentage: number;
    vatPercentage: number;
  };
}

// Labor rate designation mapping
const laborRateMap: Record<string, string> = {
  'Foreman': 'foreman',
  'Leadman': 'leadman',
  'Equipment Operator - Heavy': 'equipmentOperatorHeavy',
  'Equipment Operator - High Skilled': 'equipmentOperatorHighSkilled',
  'Equipment Operator - Light Skilled': 'equipmentOperatorLightSkilled',
  'Driver': 'driver',
  'Skilled Labor': 'laborSkilled',
  'Semi-Skilled Labor': 'laborSemiSkilled',
  'Unskilled Labor': 'laborUnskilled',
};

/**
 * Calculate complete estimate from BOQ lines
 */
export async function calculateEstimate(
  boqLines: any[],
  options: CalculateEstimateOptions
): Promise<EstimateResult> {
  
  // 1. Fetch labor rates for location
  const laborRates = await LaborRate.findOne({ location: options.location })
    .sort({ effectiveDate: -1 })
    .lean() as ILaborRate | null;
  
  if (!laborRates) {
    throw new Error(`No labor rates found for location: ${options.location}`);
  }
  
  // 2. Calculate hauling cost per cubic meter
  let haulingCostPerCuM = 0;
  if (options.haulingConfig) {
    // Use advanced hauling calculation with route segments
    const haulingTemplate: HaulingTemplate = {
      totalDistanceKm: options.haulingConfig.totalDistance || 0,
      freeHaulingDistanceKm: options.haulingConfig.freeHaulingDistance || 0,
      routeSegments: options.haulingConfig.routeSegments || [],
      equipmentHourlyRatePhp: options.haulingConfig.equipmentRentalRate || 1420,
      equipmentCapacityCuM: options.haulingConfig.equipmentCapacity || 10
    };
    const haulingResult = computeHaulingCost(haulingTemplate);
    haulingCostPerCuM = haulingResult.costPerCuMPhp;
  } else if (options.distanceFromOffice && options.haulingCostPerKm) {
    // Fallback: simple distance × cost calculation
    haulingCostPerCuM = options.distanceFromOffice * options.haulingCostPerKm;
  }

  // 3. Preload active DUPA templates and map by normalized pay item number
  const activeTemplates = await DUPATemplate.find({ isActive: true }).lean();
  const templateByNormalized = new Map<string, any>();
  for (const template of activeTemplates) {
    const normalized = template.normalizedPayItemNumber
      || normalizePayItemNumber(template.payItemNumber || '');
    if (normalized && !templateByNormalized.has(normalized)) {
      templateByNormalized.set(normalized, template);
    }
  }

  const lineInputs = boqLines.map((boqLine) => {
    const payItemNumber = String(boqLine.payItemNumber || '');
    const normalizedPayItemNumber = normalizePayItemNumber(payItemNumber);
    const template = normalizedPayItemNumber
      ? templateByNormalized.get(normalizedPayItemNumber)
      : undefined;
    return {
      boqLine,
      payItemNumber,
      template
    };
  });

  // 4. Preload equipment/material data for templates in use
  const equipmentIds = new Set<string>();
  const materialCodes = new Set<string>();

  for (const input of lineInputs) {
    const template = input.template;
    if (!template) continue;

    for (const equip of template.equipmentTemplate || []) {
      if (equip.equipmentId) {
        equipmentIds.add(equip.equipmentId.toString());
      }
    }

    for (const mat of template.materialTemplate || []) {
      if (mat.materialCode) {
        materialCodes.add(mat.materialCode.toString());
      }
    }
  }

  const equipmentMap = new Map<string, IEquipment>();
  if (equipmentIds.size > 0) {
    const equipmentDocs = await Equipment.find({
      _id: { $in: Array.from(equipmentIds) }
    }).lean() as unknown as IEquipment[];
    for (const equipment of equipmentDocs) {
      equipmentMap.set((equipment._id as mongoose.Types.ObjectId).toString(), equipment);
    }
  }

  const materialMap = new Map<string, any>();
  if (materialCodes.size > 0) {
    const materialDocs = await Material.find({
      materialCode: { $in: Array.from(materialCodes) }
    }).lean();
    for (const material of materialDocs) {
      materialMap.set(material.materialCode, material);
    }
  }

  const materialPriceMap = new Map<string, { cmpd?: any; canvass?: any }>();
  if (options.cmpdVersion && options.location && materialCodes.size > 0) {
    const materialPrices = await MaterialPrice.find({
      materialCode: { $in: Array.from(materialCodes) },
      cmpd_version: options.cmpdVersion,
      location: options.location,
      isActive: true
    }).sort({ effectiveDate: -1 }).lean();

    for (const price of materialPrices) {
      const key = `${price.materialCode}|${price.location}|${price.cmpd_version}`;
      const source = price.priceSource || 'cmpd';
      const existing = materialPriceMap.get(key) || {};
      if (source === 'canvass') {
        if (!existing.canvass) {
          existing.canvass = price;
        }
      } else {
        if (!existing.cmpd) {
          existing.cmpd = price;
        }
      }
      materialPriceMap.set(key, existing);
    }
  }

  // 5. Process each BOQ line (first pass - calculate direct costs)
  const estimateLines: IEstimateLine[] = [];
  const unmappedLines: string[] = [];
  const missingMaterialPrices = new Map<string, { materialCode: string; description: string; unit: string }>();
  let totalDirectCost = 0;
  
  for (const input of lineInputs) {
    const { boqLine, payItemNumber, template } = input;
    if (!template) {
      // No DUPA found - create placeholder line
      unmappedLines.push(payItemNumber);
      estimateLines.push({
        payItemNumber: payItemNumber,
        payItemDescription: boqLine.description || 'No DUPA template found',
        unit: boqLine.unit || 'LS',
        quantity: boqLine.quantity || 0,
        part: boqLine.part || '',
        dupaNotFound: true,
        laborCost: 0,
        equipmentCost: 0,
        materialCost: 0,
        minorToolsCost: 0,
        directCost: 0,
        ocmCost: 0,
        cpCost: 0,
        vatCost: 0,
        unitPrice: 0,
        totalAmount: 0,
        laborItems: [],
        equipmentItems: [],
        materialItems: [],
      });
      continue;
    }
   
    // 6. Calculate costs for this line (without markups yet)
    const quantity = typeof boqLine.quantity === 'number' ? boqLine.quantity : 0;
    const computed = await computeLineItemDirectCosts(
      template,
      quantity,
      laborRates,
      haulingCostPerCuM,
      options.cmpdVersion,  // Pass CMPD version for material price lookup
      options.location,     // Pass location for CMPD lookup
      {
        equipmentMap,
        materialMap,
        materialPriceMap
      }
    );

    for (const materialItem of computed.materialItems) {
      if (materialItem.requiresCanvass) {
        const key = `${materialItem.materialCode}|${materialItem.description}|${materialItem.unit}`;
        if (!missingMaterialPrices.has(key)) {
          missingMaterialPrices.set(key, {
            materialCode: materialItem.materialCode,
            description: materialItem.description,
            unit: materialItem.unit
          });
        }
      }
    }

    totalDirectCost += computed.directCost * quantity;
    
    // Store temporarily (will add markups in second pass)
    estimateLines.push({
      payItemNumber: payItemNumber,
      payItemDescription: template.payItemDescription,
      unit: template.unitOfMeasurement,
      quantity,
      part: template.part || boqLine.part || '',
      dupaTemplateId: template._id,
      ...computed,
      // Markups will be calculated after we know total direct cost
      ocmCost: 0,
      cpCost: 0,
      vatCost: 0,
      unitPrice: 0,
      totalAmount: 0,
    });
  }
  
  // 7. Determine markup percentages based on total direct cost
  const markupRates = getDPWHMarkupRates(totalDirectCost);
  const ocmPercent = options.ocmPercentage ?? markupRates.ocm;
  const cpPercent = options.cpPercentage ?? markupRates.cp;
  const vatPercent = options.vatPercentage ?? markupRates.vat;
  
  console.log(`Total Direct Cost: ₱${totalDirectCost.toLocaleString()}`);
  console.log(`Applied Markups: OCM ${ocmPercent}%, CP ${cpPercent}%, VAT ${vatPercent}%`);
  
  // 8. Apply markups to all lines (second pass)
  let totalOCM = 0;
  let totalCP = 0;
  let totalVAT = 0;
  
  for (const line of estimateLines) {
    if (line.dupaNotFound) continue;
    
    // Calculate markups (both OCM and CP on direct cost, NOT cumulative)
    line.ocmCost = line.directCost * (ocmPercent / 100);
    line.cpCost = line.directCost * (cpPercent / 100);
    const subtotal = line.directCost + line.ocmCost + line.cpCost;
    line.vatCost = subtotal * (vatPercent / 100);
    line.unitPrice = subtotal + line.vatCost;
    line.totalAmount = line.unitPrice * line.quantity;
    
    totalOCM += line.ocmCost * line.quantity;
    totalCP += line.cpCost * line.quantity;
    totalVAT += line.vatCost * line.quantity;
  }
  
  // 9. Calculate totals
  const subtotalWithMarkup = totalDirectCost + totalOCM + totalCP;
  const grandTotal = subtotalWithMarkup + totalVAT;
  
  return {
    estimateLines,
    laborRateSnapshot: {
      location: options.location,
      effectiveDate: (laborRates as ILaborRate).effectiveDate,
      rates: {
        foreman: (laborRates as ILaborRate).foreman,
        leadman: (laborRates as ILaborRate).leadman,
        equipmentOperatorHeavy: (laborRates as ILaborRate).equipmentOperatorHeavy,
        equipmentOperatorHighSkilled: (laborRates as ILaborRate).equipmentOperatorHighSkilled,
        equipmentOperatorLightSkilled: (laborRates as ILaborRate).equipmentOperatorLightSkilled,
        driver: (laborRates as ILaborRate).driver,
        laborSkilled: (laborRates as ILaborRate).laborSkilled,
        laborSemiSkilled: (laborRates as ILaborRate).laborSemiSkilled,
        laborUnskilled: (laborRates as ILaborRate).laborUnskilled,
      }
    },
    costSummary: {
      totalDirectCost,
      totalOCM,
      totalCP,
      subtotalWithMarkup,
      totalVAT,
      grandTotal,
      rateItemsCount: estimateLines.length
    },
    missingMaterialPrices: Array.from(missingMaterialPrices.values()),
    usedMarkups: {
      ocmPercentage: ocmPercent,
      cpPercentage: cpPercent,
      vatPercentage: vatPercent
    },
    unmappedLines
  };
}

/**
 * Compute direct costs for a single line item (without markups)
 */
async function computeLineItemDirectCosts(
  dupaTemplate: any,
  _quantity: number,
  laborRates: any,
  haulingCostPerCuM: number,
  cmpdVersion?: string,
  location?: string,
  lookup?: {
    equipmentMap: Map<string, any>;
    materialMap: Map<string, any>;
    materialPriceMap: Map<string, { cmpd?: any; canvass?: any }>;
  }
) {
  const equipmentMap = lookup?.equipmentMap ?? new Map<string, any>();
  const materialMap = lookup?.materialMap ?? new Map<string, any>();
  const materialPriceMap = lookup?.materialPriceMap ?? new Map<string, any>();

  // Compute labor
  let laborCost = 0;
  const laborItems = [];
  for (const labor of dupaTemplate.laborTemplate || []) {
    const rateField = laborRateMap[labor.designation];
    const hourlyRate = laborRates[rateField] || 0;
    const amount = labor.noOfPersons * labor.noOfHours * hourlyRate;
    laborCost += amount;
    laborItems.push({
      designation: labor.designation,
      noOfPersons: labor.noOfPersons,
      noOfHours: labor.noOfHours,
      hourlyRate,
      amount
    });
  }
  
  // Compute equipment
  let equipmentCost = 0;
  const equipmentItems = [];
  for (const equip of dupaTemplate.equipmentTemplate || []) {
    let hourlyRate = 0;
    if (equip.equipmentId) {
      const equipment = equipmentMap.get(equip.equipmentId.toString());
      hourlyRate = equipment?.hourlyRate || 0;
    }
    const amount = equip.noOfUnits * equip.noOfHours * hourlyRate;
    equipmentCost += amount;
    equipmentItems.push({
      equipmentId: equip.equipmentId,
      description: equip.description,
      noOfUnits: equip.noOfUnits,
      noOfHours: equip.noOfHours,
      hourlyRate,
      amount
    });
  }
  
  // Minor tools (configurable per template)
  const includeMinorTools = dupaTemplate.includeMinorTools === true;
  const minorToolsPercentage = typeof dupaTemplate.minorToolsPercentage === 'number'
    ? dupaTemplate.minorToolsPercentage
    : 10;
  const minorToolsCost = includeMinorTools
    ? laborCost * (minorToolsPercentage / 100)
    : 0;
  equipmentCost += minorToolsCost;
  
  // Compute materials
  let materialCost = 0;
  const materialItems = [];
  for (const mat of dupaTemplate.materialTemplate || []) {
    let basePrice = 0;
    let priceSource: 'cmpd' | 'canvass' | 'missing' = 'missing';
    let requiresCanvass = false;
    let hasPrice = false;
    const materialCode = mat.materialCode ? mat.materialCode.toString() : '';
    
    // Try CMPD price lookup first if version is provided
    if (cmpdVersion && location && materialCode) {
      const key = `${materialCode}|${location}|${cmpdVersion}`;
      const priceEntry = materialPriceMap.get(key);
      const cmpdPrice = priceEntry?.cmpd;
      const canvassPrice = priceEntry?.canvass;
      if (cmpdPrice) {
        basePrice = cmpdPrice.unitCost;
        priceSource = 'cmpd';
        hasPrice = true;
      } else if (canvassPrice) {
        basePrice = canvassPrice.unitCost;
        priceSource = 'canvass';
        hasPrice = true;
      }
    }

    if (!hasPrice) {
      basePrice = 0;
      priceSource = 'missing';
      requiresCanvass = true;
    }

    let unitCost = basePrice;
    
    // Add hauling if applicable
    const material = materialMap.get(materialCode);
    const includeHauling = hasPrice && material?.includeHauling !== false && haulingCostPerCuM > 0;
    if (includeHauling) {
      unitCost += haulingCostPerCuM;
    }
    
    const amount = mat.quantity * unitCost;
    materialCost += amount;
    materialItems.push({
      materialCode: mat.materialCode || '',
      description: mat.description,
      unit: mat.unit,
      quantity: mat.quantity,
      basePrice,
      haulingCost: includeHauling ? haulingCostPerCuM : 0,
      unitCost,
      amount,
      priceSource,
      requiresCanvass
    });
  }
  
  // Direct cost
  const directCost = laborCost + equipmentCost + materialCost;
  
  return {
    laborCost,
    equipmentCost,
    materialCost,
    minorToolsCost,
    directCost,
    laborItems,
    equipmentItems,
    materialItems
  };
}
