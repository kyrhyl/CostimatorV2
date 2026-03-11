/**
 * Labor Cost Calculation Module
 * Handles all labor-related cost computations following DPWH standards
 */

export interface ILaborEntry {
  designation: string;
  noOfPersons: number;
  noOfHours: number;
  hourlyRate: number;
  amount: number;
}

/**
 * Compute total labor cost from labor entries
 * 
 * Formula: Σ(noOfPersons × noOfHours × hourlyRate)
 * 
 * @param laborEntries - Array of labor entries
 * @returns Total labor cost
 * 
 * @example
 * const labor = [
 *   { designation: 'Foreman', noOfPersons: 1, noOfHours: 8, hourlyRate: 220.85 }
 * ];
 * const cost = computeLaborCost(labor); // 1766.80
 */
export function computeLaborCost(laborEntries: ILaborEntry[] | any[]): number {
  return laborEntries.reduce((total, entry) => {
    const amount = entry.noOfPersons * entry.noOfHours * entry.hourlyRate;
    return total + amount;
  }, 0);
}

/**
 * Calculate labor cost for a single entry
 * 
 * @param noOfPersons - Number of workers
 * @param noOfHours - Number of hours
 * @param hourlyRate - Rate per hour
 * @returns Labor cost for this entry
 */
export function computeSingleLaborCost(
  noOfPersons: number,
  noOfHours: number,
  hourlyRate: number
): number {
  return noOfPersons * noOfHours * hourlyRate;
}

/**
 * Calculate total labor hours across all entries
 * 
 * @param laborEntries - Array of labor entries
 * @returns Total person-hours
 */
export function computeTotalLaborHours(laborEntries: ILaborEntry[]): number {
  return laborEntries.reduce((total, entry) => {
    return total + (entry.noOfPersons * entry.noOfHours);
  }, 0);
}

/**
 * Get average hourly rate across all labor entries
 * Weighted by person-hours
 * 
 * @param laborEntries - Array of labor entries
 * @returns Weighted average hourly rate
 */
export function getAverageLaborRate(laborEntries: ILaborEntry[]): number {
  const totalCost = computeLaborCost(laborEntries);
  const totalHours = computeTotalLaborHours(laborEntries);
  
  return totalHours > 0 ? totalCost / totalHours : 0;
}
