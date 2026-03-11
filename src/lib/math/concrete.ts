/**
 * CONCRETE QUANTITY CALCULATION
 * Pure math functions for concrete volume computation
 * All inputs in meters, outputs in cubic meters (m³)
 */

export interface BeamConcreteInput {
  width: number; // meters
  height: number; // meters
  length: number; // meters
  waste: number; // decimal (e.g., 0.05 for 5%)
}

export interface SlabConcreteInput {
  thickness: number; // meters
  area: number; // square meters
  waste: number; // decimal
}

export interface ColumnConcreteInput {
  shape: 'rectangular' | 'circular';
  width?: number; // meters (for rectangular)
  height?: number; // meters (for rectangular)
  diameter?: number; // meters (for circular)
  length: number; // meters (column height between levels)
  waste: number; // decimal
}

export interface ConcreteOutput {
  volume: number; // m³
  volumeWithWaste: number; // m³
  formulaText: string;
  inputs: Record<string, number>;
}

/**
 * Calculate concrete volume for a beam
 */
export function calculateBeamConcrete(input: BeamConcreteInput): ConcreteOutput {
  const { width, height, length, waste } = input;

  // Validation
  if (width <= 0 || height <= 0 || length <= 0) {
    throw new Error('Beam dimensions must be positive');
  }
  if (waste < 0 || waste > 1) {
    throw new Error('Waste must be between 0 and 1');
  }

  // Volume = width × height × length
  const volume = width * height * length;
  const volumeWithWaste = volume * (1 + waste);

  const formulaText = `V = W × H × L = ${width} × ${height} × ${length} = ${volume.toFixed(3)} m³ (+ ${(waste * 100).toFixed(0)}% waste = ${volumeWithWaste.toFixed(3)} m³)`;

  return {
    volume,
    volumeWithWaste,
    formulaText,
    inputs: { width, height, length, waste },
  };
}

/**
 * Calculate concrete volume for a slab
 */
export function calculateSlabConcrete(input: SlabConcreteInput): ConcreteOutput {
  const { thickness, area, waste } = input;

  // Validation
  if (thickness <= 0 || area <= 0) {
    throw new Error('Slab dimensions must be positive');
  }
  if (waste < 0 || waste > 1) {
    throw new Error('Waste must be between 0 and 1');
  }

  // Volume = thickness × area
  const volume = thickness * area;
  const volumeWithWaste = volume * (1 + waste);

  const formulaText = `V = T × A = ${thickness} × ${area.toFixed(2)} = ${volume.toFixed(3)} m³ (+ ${(waste * 100).toFixed(0)}% waste = ${volumeWithWaste.toFixed(3)} m³)`;

  return {
    volume,
    volumeWithWaste,
    formulaText,
    inputs: { thickness, area, waste },
  };
}

/**
 * Calculate concrete volume for a column
 */
export function calculateColumnConcrete(input: ColumnConcreteInput): ConcreteOutput {
  const { shape, width, height, diameter, length, waste } = input;

  // Validation
  if (length <= 0) {
    throw new Error('Column length must be positive');
  }
  if (waste < 0 || waste > 1) {
    throw new Error('Waste must be between 0 and 1');
  }

  let volume: number;
  let formulaText: string;
  const inputs: Record<string, number> = { length, waste };

  if (shape === 'circular') {
    if (!diameter || diameter <= 0) {
      throw new Error('Circular column requires positive diameter');
    }
    
    // Volume = π × (d/2)² × length
    const radius = diameter / 2;
    volume = Math.PI * radius * radius * length;
    inputs.diameter = diameter;
    
    formulaText = `V = π × (D/2)² × L = π × (${diameter}/2)² × ${length} = ${volume.toFixed(3)} m³ (+ ${(waste * 100).toFixed(0)}% waste = ${(volume * (1 + waste)).toFixed(3)} m³)`;
  } else {
    // Rectangular
    if (!width || width <= 0 || !height || height <= 0) {
      throw new Error('Rectangular column requires positive width and height');
    }
    
    // Volume = width × height × length
    volume = width * height * length;
    inputs.width = width;
    inputs.height = height;
    
    formulaText = `V = W × H × L = ${width} × ${height} × ${length} = ${volume.toFixed(3)} m³ (+ ${(waste * 100).toFixed(0)}% waste = ${(volume * (1 + waste)).toFixed(3)} m³)`;
  }

  const volumeWithWaste = volume * (1 + waste);

  return {
    volume,
    volumeWithWaste,
    formulaText,
    inputs,
  };
}

