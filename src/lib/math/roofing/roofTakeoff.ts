/**
 * ROOFING TAKEOFF CALCULATIONS
 * Pure functions for roof covering quantity calculations with full traceability
 * 
 * Architecture: PURE - no side effects, 100% deterministic, fully testable
 * Each function returns TakeoffLine with formula + inputs + assumptions
 */

import { v4 as uuidv4 } from 'uuid';
import type { TakeoffLine, RoofPlane, RoofType } from '@/types';

/**
 * Compute roof covering takeoff quantity
 * 
 * Formula:
 * - If areaBasis = 'slopeArea': qty = slopeArea × (1 + lap% + waste%)
 * - If areaBasis = 'planArea': qty = planArea × (1 + lap% + waste%)
 * 
 * @param roofPlane - Roof plane with computed geometry
 * @param roofType - Roof type template with lap and waste settings
 * @returns TakeoffLine with full traceability
 */
export function computeRoofCoverTakeoff(
  roofPlane: RoofPlane,
  roofType: RoofType
): TakeoffLine {
  const baseArea =
    roofType.areaBasis === 'slopeArea'
      ? roofPlane.computed.slopeArea_m2
      : roofPlane.computed.planArea_m2;

  const adjustmentFactor = 1 + roofType.lapAllowancePercent + roofType.wastePercent;
  const quantity = baseArea * adjustmentFactor;

  // Build formula text
  const formulaText = `${roofType.name}: ${roofType.areaBasis} × (1 + lap + waste) = ${baseArea.toFixed(2)} × ${adjustmentFactor.toFixed(3)} = ${quantity.toFixed(2)} ${roofType.unit}`;

  // Snapshot inputs
  const inputsSnapshot: Record<string, number> = {
    planArea_m2: roofPlane.computed.planArea_m2,
    slopeFactor: roofPlane.computed.slopeFactor,
    slopeArea_m2: roofPlane.computed.slopeArea_m2,
    lapPercent: roofType.lapAllowancePercent,
    wastePercent: roofType.wastePercent,
  };

  // Build assumptions
  const assumptions: string[] = [
    `Area basis: ${roofType.areaBasis}`,
    `Slope: ${roofPlane.slope.mode === 'ratio' ? `${roofPlane.slope.value} rise/run` : `${roofPlane.slope.value}°`}`,
    `Lap allowance: ${(roofType.lapAllowancePercent * 100).toFixed(1)}%`,
    `Waste: ${(roofType.wastePercent * 100).toFixed(1)}%`,
  ];

  if (roofType.assumptions?.accessoriesBundled) {
    assumptions.push('Accessories bundled (ridges, valleys, etc.)');
  }
  if (roofType.assumptions?.fastenersIncluded) {
    assumptions.push('Fasteners included');
  }
  if (roofType.assumptions?.notes) {
    assumptions.push(roofType.assumptions.notes);
  }

  return {
    id: uuidv4(),
    sourceElementId: roofPlane.id,
    trade: 'Roofing',
    resourceKey: `roof-${roofType.id}`,
    quantity,
    unit: roofType.unit,
    formulaText,
    inputsSnapshot,
    assumptions,
    tags: [
      `roofPlane:${roofPlane.name}`,
      `roofType:${roofType.name}`,
      `level:${roofPlane.levelId}`,
      `dpwh:${roofType.dpwhItemNumberRaw}`,
      ...roofPlane.tags,
    ],
  };
}

/**
 * Apply rounding to quantity (helper function)
 */
export function applyRoofRounding(quantity: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(quantity * factor) / factor;
}
