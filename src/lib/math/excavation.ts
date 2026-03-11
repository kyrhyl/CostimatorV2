/**
 * EXCAVATION VOLUME CALCULATIONS
 * Pure functions for earthwork volume computation
 * Based on standard surveying and civil engineering methods
 */

export interface ExcavationStation {
  station: string;
  chainage: number; // meters from start
  area: number; // cross-sectional area in m²
  notes?: string;
}

export interface ExcavationSegment {
  from: string;
  to: string;
  distance: number; // meters
  area1: number; // m²
  area2: number; // m²
  avgArea: number; // m²
  volume: number; // m³
}

export interface ExcavationVolumeResult {
  segments: ExcavationSegment[];
  totalVolume: number;
  method: string;
  formulaText: string;
}

export interface RectangularExcavationInput {
  length: number; // meters
  width: number; // meters
  depth: number; // meters
  waste?: number; // decimal (e.g., 0.05 for 5%)
}

export interface TrenchExcavationInput {
  length: number; // meters
  bottomWidth: number; // meters
  depth: number; // meters
  sideSlope?: number; // horizontal:vertical ratio (e.g., 1 for 1:1 slope)
  waste?: number; // decimal
}

export interface ExcavationOutput {
  volume: number; // m³
  volumeWithWaste?: number; // m³
  formulaText: string;
  inputs: Record<string, number>;
}

/**
 * Calculate excavation volume using Average Area Method (Cross-sectional method)
 * This is the standard method for linear excavations like roads, canals, etc.
 * 
 * Formula: V = Σ[(A₁ + A₂) / 2 × L]
 * where:
 *   A₁, A₂ = cross-sectional areas at consecutive stations
 *   L = distance between stations
 */
export function calculateAverageAreaMethod(
  stations: ExcavationStation[]
): ExcavationVolumeResult {
  if (stations.length < 2) {
    throw new Error('At least 2 stations are required for volume calculation');
  }

  // Sort stations by chainage
  const sortedStations = [...stations].sort((a, b) => a.chainage - b.chainage);

  const segments: ExcavationSegment[] = [];
  let totalVolume = 0;

  for (let i = 0; i < sortedStations.length - 1; i++) {
    const sta1 = sortedStations[i];
    const sta2 = sortedStations[i + 1];

    const distance = sta2.chainage - sta1.chainage;
    const avgArea = (sta1.area + sta2.area) / 2;
    const volume = avgArea * distance;

    segments.push({
      from: sta1.station,
      to: sta2.station,
      distance,
      area1: sta1.area,
      area2: sta2.area,
      avgArea,
      volume,
    });

    totalVolume += volume;
  }

  const formulaText = `Average Area Method: V = Σ[(A₁ + A₂)/2 × L] = ${totalVolume.toFixed(3)} m³`;

  return {
    segments,
    totalVolume,
    method: 'Average Area Method',
    formulaText,
  };
}

/**
 * Calculate excavation volume using End Area Method (Prismoidal Formula)
 * More accurate for irregular sections with significant variation
 * 
 * Formula: V = (L/6) × (A₁ + 4Am + A₂)
 * where:
 *   A₁ = area at first station
 *   Am = area at middle station
 *   A₂ = area at last station
 *   L = total distance
 */
export function calculatePrismoidalMethod(
  stations: ExcavationStation[]
): ExcavationVolumeResult {
  if (stations.length < 3) {
    throw new Error('At least 3 stations are required for prismoidal method');
  }

  // Sort stations by chainage
  const sortedStations = [...stations].sort((a, b) => a.chainage - b.chainage);

  const segments: ExcavationSegment[] = [];
  let totalVolume = 0;

  // Process stations in groups of 3 (overlapping)
  for (let i = 0; i < sortedStations.length - 2; i += 2) {
    const sta1 = sortedStations[i];
    const staMid = sortedStations[i + 1];
    const sta2 = sortedStations[i + 2];

    const totalDistance = sta2.chainage - sta1.chainage;
    const volume = (totalDistance / 6) * (sta1.area + 4 * staMid.area + sta2.area);

    const avgArea = volume / totalDistance;

    segments.push({
      from: sta1.station,
      to: sta2.station,
      distance: totalDistance,
      area1: sta1.area,
      area2: sta2.area,
      avgArea,
      volume,
    });

    totalVolume += volume;
  }

  // Handle remaining station if odd number
  if (sortedStations.length % 2 === 0) {
    const lastIdx = sortedStations.length - 1;
    const sta1 = sortedStations[lastIdx - 1];
    const sta2 = sortedStations[lastIdx];
    const distance = sta2.chainage - sta1.chainage;
    const avgArea = (sta1.area + sta2.area) / 2;
    const volume = avgArea * distance;

    segments.push({
      from: sta1.station,
      to: sta2.station,
      distance,
      area1: sta1.area,
      area2: sta2.area,
      avgArea,
      volume,
    });

    totalVolume += volume;
  }

  const formulaText = `Prismoidal Method: V = Σ[(L/6) × (A₁ + 4Am + A₂)] = ${totalVolume.toFixed(3)} m³`;

  return {
    segments,
    totalVolume,
    method: 'Prismoidal Method',
    formulaText,
  };
}

