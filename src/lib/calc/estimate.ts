import { IRateItem } from '@/models/RateItem';

// Import calculation modules from lib/costing (consolidated)
import { computeLaborCost } from '@/lib/costing/calculations/labor';
import { computeEquipmentCost } from '@/lib/costing/calculations/equipment';
import { computeMaterialCost } from '@/lib/costing/calculations/materials';
import { computeAddOns, type AddOnResult } from '@/lib/costing/calculations/addons';

// =============================================
// Type Definitions
// =============================================

export interface CostBreakdown {
  // Labor costs
  laborSubmitted: number;
  laborEvaluated: number;
  
  // Equipment costs
  equipmentSubmitted: number;
  equipmentEvaluated: number;
  
  // Material costs
  materialSubmitted: number;
  materialEvaluated: number;
  
  // Direct costs (Labor + Equipment + Material)
  directCostSubmitted: number;
  directCostEvaluated: number;
  
  // Add-ons (based on direct cost)
  ocmSubmitted: number;           // Overhead, Contingencies & Miscellaneous
  ocmEvaluated: number;
  cpSubmitted: number;            // Contractor's Profit
  cpEvaluated: number;
  vatSubmitted: number;           // Value Added Tax
  vatEvaluated: number;
  
  // Final totals
  totalSubmitted: number;         // Direct + OCM + CP + VAT (Submitted)
  totalEvaluated: number;         // Direct + OCM + CP + VAT (Evaluated)
}

export interface LineItemEstimate {
  quantity: number;
  unitPrice: number;               // Per unit price (using Submitted or Evaluated)
  totalAmount: number;            // quantity × unitPrice
  breakdown: CostBreakdown;
}

// Re-export AddOnResult for backwards compatibility
export type { AddOnResult };

// Re-export calculation functions for backwards compatibility
export { computeLaborCost, computeEquipmentCost, computeMaterialCost, computeAddOns };

// =============================================
// MAIN PRICING ENGINE
// =============================================

/**
 * Compute complete pricing breakdown for a rate item
 * Returns both Submitted and Evaluated costs
 */
export function computeRateItemCosts(rateItem: IRateItem): CostBreakdown {
  // ========== SUBMITTED COSTS ==========
  
  // Labor - Submitted
  const laborSubmitted = computeLaborCost(rateItem.laborSubmitted);
  
  // Equipment - Submitted (include labor cost for minor tools calculation)
  const equipmentSubmitted = computeEquipmentCost(
    rateItem.equipmentSubmitted,
    laborSubmitted
  );
  
  // Material - Submitted
  const materialSubmitted = computeMaterialCost(rateItem.materialSubmitted);
  
  // Direct Cost - Submitted
  const directCostSubmitted = laborSubmitted + equipmentSubmitted + materialSubmitted;
  
  // Add-ons - Submitted
  const addOnsSubmitted = computeAddOns(
    directCostSubmitted,
    rateItem.addOnPercentages.ocmSubmitted,
    rateItem.addOnPercentages.cpSubmitted,
    rateItem.addOnPercentages.vatSubmitted
  );
  
  // ========== EVALUATED COSTS ==========
  
  // Labor - Evaluated
  const laborEvaluated = computeLaborCost(rateItem.laborEvaluated);
  
  // Equipment - Evaluated
  const equipmentEvaluated = computeEquipmentCost(
    rateItem.equipmentEvaluated,
    laborEvaluated
  );
  
  // Material - Evaluated
  const materialEvaluated = computeMaterialCost(rateItem.materialEvaluated);
  
  // Direct Cost - Evaluated
  const directCostEvaluated = laborEvaluated + equipmentEvaluated + materialEvaluated;
  
  // Add-ons - Evaluated
  const addOnsEvaluated = computeAddOns(
    directCostEvaluated,
    rateItem.addOnPercentages.ocmEvaluated,
    rateItem.addOnPercentages.cpEvaluated,
    rateItem.addOnPercentages.vatEvaluated
  );
  
  // ========== RETURN COMPLETE BREAKDOWN ==========
  
  return {
    laborSubmitted,
    laborEvaluated,
    equipmentSubmitted,
    equipmentEvaluated,
    materialSubmitted,
    materialEvaluated,
    directCostSubmitted,
    directCostEvaluated,
    ocmSubmitted: addOnsSubmitted.ocm,
    ocmEvaluated: addOnsEvaluated.ocm,
    cpSubmitted: addOnsSubmitted.cp,
    cpEvaluated: addOnsEvaluated.cp,
    vatSubmitted: addOnsSubmitted.vat,
    vatEvaluated: addOnsEvaluated.vat,
    totalSubmitted: addOnsSubmitted.total,
    totalEvaluated: addOnsEvaluated.total
  };
}

/**
 * Compute line item estimate for BOQ
 * @param rateItem - The rate item (UPA) to use for pricing
 * @param quantity - Quantity from BOQ
 * @param useEvaluated - Use evaluated costs instead of submitted (default: false)
 */
export function computeLineItemEstimate(
  rateItem: IRateItem,
  quantity: number,
  useEvaluated: boolean = false
): LineItemEstimate {
  const breakdown = computeRateItemCosts(rateItem);
  
  // Select which unit price to use
  const unitPrice = useEvaluated ? breakdown.totalEvaluated : breakdown.totalSubmitted;
  
  // Calculate total amount
  const totalAmount = quantity * unitPrice;
  
  return {
    quantity,
    unitPrice,
    totalAmount,
    breakdown
  };
}

// Re-export utility functions for backwards compatibility
export { formatCurrency } from '../utils/format';
export { roundTo2Decimals, round } from '../utils/rounding';
