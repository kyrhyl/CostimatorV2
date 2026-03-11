/**
 * Parametric Roof Generation
 * Automatically generates roof planes from simple parameters
 */

export type RoofStyle = 'gable' | 'hip' | 'flat' | 'gambrel' | 'custom';
export type PitchFormat = 'ratio' | 'degrees' | 'rise-run';

export interface RoofParameters {
  style: RoofStyle;
  
  // Building dimensions
  length_m: number;  // Building length
  width_m: number;   // Building width
  
  // Pitch (choose one format)
  pitchFormat: PitchFormat;
  pitchRatio?: number;      // e.g., 0.25 for 1:4 (25% slope)
  pitchDegrees?: number;    // e.g., 14 degrees
  pitchRise?: number;       // e.g., 4 (for 4:12)
  pitchRun?: number;        // e.g., 12 (for 4:12)
  
  // Optional
  overhang_m?: number;      // Eave overhang
  ridgeOffset_m?: number;   // For asymmetric roofs
  
  // For custom/complex roofs
  customParams?: Record<string, number>;
}

export interface GeneratedRoofPlane {
  name: string;
  area_m2: number;
  slopeAngle_deg: number;
  slopeFactor: number;
  
  // Geometry (simplified for takeoff)
  planArea_m2: number;
  ridgeLength_m?: number;
  eaveLength_m?: number;
  hipLength_m?: number;
  valleyLength_m?: number;
}

export interface ParametricRoofResult {
  style: RoofStyle;
  planes: GeneratedRoofPlane[];
  summary: {
    totalPlanArea_m2: number;
    totalSlopeArea_m2: number;
    ridgeLength_m: number;
    hipLength_m: number;
    valleyLength_m: number;
    eaveLength_m: number;
  };
  metadata: {
    length_m: number;
    width_m: number;
    pitch: string;
    overhang_m: number;
  };
}

/**
 * Convert different pitch formats to slope factor
 */
export function calculateSlopeFactor(params: RoofParameters): number {
  let angleRad: number;
  
  if (params.pitchFormat === 'degrees' && params.pitchDegrees !== undefined) {
    angleRad = (params.pitchDegrees * Math.PI) / 180;
  } else if (params.pitchFormat === 'rise-run' && params.pitchRise && params.pitchRun) {
    angleRad = Math.atan(params.pitchRise / params.pitchRun);
  } else if (params.pitchFormat === 'ratio' && params.pitchRatio !== undefined) {
    angleRad = Math.atan(params.pitchRatio);
  } else {
    throw new Error('Invalid pitch parameters');
  }
  
  // Slope factor = 1 / cos(angle)
  return 1 / Math.cos(angleRad);
}

export function getPitchString(params: RoofParameters): string {
  if (params.pitchFormat === 'degrees' && params.pitchDegrees !== undefined) {
    return `${params.pitchDegrees.toFixed(1)}°`;
  } else if (params.pitchFormat === 'rise-run' && params.pitchRise && params.pitchRun) {
    return `${params.pitchRise}:${params.pitchRun}`;
  } else if (params.pitchFormat === 'ratio' && params.pitchRatio !== undefined) {
    return `${(params.pitchRatio * 100).toFixed(1)}%`;
  }
  return 'Unknown';
}

/**
 * Generate Gable Roof (2 planes)
 */
function generateGableRoof(params: RoofParameters): GeneratedRoofPlane[] {
  const L = params.length_m;
  const W = params.width_m;
  const overhang = params.overhang_m || 0;
  
  const slopeFactor = calculateSlopeFactor(params);
  const angleRad = Math.acos(1 / slopeFactor);
  const angleDeg = (angleRad * 180) / Math.PI;
  
  // Each side covers half the width
  const planArea = (L + 2 * overhang) * (W / 2);
  const slopeArea = planArea * slopeFactor;
  
  return [
    {
      name: 'North Slope',
      planArea_m2: planArea,
      area_m2: slopeArea,
      slopeAngle_deg: angleDeg,
      slopeFactor,
      ridgeLength_m: L + 2 * overhang,
      eaveLength_m: L + 2 * overhang,
    },
    {
      name: 'South Slope',
      planArea_m2: planArea,
      area_m2: slopeArea,
      slopeAngle_deg: angleDeg,
      slopeFactor,
      ridgeLength_m: L + 2 * overhang,
      eaveLength_m: L + 2 * overhang,
    },
  ];
}

/**
 * Generate Hip Roof (4 planes)
 */
function generateHipRoof(params: RoofParameters): GeneratedRoofPlane[] {
  const L = params.length_m;
  const W = params.width_m;
  const overhang = params.overhang_m || 0;
  
  const slopeFactor = calculateSlopeFactor(params);
  const angleRad = Math.acos(1 / slopeFactor);
  const angleDeg = (angleRad * 180) / Math.PI;
  
  // Hip roof has 2 trapezoidal sides and 2 triangular ends
  const ridgeLength = L - W; // Ridge runs along length minus width
  
  // Trapezoidal sides (main slopes)
  const trapArea = ((L + 2 * overhang) * (W / 2));
  const trapSlopeArea = trapArea * slopeFactor;
  
  // Triangular ends
  const triArea = (W + 2 * overhang) * (W / 2) / 2;
  const triSlopeArea = triArea * slopeFactor;
  
  // Hip length (diagonal)
  const hipLength = Math.sqrt((W / 2) ** 2 + (W / 2) ** 2) * slopeFactor;
  
  return [
    {
      name: 'North Slope',
      planArea_m2: trapArea,
      area_m2: trapSlopeArea,
      slopeAngle_deg: angleDeg,
      slopeFactor,
      ridgeLength_m: ridgeLength,
      eaveLength_m: L + 2 * overhang,
    },
    {
      name: 'South Slope',
      planArea_m2: trapArea,
      area_m2: trapSlopeArea,
      slopeAngle_deg: angleDeg,
      slopeFactor,
      ridgeLength_m: ridgeLength,
      eaveLength_m: L + 2 * overhang,
    },
    {
      name: 'East Hip',
      planArea_m2: triArea,
      area_m2: triSlopeArea,
      slopeAngle_deg: angleDeg,
      slopeFactor,
      hipLength_m: hipLength,
      eaveLength_m: W + 2 * overhang,
    },
    {
      name: 'West Hip',
      planArea_m2: triArea,
      area_m2: triSlopeArea,
      slopeAngle_deg: angleDeg,
      slopeFactor,
      hipLength_m: hipLength,
      eaveLength_m: W + 2 * overhang,
    },
  ];
}