/**
 * Round volume to specified decimal places
 */
export function roundVolume(volume: number, decimalPlaces: number): number {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(volume * factor) / factor;
}

// ===================================
// FOUNDATION ELEMENTS (Future Use)
// ===================================

export interface FootingConcreteInput {
  length: number; // meters
  width: number; // meters
  depth: number; // meters (footing thickness)
  waste: number; // decimal
}

export interface PileConcreteInput {
  shape: 'circular' | 'square';
  diameter?: number; // meters (for circular)
  width?: number; // meters (for square)
  depth: number; // meters (pile length)
  waste: number; // decimal
}

/**
 * Calculate concrete volume for a footing
 * Volume = length × width × depth
 */
export function calculateFootingConcrete(input: FootingConcreteInput): ConcreteOutput {
  const { length, width, depth, waste } = input;

  // Validation
  if (length <= 0 || width <= 0 || depth <= 0) {
    throw new Error('Footing dimensions must be positive');
  }
  if (waste < 0 || waste > 1) {
    throw new Error('Waste must be between 0 and 1');
  }

  // Volume = length × width × depth
  const volume = length * width * depth;
  const volumeWithWaste = volume * (1 + waste);

  const formulaText = `V = L × W × D = ${length} × ${width} × ${depth} = ${volume.toFixed(3)} m³ (+ ${(waste * 100).toFixed(0)}% waste = ${volumeWithWaste.toFixed(3)} m³)`;

  return {
    volume,
    volumeWithWaste,
    formulaText,
    inputs: { length, width, depth, waste },
  };
}

/**
 * Calculate concrete volume for a pile
 * Circular: Volume = π × (d/2)² × depth
 * Square: Volume = width² × depth
 */
export function calculatePileConcrete(input: PileConcreteInput): ConcreteOutput {
  const { shape, diameter, width, depth, waste } = input;

  // Validation
  if (depth <= 0) {
    throw new Error('Pile depth must be positive');
  }
  if (waste < 0 || waste > 1) {
    throw new Error('Waste must be between 0 and 1');
  }

  let volume: number;
  let formulaText: string;
  const inputs: Record<string, number> = { depth, waste };

  if (shape === 'circular') {
    if (!diameter || diameter <= 0) {
      throw new Error('Circular pile requires positive diameter');
    }
    
    // Volume = π × (d/2)² × depth
    const radius = diameter / 2;
    volume = Math.PI * radius * radius * depth;
    inputs.diameter = diameter;
    
    formulaText = `V = π × (D/2)² × Depth = π × (${diameter}/2)² × ${depth} = ${volume.toFixed(3)} m³ (+ ${(waste * 100).toFixed(0)}% waste = ${(volume * (1 + waste)).toFixed(3)} m³)`;
  } else {
    // Square
    if (!width || width <= 0) {
      throw new Error('Square pile requires positive width');
    }
    
    // Volume = width² × depth
    volume = width * width * depth;
    inputs.width = width;
    
    formulaText = `V = W² × Depth = ${width}² × ${depth} = ${volume.toFixed(3)} m³ (+ ${(waste * 100).toFixed(0)}% waste = ${(volume * (1 + waste)).toFixed(3)} m³)`;
  }

  const volumeWithWaste = volume * (1 + waste);

  return {
    volume,
    volumeWithWaste,
    formulaText,
    inputs,
  };
}
