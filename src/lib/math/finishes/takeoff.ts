/**
 * FINISHING WORKS - TAKEOFF CALCULATIONS
 * Pure deterministic functions for finish quantity calculation
 * No database access, no side effects
 */

import type { Space, Opening, FinishType, TakeoffLine, SpaceFinishAssignment } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface FloorFinishInput {
  space: Space;
  finishType: FinishType;
  assignment: SpaceFinishAssignment;
}

export interface CeilingFinishInput {
  space: Space;
  finishType: FinishType;
  assignment: SpaceFinishAssignment;
  isOpenToBelow?: boolean;
}

export interface WallFinishInput {
  space: Space;
  finishType: FinishType;
  assignment: SpaceFinishAssignment;
  openings: Opening[];
  storeyHeight_m: number; // from level elevations or default
}

/**
 * Compute floor finish takeoff
 */
export function computeFloorFinishTakeoff(input: FloorFinishInput): TakeoffLine {
  const { space, finishType, assignment } = input;
  
  let qty = space.computed.area_m2;
  
  // Apply waste
  const wastePercent = assignment.overrides?.wastePercent ?? finishType.assumptions?.wastePercent ?? 0;
  if (wastePercent > 0) {
    qty = qty * (1 + wastePercent);
  }
  
  // Apply rounding
  const rounding = finishType.assumptions?.rounding ?? 3;
  qty = Number(qty.toFixed(rounding));
  
  const assumptions: string[] = [];
  if (wastePercent > 0) {
    assumptions.push(`Waste: ${(wastePercent * 100).toFixed(1)}%`);
  }
  
  return {
    id: uuidv4(),
    sourceElementId: space.id,
    trade: 'Finishes',
    resourceKey: `floor-${finishType.id}`,
    quantity: qty,
    unit: finishType.unit,
    formulaText: `Floor finish area = Space.area${wastePercent > 0 ? ' × (1 + waste)' : ''}`,
    inputsSnapshot: {
      area_m2: space.computed.area_m2,
      waste: wastePercent,
    },
    assumptions,
    tags: [
      `level:${space.levelId}`,
      `space:${space.id}`,
      `spaceName:${space.name}`,
      `category:floor`,
      `finish:${finishType.finishName}`,
      `dpwh:${finishType.dpwhItemNumberRaw}`,
    ],
  };
}

/**
 * Compute ceiling finish takeoff
 */
export function computeCeilingFinishTakeoff(input: CeilingFinishInput): TakeoffLine {
  const { space, finishType, assignment, isOpenToBelow } = input;
  
  let qty = isOpenToBelow ? 0 : space.computed.area_m2;
  
  // Apply waste
  const wastePercent = assignment.overrides?.wastePercent ?? finishType.assumptions?.wastePercent ?? 0;
  if (wastePercent > 0 && qty > 0) {
    qty = qty * (1 + wastePercent);
  }
  
  // Apply rounding
  const rounding = finishType.assumptions?.rounding ?? 3;
  qty = Number(qty.toFixed(rounding));
  
  const assumptions: string[] = [];
  if (isOpenToBelow) {
    assumptions.push('Open to below: 0 area');
  }
  if (wastePercent > 0) {
    assumptions.push(`Waste: ${(wastePercent * 100).toFixed(1)}%`);
  }
  
  return {
    id: uuidv4(),
    sourceElementId: space.id,
    trade: 'Finishes',
    resourceKey: `ceiling-${finishType.id}`,
    quantity: qty,
    unit: finishType.unit,
    formulaText: isOpenToBelow 
      ? 'Ceiling finish area = 0 (open to below)'
      : `Ceiling finish area = Space.area${wastePercent > 0 ? ' × (1 + waste)' : ''}`,
    inputsSnapshot: {
      area_m2: space.computed.area_m2,
      waste: wastePercent,
      isOpenToBelow: isOpenToBelow ? 1 : 0,
    },
    assumptions,
    tags: [
      `level:${space.levelId}`,
      `space:${space.id}`,
      `spaceName:${space.name}`,
      `category:ceiling`,
      `finish:${finishType.finishName}`,
      `dpwh:${finishType.dpwhItemNumberRaw}`,
    ],
  };
}

/**
 * Compute wall finish takeoff with opening deductions
 */
