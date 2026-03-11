/**
 * REBAR CALCULATION LIBRARY
 * Pure functions for reinforcing steel calculations
 * Based on DPWH standards and Philippine construction practices
 */

import type { RebarInput, RebarOutput } from '@/types';

/**
 * Determine rebar grade based on diameter
 * Philippine standards: Grade 40 for 12mm and below, Grade 60 for 16mm and above
 * @param diameter - Bar diameter in mm
 * @returns Grade number (40, 60, or 80)
 */
export function getRebarGrade(diameter: number): number {
  if (diameter <= 12) {
    return 40; // Grade 40 for 10mm and 12mm
  } else if (diameter <= 36) {
    return 60; // Grade 60 for 16mm to 36mm
  } else {
    return 80; // Grade 80 for 40mm and above
  }
}

/**
 * Get DPWH pay item number for rebar based on diameter
 * Automatically classifies based on Philippine standards
 * @param diameter - Bar diameter in mm
 * @param epoxCoated - Whether the rebar is epoxy-coated (default: false)
 * @returns DPWH item number (e.g., "902 (1) a1" for Grade 40)
 */
export function getDPWHRebarItem(diameter: number, epoxCoated: boolean = false): string {
  const grade = getRebarGrade(diameter);
  const prefix = epoxCoated ? '902 (2)' : '902 (1)';
  
  if (grade === 40) {
    return `${prefix} a1`; // Grade 40
  } else if (grade === 60) {
    return `${prefix} a2`; // Grade 60
  } else {
    return `${prefix} a3`; // Grade 80
  }
}

/**
 * Standard rebar weights (kg/m) for deformed bars
 * Based on nominal diameter
 */
export const REBAR_WEIGHT_TABLE: Record<number, number> = {
  10: 0.617,  // 10mm (3/8")
  12: 0.888,  // 12mm (1/2")
  16: 1.578,  // 16mm (5/8")
  20: 2.466,  // 20mm (3/4")
  25: 3.853,  // 25mm (1")
  28: 4.834,  // 28mm
  32: 6.313,  // 32mm (1-1/4")
  36: 7.990,  // 36mm
  40: 9.864,  // 40mm
};

/**
 * Get weight per meter for a given rebar diameter
 */
export function getRebarWeightPerMeter(diameter: number): number {
  const weight = REBAR_WEIGHT_TABLE[diameter];
  if (!weight) {
    throw new Error(`Unknown rebar diameter: ${diameter}mm. Supported: 10, 12, 16, 20, 25, 28, 32, 36, 40`);
  }
  return weight;
}

/**
 * Calculate lap length based on bar diameter
 * Standard: 40 times diameter (40Ø) for normal conditions
 * @param diameter - Bar diameter in mm
 * @param multiplier - Lap length multiplier (default: 40)
 * @returns Lap length in meters
 */
export function calculateLapLength(diameter: number, multiplier: number = 40): number {
  return (diameter * multiplier) / 1000; // Convert mm to m
}

/**
 * Calculate total weight for straight bars with laps
 * @param input - Rebar calculation inputs
 * @returns Weight calculation result
 */
export function calculateBarWeight(input: RebarInput): RebarOutput {
  const { barDiameter, barLength, barCount, lapLength, waste = 0.03 } = input;
  
  // Get weight per meter
  const weightPerMeter = getRebarWeightPerMeter(barDiameter);
  
  // Calculate effective length per bar (including lap if specified)
  const effectiveLengthPerBar = lapLength ? barLength + lapLength : barLength;
  
  // Total weight before waste
  const totalLengthMeters = effectiveLengthPerBar * barCount;
  const weightBeforeWaste = totalLengthMeters * weightPerMeter;
  
  // Apply waste factor
  const totalWeight = weightBeforeWaste * (1 + waste);
  
  // Build formula text
  const lapText = lapLength ? ` + ${(lapLength * 1000).toFixed(0)}mm lap` : '';
  const wasteText = waste > 0 ? ` × (1 + ${(waste * 100).toFixed(0)}% waste)` : '';
  const formulaText = `${barCount} bars × (${barLength.toFixed(2)}m${lapText}) × ${weightPerMeter.toFixed(3)} kg/m${wasteText} = ${totalWeight.toFixed(2)} kg`;
  
  return {
    weight: totalWeight,
    formulaText,
    inputs: {
      barDiameter,
      barLength,
      barCount,
      lapLength: lapLength || 0,
      waste,
      weightPerMeter,
    },
  };
}