/**
 * Generate Flat Roof (1 plane)
 */
function generateFlatRoof(params: RoofParameters): GeneratedRoofPlane[] {
  const L = params.length_m;
  const W = params.width_m;
  const overhang = params.overhang_m || 0;
  
  const area = (L + 2 * overhang) * (W + 2 * overhang);
  
  return [
    {
      name: 'Flat Roof',
      planArea_m2: area,
      area_m2: area * 1.01, // Slight slope for drainage
      slopeAngle_deg: 0.5,
      slopeFactor: 1.01,
      eaveLength_m: 2 * (L + W) + 8 * overhang,
    },
  ];
}

/**
 * Generate Gambrel Roof (4 planes - 2 upper, 2 lower)
 */
function generateGambrelRoof(params: RoofParameters): GeneratedRoofPlane[] {
  const L = params.length_m;
  const W = params.width_m;
  const overhang = params.overhang_m || 0;
  
  // Gambrel has two different pitches
  // Upper: steeper (params pitch)
  // Lower: shallower (half the pitch)
  
  const upperSlopeFactor = calculateSlopeFactor(params);
  const upperAngleRad = Math.acos(1 / upperSlopeFactor);
  const upperAngleDeg = (upperAngleRad * 180) / Math.PI;
  
  // Lower slope is half as steep
  const lowerAngleDeg = upperAngleDeg / 2;
  const lowerAngleRad = (lowerAngleDeg * Math.PI) / 180;
  const lowerSlopeFactor = 1 / Math.cos(lowerAngleRad);
  
  // Each section covers 1/4 of width
  const upperPlanArea = (L + 2 * overhang) * (W / 4);
  const lowerPlanArea = (L + 2 * overhang) * (W / 4);
  
  return [
    {
      name: 'North Upper',
      planArea_m2: upperPlanArea,
      area_m2: upperPlanArea * upperSlopeFactor,
      slopeAngle_deg: upperAngleDeg,
      slopeFactor: upperSlopeFactor,
      ridgeLength_m: L + 2 * overhang,
    },
    {
      name: 'North Lower',
      planArea_m2: lowerPlanArea,
      area_m2: lowerPlanArea * lowerSlopeFactor,
      slopeAngle_deg: lowerAngleDeg,
      slopeFactor: lowerSlopeFactor,
      eaveLength_m: L + 2 * overhang,
    },
    {
      name: 'South Upper',
      planArea_m2: upperPlanArea,
      area_m2: upperPlanArea * upperSlopeFactor,
      slopeAngle_deg: upperAngleDeg,
      slopeFactor: upperSlopeFactor,
      ridgeLength_m: L + 2 * overhang,
    },
    {
      name: 'South Lower',
      planArea_m2: lowerPlanArea,
      area_m2: lowerPlanArea * lowerSlopeFactor,
      slopeAngle_deg: lowerAngleDeg,
      slopeFactor: lowerSlopeFactor,
      eaveLength_m: L + 2 * overhang,
    },
  ];
}

/**
 * Main function: Generate parametric roof
 */
export function generateParametricRoof(params: RoofParameters): ParametricRoofResult {
  let planes: GeneratedRoofPlane[];
  
  switch (params.style) {
    case 'gable':
      planes = generateGableRoof(params);
      break;
    case 'hip':
      planes = generateHipRoof(params);
      break;
    case 'flat':
      planes = generateFlatRoof(params);
      break;
    case 'gambrel':
      planes = generateGambrelRoof(params);
      break;
    default:
      throw new Error(`Unsupported roof style: ${params.style}`);
  }
  
  // Calculate summary
  const totalPlanArea = planes.reduce((sum, p) => sum + p.planArea_m2, 0);
  const totalSlopeArea = planes.reduce((sum, p) => sum + p.area_m2, 0);
  const ridgeLength = planes.reduce((sum, p) => sum + (p.ridgeLength_m || 0), 0);
  const hipLength = planes.reduce((sum, p) => sum + (p.hipLength_m || 0), 0);
  const valleyLength = planes.reduce((sum, p) => sum + (p.valleyLength_m || 0), 0);
  const eaveLength = planes.reduce((sum, p) => sum + (p.eaveLength_m || 0), 0);
  
  return {
    style: params.style,
    planes,
    summary: {
      totalPlanArea_m2: totalPlanArea,
      totalSlopeArea_m2: totalSlopeArea,
      ridgeLength_m: ridgeLength,
      hipLength_m: hipLength,
      valleyLength_m: valleyLength,
      eaveLength_m: eaveLength,
    },
    metadata: {
      length_m: params.length_m,
      width_m: params.width_m,
      pitch: getPitchString(params),
      overhang_m: params.overhang_m || 0,
    },
  };
}
