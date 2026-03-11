/**
 * DPWH Markup Calculation Based on Project Cost
 * 
 * OCM (Overhead, Contingencies & Miscellaneous) and CP (Contractor's Profit)
 * percentages vary based on estimated project cost brackets.
 * 
 * Reference: DPWH Department Order No. 204, Series of 2015
 */

export interface MarkupRates {
  ocm: number;
  cp: number;
  vat: number; // Always 12% as per Philippine tax law
}

/**
 * Get DPWH markup percentages based on estimated project cost
 * 
 * Cost Brackets (in Philippine Pesos):
 * - Up to ₱1M: OCM 15%, CP 10%
 * - ₱1M to ₱5M: OCM 12%, CP 8%
 * - ₱5M to ₱15M: OCM 10%, CP 7%
 * - ₱15M to ₱50M: OCM 8%, CP 6%
 * - Above ₱50M: OCM 5%, CP 5%
 * 
 * @param estimatedCost - Estimated direct cost of the project
 * @returns Markup percentages (OCM, CP, VAT)
 */
export function getDPWHMarkupRates(estimatedCost: number): MarkupRates {
  const ONE_MILLION = 1_000_000;
  const FIVE_MILLION = 5_000_000;
  const FIFTEEN_MILLION = 15_000_000;
  const FIFTY_MILLION = 50_000_000;

  let ocm: number;
  let cp: number;

  if (estimatedCost <= ONE_MILLION) {
    ocm = 15;
    cp = 10;
  } else if (estimatedCost <= FIVE_MILLION) {
    ocm = 12;
    cp = 8;
  } else if (estimatedCost <= FIFTEEN_MILLION) {
    ocm = 10;
    cp = 7;
  } else if (estimatedCost <= FIFTY_MILLION) {
    ocm = 8;
    cp = 6;
  } else {
    ocm = 5;
    cp = 5;
  }

  return {
    ocm,
    cp,
    vat: 12 // VAT is always 12% in the Philippines
  };
}

/**
 * Get cost bracket description for display
 */
export function getCostBracketDescription(estimatedCost: number): string {
  const ONE_MILLION = 1_000_000;
  const FIVE_MILLION = 5_000_000;
  const FIFTEEN_MILLION = 15_000_000;
  const FIFTY_MILLION = 50_000_000;

  if (estimatedCost <= ONE_MILLION) {
    return 'Up to ₱1M';
  } else if (estimatedCost <= FIVE_MILLION) {
    return '₱1M - ₱5M';
  } else if (estimatedCost <= FIFTEEN_MILLION) {
    return '₱5M - ₱15M';
  } else if (estimatedCost <= FIFTY_MILLION) {
    return '₱15M - ₱50M';
  } else {
    return 'Above ₱50M';
  }
}

/**
 * All cost brackets for reference
 */
export const COST_BRACKETS = [
  { min: 0, max: 1_000_000, ocm: 15, cp: 10, label: 'Up to ₱1M' },
  { min: 1_000_000, max: 5_000_000, ocm: 12, cp: 8, label: '₱1M - ₱5M' },
  { min: 5_000_000, max: 15_000_000, ocm: 10, cp: 7, label: '₱5M - ₱15M' },
  { min: 15_000_000, max: 50_000_000, ocm: 8, cp: 6, label: '₱15M - ₱50M' },
  { min: 50_000_000, max: Infinity, ocm: 5, cp: 5, label: 'Above ₱50M' },
];
