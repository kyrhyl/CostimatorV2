/**
 * FORMWORK CALCULATIONS
 * Pure functions for calculating formwork areas (m²)
 * Based on DPWH standards and construction practices
 */

export interface FormworkOutput {
  area: number;          // Total area in m²
  formulaText: string;   // Human-readable formula
  inputs: Record<string, number>; // Input values used
}

/**
 * Calculate formwork area for a beam
 * Formwork needed: bottom + 2 sides (no top, as concrete is open)
 * 
 * @param width - Beam width in meters
 * @param height - Beam height in meters
 * @param length - Beam length in meters
 * @returns Formwork area calculation result
 */
export function calculateBeamFormwork(
  width: number,
  height: number,
  length: number
): FormworkOutput {
  // Contact area = 2 sides + bottom
  // Area = (2 × height × length) + (width × length)
  const sidesArea = 2 * height * length;
  const bottomArea = width * length;
  const totalArea = sidesArea + bottomArea;
  
  const formulaText = `(2 × ${height.toFixed(2)}m × ${length.toFixed(2)}m) + (${width.toFixed(2)}m × ${length.toFixed(2)}m) = ${totalArea.toFixed(3)} m²`;
  
  return {
    area: totalArea,
    formulaText,
    inputs: {
      width,
      height,
      length,
      sidesArea,
      bottomArea,
    },
  };
}

/**
 * Calculate formwork area for a slab (soffit formwork)
 * Formwork needed: bottom surface only (false ceiling/soffit forms)
 * 
 * @param area - Slab area in m²
 * @returns Formwork area calculation result
 */
export function calculateSlabFormwork(area: number): FormworkOutput {
  // Slab formwork = bottom surface area (soffit)
  const totalArea = area;
  
  const formulaText = `${area.toFixed(3)} m² (soffit formwork)`;
  
  return {
    area: totalArea,
    formulaText,
    inputs: {
      slabArea: area,
    },
  };
}

/**
 * Calculate formwork area for a rectangular column
 * Formwork needed: all 4 sides
 * 
 * @param width - Column width in meters
 * @param height - Column height in meters (vertical dimension)
 * @param columnHeight - Column height/length in meters
 * @returns Formwork area calculation result
 */
export function calculateRectangularColumnFormwork(
  width: number,
  height: number,
  columnHeight: number
): FormworkOutput {
  // Perimeter × column height
  const perimeter = 2 * (width + height);
  const totalArea = perimeter * columnHeight;
  
  const formulaText = `2 × (${width.toFixed(2)}m + ${height.toFixed(2)}m) × ${columnHeight.toFixed(2)}m = ${totalArea.toFixed(3)} m²`;
  
  return {
    area: totalArea,
    formulaText,
    inputs: {
      width,
      height,
      columnHeight,
      perimeter,
    },
  };
}

/**
 * Calculate formwork area for a circular column
 * Formwork needed: cylindrical surface
 * 
 * @param diameter - Column diameter in meters
 * @param columnHeight - Column height in meters
 * @returns Formwork area calculation result
 */
export function calculateCircularColumnFormwork(
  diameter: number,
  columnHeight: number
): FormworkOutput {
  // Circumference × column height
  const circumference = Math.PI * diameter;
  const totalArea = circumference * columnHeight;
  
  const formulaText = `π × ${diameter.toFixed(2)}m × ${columnHeight.toFixed(2)}m = ${totalArea.toFixed(3)} m²`;
  
  return {
    area: totalArea,
    formulaText,
    inputs: {
      diameter,
      columnHeight,
      circumference,
    },
  };
}

/**
 * Calculate formwork area for mat foundation
 * Formwork needed: perimeter edges only
 * 
 * @param width - Mat width in meters
 * @param length - Mat length in meters
 * @param thickness - Mat thickness in meters
 * @returns Formwork area calculation result
 */
export function calculateMatFormwork(
  width: number,
  length: number,
  thickness: number
): FormworkOutput {
  // Edge formwork = perimeter × thickness
  const perimeter = 2 * (width + length);
  const totalArea = perimeter * thickness;
  
  const formulaText = `2 × (${width.toFixed(2)}m + ${length.toFixed(2)}m) × ${thickness.toFixed(2)}m = ${totalArea.toFixed(3)} m²`;
  
  return {
    area: totalArea,
    formulaText,
    inputs: {
      width,
      length,
      thickness,
      perimeter,
    },
  };
}

/**
 * Calculate formwork area for isolated footing
 * Formwork needed: all 4 sides
 * 
 * @param length - Footing length in meters
 * @param width - Footing width in meters
 * @param depth - Footing depth in meters
 * @returns Formwork area calculation result
 */
export function calculateFootingFormwork(
  length: number,
  width: number,
  depth: number
): FormworkOutput {
  // All 4 sides: 2 × (length × depth) + 2 × (width × depth)
  const perimeter = 2 * (length + width);
  const totalArea = perimeter * depth;
  
  const formulaText = `2 × (${length.toFixed(2)}m + ${width.toFixed(2)}m) × ${depth.toFixed(2)}m = ${totalArea.toFixed(3)} m²`;
  
  return {
    area: totalArea,
    formulaText,
    inputs: {
      length,
      width,
      depth,
      perimeter,
    },
  };
}

/**
 * Round formwork area to specified decimal places
 */
export function roundArea(area: number, decimals: number): number {
  return Math.round(area * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