/**
 * Calculate number of bars needed based on spacing
 * @param span - Total span in meters
 * @param spacing - Center-to-center spacing in meters
 * @param includeEnd - Include bar at end of span (default: true)
 * @returns Number of bars
 */
export function calculateBarCount(span: number, spacing: number, includeEnd: boolean = true): number {
  if (spacing <= 0) return 0;
  
  const count = Math.floor(span / spacing);
  return includeEnd ? count + 1 : count;
}

/**
 * Calculate weight for slab main reinforcement (bottom bars)
 * Bars running in one direction across the slab
 */
export function calculateSlabMainBars(
  barDiameter: number,
  spacing: number,
  spanLength: number,
  spanCount: number,
  waste: number = 0.03
): RebarOutput {
  // Number of bars = span width / spacing + 1
  const barsPerSpan = calculateBarCount(spanLength, spacing);
  const totalBars = barsPerSpan * spanCount;
  
  // Each bar runs the full perpendicular span
  const barLength = spanLength;
  
  // Calculate standard lap length
  const lapLength = calculateLapLength(barDiameter);
  
  return calculateBarWeight({
    barDiameter,
    barLength,
    barCount: totalBars,
    lapLength,
    waste,
  });
}

/**
 * Calculate weight for beam main reinforcement (longitudinal bars)
 */
export function calculateBeamMainBars(
  barDiameter: number,
  barCount: number,
  beamLength: number,
  waste: number = 0.03
): RebarOutput {
  // Main bars run full length with laps
  const lapLength = calculateLapLength(barDiameter);
  
  return calculateBarWeight({
    barDiameter,
    barLength: beamLength,
    barCount,
    lapLength,
    waste,
  });
}

/**
 * Calculate weight for beam stirrups (lateral ties)
 * @param stirrupDiameter - Stirrup bar diameter in mm
 * @param stirrupSpacing - Center-to-center spacing in meters
 * @param beamLength - Beam length in meters
 * @param beamWidth - Beam width in meters
 * @param beamHeight - Beam height in meters
 * @param waste - Waste factor (default: 0.03)
 */
export function calculateBeamStirrupsWeight(
  stirrupDiameter: number,
  stirrupSpacing: number,
  beamLength: number,
  beamWidth: number,
  beamHeight: number,
  waste: number = 0.03
): RebarOutput {
  // Number of stirrups along the beam
  const stirrupCount = calculateBarCount(beamLength, stirrupSpacing);
  
  // Perimeter of one stirrup (rectangle with hooks)
  // Standard: 2 × (width + height) + hook allowances (typically 150mm total for 2 hooks)
  const perimeterM = 2 * (beamWidth + beamHeight) + 0.15; // 0.15m for hooks
  
  return calculateBarWeight({
    barDiameter: stirrupDiameter,
    barLength: perimeterM,
    barCount: stirrupCount,
    waste,
  });
}

/**
 * Calculate weight for column ties (lateral reinforcement)
 * Similar to beam stirrups but for square/rectangular columns
 */
export function calculateColumnTiesWeight(
  tieDiameter: number,
  tieSpacing: number,
  columnHeight: number,
  columnWidth: number,
  columnDepth: number,
  waste: number = 0.03
): RebarOutput {
  // Number of ties along column height
  const tieCount = calculateBarCount(columnHeight, tieSpacing);
  
  // Perimeter of one tie (rectangle with hooks)
  const perimeterM = 2 * (columnWidth + columnDepth) + 0.15; // 0.15m for hooks
  
  return calculateBarWeight({
    barDiameter: tieDiameter,
    barLength: perimeterM,
    barCount: tieCount,
    waste,
  });
}

/**
 * Calculate weight for column longitudinal bars (main vertical bars)
 */
export function calculateColumnMainBars(
  barDiameter: number,
  barCount: number,
  columnHeight: number,
  waste: number = 0.03
): RebarOutput {
  // Longitudinal bars run full height with dowels/lap
  const lapLength = calculateLapLength(barDiameter);
  
  return calculateBarWeight({
    barDiameter,
    barLength: columnHeight,
    barCount,
    lapLength,
    waste,
  });
}

/**
 * Calculate spacing from number of bars and span
 * Inverse of calculateBarCount
 */
export function calculateSpacing(span: number, barCount: number): number {
  if (barCount <= 1) return span;
  return span / (barCount - 1);
}
