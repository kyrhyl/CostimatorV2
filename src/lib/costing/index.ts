/**
 * Main Costing Engine
 * Orchestrates all cost calculations for BOQ items
 */

import { computeLaborCost, type ILaborEntry } from './calculations/labor';
import { computeEquipmentCost, type IEquipmentEntry } from './calculations/equipment';
import { computeMaterialCost, type IMaterialEntry } from './calculations/materials';
import { computeAddOns, type AddOnResult } from './calculations/addons';
import { 
  calculateIndirectCosts, 
  getIndirectCostPercentages,
  type IndirectCostBreakdown 
} from './utils/indirect-costs';

// Re-export types for convenience
export type { ILaborEntry, IEquipmentEntry, IMaterialEntry, AddOnResult, IndirectCostBreakdown };

// Re-export calculation functions
export { 
  computeLaborCost, 
  computeEquipmentCost, 
  computeMaterialCost, 
  computeAddOns,
  calculateIndirectCosts,
  getIndirectCostPercentages
};

/**
 * Complete cost breakdown for a single BOQ item
 */
export interface BOQItemCostBreakdown {
  // Component costs
  laborCost: number;
  equipmentCost: number;
  materialCost: number;
  directCost: number;
  
  // Add-ons
  ocmPercentage: number;
  ocmCost: number;
  cpPercentage: number;
  cpCost: number;
  vatPercentage: number;
  vatCost: number;
  
  // Totals
  subtotalWithMarkup: number; // Direct + OCM + CP
  totalUnitCost: number;       // Subtotal + VAT
  totalAmount: number;         // totalUnitCost × quantity
  
  // Breakdown arrays
  laborItems: ILaborEntry[];
  equipmentItems: IEquipmentEntry[];
  materialItems: IMaterialEntry[];
}

/**
 * Compute complete cost breakdown for a BOQ item
 * 
 * @param laborItems - Labor entries with rates
 * @param equipmentItems - Equipment entries with rates
 * @param materialItems - Material entries with rates
 * @param quantity - BOQ item quantity
 * @param ocmPercent - OCM percentage (optional, defaults to EDC-based)
 * @param cpPercent - CP percentage (optional, defaults to EDC-based)
 * @param vatPercent - VAT percentage (default 12%)
 * @returns Complete cost breakdown
 */
export function computeBOQItemCost(
  laborItems: ILaborEntry[],
  equipmentItems: IEquipmentEntry[],
  materialItems: IMaterialEntry[],
  quantity: number,
  ocmPercent?: number,
  cpPercent?: number,
  vatPercent: number = 12
): BOQItemCostBreakdown {
  // Step 1: Calculate component costs
  const laborCost = computeLaborCost(laborItems);
  const equipmentCost = computeEquipmentCost(equipmentItems, laborCost);
  const materialCost = computeMaterialCost(materialItems);
  const directCost = laborCost + equipmentCost + materialCost;
  
  // Step 2: Determine OCM/CP percentages
  // If not provided, use EDC-based percentages
  let finalOcmPercent = ocmPercent;
  let finalCpPercent = cpPercent;
  
  if (finalOcmPercent === undefined || finalCpPercent === undefined) {
    const percentages = getIndirectCostPercentages(directCost * quantity);
    finalOcmPercent = finalOcmPercent ?? percentages.ocmPercentage;
    finalCpPercent = finalCpPercent ?? percentages.contractorsProfitPercentage;
  }
  
  // Step 3: Calculate add-ons
  const addOns = computeAddOns(directCost, finalOcmPercent, finalCpPercent, vatPercent);
  
  // Step 4: Calculate totals
  const subtotalWithMarkup = directCost + addOns.ocm + addOns.cp;
  const totalUnitCost = addOns.total;
  const totalAmount = totalUnitCost * quantity;
  
  return {
    laborCost,
    equipmentCost,
    materialCost,
    directCost,
    ocmPercentage: finalOcmPercent,
    ocmCost: addOns.ocm,
    cpPercentage: finalCpPercent,
    cpCost: addOns.cp,
    vatPercentage: vatPercent,
    vatCost: addOns.vat,
    subtotalWithMarkup,
    totalUnitCost,
    totalAmount,
    laborItems,
    equipmentItems,
    materialItems
  };
}

/**
 * Compute project-level cost summary from multiple BOQ items
 * 
 * @param boqItemCosts - Array of BOQ item cost breakdowns
 * @returns Project-level summary with indirect costs
 */
export function computeProjectCostSummary(
  boqItemCosts: BOQItemCostBreakdown[]
): {
  totalLaborCost: number;
  totalEquipmentCost: number;
  totalMaterialCost: number;
  totalDirectCost: number;
  indirectCosts: IndirectCostBreakdown;
  grandTotal: number;
  itemCount: number;
} {
  const getQuantity = (item: BOQItemCostBreakdown) =>
    item.totalUnitCost > 0 ? item.totalAmount / item.totalUnitCost : 0;

  // Sum up all component costs
  const totalLaborCost = boqItemCosts.reduce(
    (sum, item) => sum + (item.laborCost * getQuantity(item)),
    0
  );
  const totalEquipmentCost = boqItemCosts.reduce(
    (sum, item) => sum + (item.equipmentCost * getQuantity(item)),
    0
  );
  const totalMaterialCost = boqItemCosts.reduce(
    (sum, item) => sum + (item.materialCost * getQuantity(item)),
    0
  );
  const totalDirectCost = boqItemCosts.reduce(
    (sum, item) => sum + (item.directCost * getQuantity(item)),
    0
  );
  
  // Calculate project-level indirect costs
  const indirectCosts = calculateIndirectCosts(totalDirectCost);
  
  // Grand total includes VAT
  const grandTotal = indirectCosts.totalProjectCost * 1.12; // Add 12% VAT
  
  return {
    totalLaborCost: Math.round(totalLaborCost * 100) / 100,
    totalEquipmentCost: Math.round(totalEquipmentCost * 100) / 100,
    totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
    totalDirectCost: Math.round(totalDirectCost * 100) / 100,
    indirectCosts,
    grandTotal: Math.round(grandTotal * 100) / 100,
    itemCount: boqItemCosts.length
  };
}
