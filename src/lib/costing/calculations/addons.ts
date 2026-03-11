/**
 * Add-ons Calculation Module
 * Handles DPWH-compliant add-on calculations (OCM, CP, VAT)
 */

/**
 * Result of add-ons calculation
 */
export interface AddOnResult {
  ocm: number;    // Overhead, Contingencies & Miscellaneous
  cp: number;     // Contractor's Profit
  vat: number;    // Value Added Tax
  total: number;  // Final total including all add-ons
}

/**
 * Compute add-ons based on direct cost and percentages
 * 
 * DPWH Formula (verified against actual DPWH projects):
 * 1. Direct Unit Cost = Labor + Equipment + Material
 * 2. OCM = Direct Cost × OCM%
 * 3. CP = Direct Cost × CP% (applied to direct cost, not cumulative)
 * 4. Subtotal = Direct Cost + OCM + CP
 * 5. VAT = Subtotal × VAT%
 * 6. Total Unit Cost = Subtotal + VAT
 * 
 * Note: Based on DPWH standards, both OCM and CP are calculated on the
 * original direct cost, not sequentially. VAT is then applied to the subtotal.
 * 
 * @param directCost - The direct cost (Labor + Equipment + Material)
 * @param ocmPercent - OCM percentage (typically 15% for evaluated)
 * @param cpPercent - CP percentage (typically 10% for submitted)
 * @param vatPercent - VAT percentage (typically 12%)
 * @returns Add-on amounts and total cost
 * 
 * @example
 * const result = computeAddOns(100000, 15, 10, 12);
 * // {
 * //   ocm: 15000,    // 15% of 100,000
 * //   cp: 10000,     // 10% of 100,000
 * //   vat: 15000,    // 12% of 125,000 (100k + 15k + 10k)
 * //   total: 140000  // 100k + 15k + 10k + 15k
 * // }
 */
export function computeAddOns(
  directCost: number,
  ocmPercent: number,
  cpPercent: number,
  vatPercent: number
): AddOnResult {
  // Step 1: Apply OCM to direct cost
  const ocm = directCost * (ocmPercent / 100);
  
  // Step 2: Apply CP to direct cost (not to subtotal!)
  const cp = directCost * (cpPercent / 100);
  
  // Step 3: Calculate subtotal (Direct + OCM + CP)
  const subtotal = directCost + ocm + cp;
  
  // Step 4: Apply VAT to subtotal
  const vat = subtotal * (vatPercent / 100);
  
  // Step 5: Calculate final total
  const total = subtotal + vat;
  
  return { ocm, cp, vat, total };
}

/**
 * Calculate only OCM (Overhead, Contingencies & Miscellaneous)
 * 
 * @param directCost - Direct cost
 * @param ocmPercent - OCM percentage
 * @returns OCM amount
 */
export function computeOCM(directCost: number, ocmPercent: number): number {
  return directCost * (ocmPercent / 100);
}

/**
 * Calculate only CP (Contractor's Profit)
 * 
 * @param directCost - Direct cost
 * @param cpPercent - CP percentage
 * @returns CP amount
 */
export function computeCP(directCost: number, cpPercent: number): number {
  return directCost * (cpPercent / 100);
}

/**
 * Calculate only VAT (Value Added Tax)
 * 
 * @param subtotal - Subtotal after OCM and CP
 * @param vatPercent - VAT percentage
 * @returns VAT amount
 */
export function computeVAT(subtotal: number, vatPercent: number): number {
  return subtotal * (vatPercent / 100);
}

/**
 * Calculate subtotal (Direct Cost + OCM + CP)
 * 
 * @param directCost - Direct cost
 * @param ocm - OCM amount
 * @param cp - CP amount
 * @returns Subtotal
 */
export function computeSubtotal(
  directCost: number,
  ocm: number,
  cp: number
): number {
  return directCost + ocm + cp;
}

/**
 * Get breakdown percentages relative to final total
 * Useful for reporting and visualization
 * 
 * @param addOnResult - Add-on calculation result
 * @param directCost - Original direct cost
 * @returns Percentage breakdown
 */
export function getAddOnBreakdownPercentages(
  addOnResult: AddOnResult,
  directCost: number
) {
  const total = addOnResult.total;
  
  return {
    directCostPercent: (directCost / total) * 100,
    ocmPercent: (addOnResult.ocm / total) * 100,
    cpPercent: (addOnResult.cp / total) * 100,
    vatPercent: (addOnResult.vat / total) * 100
  };
}

/**
 * Verify add-ons calculation against expected total
 * Useful for testing and validation
 * 
 * @param directCost - Direct cost
 * @param addOnResult - Calculated add-on result
 * @param expectedTotal - Expected total (optional)
 * @param tolerance - Tolerance for floating point comparison (default 0.01)
 * @returns True if calculation is correct
 */
export function verifyAddOnsCalculation(
  directCost: number,
  addOnResult: AddOnResult,
  expectedTotal?: number,
  tolerance: number = 0.01
): boolean {
  const calculatedTotal = directCost + addOnResult.ocm + addOnResult.cp + addOnResult.vat;
  const totalMatches = Math.abs(calculatedTotal - addOnResult.total) < tolerance;
  
  if (expectedTotal !== undefined) {
    const expectedMatches = Math.abs(addOnResult.total - expectedTotal) < tolerance;
    return totalMatches && expectedMatches;
  }
  
  return totalMatches;
}

/**
 * Format add-on result for display
 * 
 * @param addOnResult - Add-on calculation result
 * @returns Formatted object with currency strings
 */
export function formatAddOnResult(addOnResult: AddOnResult) {
  return {
    ocm: `₱${addOnResult.ocm.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    cp: `₱${addOnResult.cp.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    vat: `₱${addOnResult.vat.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    total: `₱${addOnResult.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
  };
}