export function computeWallFinishTakeoff(input: WallFinishInput): TakeoffLine {
  const { space, finishType, assignment, openings, storeyHeight_m } = input;
  
  // Determine wall height
  let finishHeight_m = storeyHeight_m; // default to full height
  if (finishType.wallHeightRule?.mode === 'fixed' && finishType.wallHeightRule.value_m) {
    finishHeight_m = finishType.wallHeightRule.value_m;
  } else if (assignment.overrides?.height_m) {
    finishHeight_m = assignment.overrides.height_m;
  }
  
  // Gross wall area
  const grossWallArea = space.computed.perimeter_m * finishHeight_m;
  
  // Calculate opening deductions
  let openingDeduction = 0;
  const deductedOpenings: Opening[] = [];
  
  if (finishType.deductionRule?.enabled) {
    const minArea = finishType.deductionRule.minOpeningAreaToDeduct_m2;
    const includeTypes = finishType.deductionRule.includeTypes || [];
    
    for (const opening of openings) {
      // Filter by space (if spaceId is specified) and type
      const matchesSpace = !opening.spaceId || opening.spaceId === space.id;
      const matchesType = includeTypes.length === 0 || includeTypes.includes(opening.type);
      
      if (matchesSpace && matchesType && opening.computed.area_m2 >= minArea) {
        openingDeduction += opening.computed.area_m2;
        deductedOpenings.push(opening);
      }
    }
  }
  
  // Net wall area
  let netWallArea = Math.max(grossWallArea - openingDeduction, 0);
  
  // Apply waste
  const wastePercent = assignment.overrides?.wastePercent ?? finishType.assumptions?.wastePercent ?? 0;
  if (wastePercent > 0) {
    netWallArea = netWallArea * (1 + wastePercent);
  }
  
  // Apply rounding
  const rounding = finishType.assumptions?.rounding ?? 3;
  const qty = Number(netWallArea.toFixed(rounding));
  
  // Build formula text
  const formulaText = `Wall finish = (Perimeter × Height) - Openings${wastePercent > 0 ? ' × (1 + waste)' : ''}\n` +
    `= (${space.computed.perimeter_m.toFixed(3)} × ${finishHeight_m.toFixed(3)}) - ${openingDeduction.toFixed(3)}${wastePercent > 0 ? ` × ${(1 + wastePercent).toFixed(3)}` : ''}\n` +
    `= ${grossWallArea.toFixed(3)} - ${openingDeduction.toFixed(3)} = ${qty.toFixed(3)} ${finishType.unit}`;
  
  // Build assumptions
  const assumptions: string[] = [];
  if (finishType.wallHeightRule?.mode === 'fixed') {
    assumptions.push(`Fixed height: ${finishHeight_m}m`);
  } else {
    assumptions.push(`Storey height: ${storeyHeight_m}m`);
  }
  
  if (finishType.deductionRule?.enabled) {
    assumptions.push(
      `Deduction: min ${finishType.deductionRule.minOpeningAreaToDeduct_m2}m², ` +
      `types: ${finishType.deductionRule.includeTypes.join(', ')}`
    );
    assumptions.push(`Openings deducted: ${deductedOpenings.length} (${openingDeduction.toFixed(3)}m²)`);
  }
  
  if (wastePercent > 0) {
    assumptions.push(`Waste: ${(wastePercent * 100).toFixed(1)}%`);
  }
  
  return {
    id: uuidv4(),
    sourceElementId: space.id,
    trade: 'Finishes',
    resourceKey: `wall-${finishType.id}`,
    quantity: qty,
    unit: finishType.unit,
    formulaText,
    inputsSnapshot: {
      perimeter_m: space.computed.perimeter_m,
      height_m: finishHeight_m,
      grossWallArea,
      openingDeduction,
      netWallArea: grossWallArea - openingDeduction,
      waste: wastePercent,
    },
    assumptions,
    tags: [
      `level:${space.levelId}`,
      `space:${space.id}`,
      `spaceName:${space.name}`,
      `category:wall`,
      `finish:${finishType.finishName}`,
      `dpwh:${finishType.dpwhItemNumberRaw}`,
    ],
  };
}

/**
 * Apply waste and rounding to any quantity
 */
export function applyWasteAndRounding(
  qty: number,
  wastePercent: number = 0,
  rounding: number = 3
): number {
  let result = qty;
  if (wastePercent > 0) {
    result = result * (1 + wastePercent);
  }
  return Number(result.toFixed(rounding));
}
