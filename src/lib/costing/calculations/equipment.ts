/**
 * Equipment Cost Calculation Module
 * Handles all equipment-related cost computations following DPWH standards
 */

export interface IEquipmentEntry {
  description: string;           // Equipment name/description (preferred field name)
  nameAndCapacity?: string;      // Backward compatibility alias (RateItem model uses this)
  noOfUnits: number;
  noOfHours: number;
  hourlyRate: number;
  amount: number;
}

/**
 * Compute total equipment cost from equipment entries
 * 
 * Formula: Σ(noOfUnits × noOfHours × hourlyRate)
 * 
 * Special case: "Minor Tools" is typically 10% of labor cost
 * If description/nameAndCapacity includes "Minor Tools", it should be calculated
 * separately as 10% of labor cost.
 * 
 * @param equipmentEntries - Array of equipment entries
 * @param laborCost - Optional labor cost for minor tools calculation
 * @returns Total equipment cost
 * 
 * @example
 * const equipment = [
 *   { description: 'Backhoe 0.76 cu.m.', noOfUnits: 1, noOfHours: 8, hourlyRate: 500 }
 * ];
 * const cost = computeEquipmentCost(equipment); // 4000
 * 
 * @example
 * // With minor tools
 * const equipmentWithTools = [
 *   { description: 'Minor Tools', noOfUnits: 1, noOfHours: 1, hourlyRate: 0 }
 * ];
 * const cost = computeEquipmentCost(equipmentWithTools, 50000); // 5000 (10% of labor)
 */
export function computeEquipmentCost(
  equipmentEntries: IEquipmentEntry[] | any[],  // Accept any[] for backward compatibility
  laborCost?: number
): number {
  return equipmentEntries.reduce((total, entry) => {
    // Get description field (support both field names for backward compatibility)
    const desc = entry.description || entry.nameAndCapacity || '';
    
    // Check if this is "Minor Tools" entry
    const isMinorTools = desc.toLowerCase().includes('minor tools');
    
    if (isMinorTools && laborCost !== undefined) {
      // Minor Tools = 10% of Labor Cost (DPWH standard)
      return total + (laborCost * 0.10);
    } else {
      // Standard equipment calculation
      const amount = entry.noOfUnits * entry.noOfHours * entry.hourlyRate;
      return total + amount;
    }
  }, 0);
}

/**
 * Calculate equipment cost for a single entry
 * 
 * @param noOfUnits - Number of equipment units
 * @param noOfHours - Number of hours
 * @param hourlyRate - Rate per hour
 * @returns Equipment cost for this entry
 */
export function computeSingleEquipmentCost(
  noOfUnits: number,
  noOfHours: number,
  hourlyRate: number
): number {
  return noOfUnits * noOfHours * hourlyRate;
}

/**
 * Calculate minor tools cost based on labor cost
 * 
 * @param laborCost - Total labor cost
 * @param percentage - Percentage of labor cost (default 10%)
 * @returns Minor tools cost
 */
export function computeMinorToolsCost(
  laborCost: number,
  percentage: number = 10
): number {
  return laborCost * (percentage / 100);
}

/**
 * Calculate total equipment hours across all entries
 * 
 * @param equipmentEntries - Array of equipment entries
 * @returns Total equipment-hours
 */
export function computeTotalEquipmentHours(equipmentEntries: IEquipmentEntry[]): number {
  return equipmentEntries.reduce((total, entry) => {
    // Get description field (support both field names)
    const desc = entry.description || entry.nameAndCapacity || '';
    
    // Skip minor tools entries
    const isMinorTools = desc.toLowerCase().includes('minor tools');
    if (isMinorTools) return total;
    
    return total + (entry.noOfUnits * entry.noOfHours);
  }, 0);
}

/**
 * Check if an equipment entry is for minor tools
 * 
 * @param entry - Equipment entry
 * @returns True if this is a minor tools entry
 */
export function isMinorToolsEntry(entry: IEquipmentEntry): boolean {
  const desc = entry.description || entry.nameAndCapacity || '';
  return desc.toLowerCase().includes('minor tools');
}