/**
 * Calculate volume for simple rectangular excavation
 * Used for basements, pits, etc.
 */
export function calculateRectangularExcavation(
  input: RectangularExcavationInput
): ExcavationOutput {
  const { length, width, depth, waste = 0 } = input;

  // Validation
  if (length <= 0 || width <= 0 || depth <= 0) {
    throw new Error('All dimensions must be positive');
  }
  if (waste < 0 || waste > 1) {
    throw new Error('Waste must be between 0 and 1');
  }

  const volume = length * width * depth;
  const volumeWithWaste = volume * (1 + waste);

  let formulaText = `V = L × W × D = ${length} × ${width} × ${depth} = ${volume.toFixed(3)} m³`;
  if (waste > 0) {
    formulaText += ` (+ ${(waste * 100).toFixed(0)}% waste = ${volumeWithWaste.toFixed(3)} m³)`;
  }

  return {
    volume,
    volumeWithWaste,
    formulaText,
    inputs: { length, width, depth, waste },
  };
}

/**
 * Calculate volume for trench excavation with sloped sides
 * Used for utility trenches, drainage, etc.
 * 
 * For sloped sides:
 * Top width = bottom width + 2 × (depth × slope ratio)
 * Average width = (top width + bottom width) / 2
 * Volume = average width × depth × length
 */
export function calculateTrenchExcavation(
  input: TrenchExcavationInput
): ExcavationOutput {
  const { length, bottomWidth, depth, sideSlope = 0, waste = 0 } = input;

  // Validation
  if (length <= 0 || bottomWidth <= 0 || depth <= 0) {
    throw new Error('All dimensions must be positive');
  }
  if (sideSlope < 0) {
    throw new Error('Side slope must be non-negative');
  }
  if (waste < 0 || waste > 1) {
    throw new Error('Waste must be between 0 and 1');
  }

  let volume: number;
  let formulaText: string;

  if (sideSlope === 0) {
    // Vertical sides (simple rectangular trench)
    volume = length * bottomWidth * depth;
    formulaText = `V = L × W × D = ${length} × ${bottomWidth} × ${depth} = ${volume.toFixed(3)} m³`;
  } else {
    // Sloped sides (trapezoidal cross-section)
    const topWidth = bottomWidth + 2 * depth * sideSlope;
    const avgWidth = (topWidth + bottomWidth) / 2;
    volume = length * avgWidth * depth;

    formulaText = `V = L × [(Wb + Wt)/2] × D`;
    formulaText += `\nWt = Wb + 2×D×S = ${bottomWidth} + 2×${depth}×${sideSlope} = ${topWidth.toFixed(2)} m`;
    formulaText += `\nAvg Width = ${avgWidth.toFixed(2)} m`;
    formulaText += `\nV = ${length} × ${avgWidth.toFixed(2)} × ${depth} = ${volume.toFixed(3)} m³`;
  }

  const volumeWithWaste = volume * (1 + waste);

  if (waste > 0) {
    formulaText += `\n(+ ${(waste * 100).toFixed(0)}% waste = ${volumeWithWaste.toFixed(3)} m³)`;
  }

  return {
    volume,
    volumeWithWaste,
    formulaText,
    inputs: { length, bottomWidth, depth, sideSlope, waste },
  };
}

/**
 * Calculate embankment or fill volume
 * Similar to excavation but typically with different waste/compaction factors
 */
export function calculateEmbankmentVolume(
  stations: ExcavationStation[],
  compactionFactor: number = 1.0
): ExcavationVolumeResult {
  const result = calculateAverageAreaMethod(stations);

  // Apply compaction factor
  const adjustedVolume = result.totalVolume * compactionFactor;

  return {
    ...result,
    totalVolume: adjustedVolume,
    method: 'Average Area Method with Compaction',
    formulaText: `${result.formulaText} × ${compactionFactor} (compaction) = ${adjustedVolume.toFixed(3)} m³`,
  };
}

/**
 * Calculate volume correction for slope factor
 * Used when excavation follows terrain slope
 */
export function calculateSlopeCorrectionFactor(
  slopeAngleDegrees: number
): number {
  const slopeRadians = (slopeAngleDegrees * Math.PI) / 180;
  return 1 / Math.cos(slopeRadians);
}

/**
 * Utility: Round volume to specified decimal places
 */
export function roundVolume(volume: number, decimals: number = 3): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(volume * multiplier) / multiplier;
}
