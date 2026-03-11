/**
 * DPWH Indirect Cost Calculation
 * Based on Estimated Direct Cost (EDC)
 *
 * Reference: DPWH Department Order No. 204, Series of 2015
 */

import { getDPWHMarkupRates } from '../../utils/dpwhMarkups';

export interface IndirectCostBreakdown {
  estimatedDirectCost: number;
  ocmPercentage: number;
  ocmAmount: number;
  contractorsProfitPercentage: number;
  contractorsProfitAmount: number;
  totalIndirectCostPercentage: number;
  totalIndirectCost: number;
  totalProjectCost: number;
}

/**
 * Calculate OCM (Overhead, Contingencies, and Miscellaneous) and
 * Contractor's Profit percentages based on EDC bracket
 *
 * Delegates to DPWH markup rates used across the system.
 */
export function getIndirectCostPercentages(estimatedDirectCost: number): {
  ocmPercentage: number;
  contractorsProfitPercentage: number;
  totalIndirectCostPercentage: number;
} {
  const rates = getDPWHMarkupRates(estimatedDirectCost);
  return {
    ocmPercentage: rates.ocm,
    contractorsProfitPercentage: rates.cp,
    totalIndirectCostPercentage: rates.ocm + rates.cp,
  };
}

/**
 * Calculate complete indirect cost breakdown for a project
 * 
 * @param estimatedDirectCost - Total direct cost of all BOQ items
 * @returns Complete breakdown of indirect costs
 */
export function calculateIndirectCosts(estimatedDirectCost: number): IndirectCostBreakdown {
  const percentages = getIndirectCostPercentages(estimatedDirectCost);
  
  const ocmAmount = estimatedDirectCost * (percentages.ocmPercentage / 100);
  const contractorsProfitAmount = estimatedDirectCost * (percentages.contractorsProfitPercentage / 100);
  const totalIndirectCost = ocmAmount + contractorsProfitAmount;
  const totalProjectCost = estimatedDirectCost + totalIndirectCost;

  return {
    estimatedDirectCost: Math.round(estimatedDirectCost * 100) / 100,
    ocmPercentage: percentages.ocmPercentage,
    ocmAmount: Math.round(ocmAmount * 100) / 100,
    contractorsProfitPercentage: percentages.contractorsProfitPercentage,
    contractorsProfitAmount: Math.round(contractorsProfitAmount * 100) / 100,
    totalIndirectCostPercentage: percentages.totalIndirectCostPercentage,
    totalIndirectCost: Math.round(totalIndirectCost * 100) / 100,
    totalProjectCost: Math.round(totalProjectCost * 100) / 100,
  };
}

/**
 * Get EDC bracket description for display
 * 
 * @param estimatedDirectCost - Total direct cost
 * @returns Human-readable bracket description
 */
export function getEDCBracketDescription(estimatedDirectCost: number): string {
  if (estimatedDirectCost <= 1_000_000) {
    return 'Up to ₱1 Million';
  } else if (estimatedDirectCost <= 5_000_000) {
    return '₱1M to ₱5M';
  } else if (estimatedDirectCost <= 15_000_000) {
    return '₱5M to ₱15M';
  } else if (estimatedDirectCost <= 50_000_000) {
    return '₱15M to ₱50M';
  } else {
    return 'Above ₱50M';
  }
}
