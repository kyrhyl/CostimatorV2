/**
 * Roof Framing Plan Calculation Library
 * Calculates purlins, bracing, and other framing components
 */

import type { DPWHItemMapping } from '@/types';

// Default DPWH Item Mappings for Roof Framing Components
export const DEFAULT_DPWH_MAPPINGS = {
  trussSteel: {
    dpwhItemNumberRaw: '1047 (8) a',
    description: 'Structural Steel Trusses',
    unit: 'Kilogram'
  } as DPWHItemMapping,
  purlinSteel: {
    dpwhItemNumberRaw: '1047 (8) b',
    description: 'Structural Steel Purlins',
    unit: 'Kilogram'
  } as DPWHItemMapping,
  bracingSteel: {
    dpwhItemNumberRaw: '1047 (4) b',
    description: 'Metal Structure Accessories Turnbuckle',
    unit: 'Each'
  } as DPWHItemMapping,
  sagRods: {
    dpwhItemNumberRaw: '1047 (5) b',
    description: 'Metal Structure Accessories Sagrods',
    unit: 'Kilogram'
  } as DPWHItemMapping,
  boltsAndRods: {
    dpwhItemNumberRaw: '1047 (5) a',
    description: 'Metal Structure Accessories Bolts and Rods',
    unit: 'Kilogram'
  } as DPWHItemMapping,
  steelPlates: {
    dpwhItemNumberRaw: '1047 (5) d',
    description: 'Metal Structure Accessories Steel Plates',
    unit: 'Kilogram'
  } as DPWHItemMapping,
  roofingSheets: {
    dpwhItemNumberRaw: '1013 (1)',
    description: 'Corrugated Metal Roofing Gauge 26 (0.551 mm)',
    unit: 'Square Meter'
  } as DPWHItemMapping,
  ridgeCap: {
    dpwhItemNumberRaw: '1013 (2) a',
    description: 'Fabricated Metal Roofing Accessory Gauge 26 (0.551 mm) Ridge/Hip Rolls',
    unit: 'Linear Meter'
  } as DPWHItemMapping,
};

export interface RoofingMaterial {
  type: string;
  name: string;
  dpwhItem: string;
  description: string;
  maxPurlinSpacing_mm: number; // Maximum purlin spacing for this material
}

export const roofingMaterials: RoofingMaterial[] = [
  { 
    type: 'GI_Sheet_26', 
    name: 'Corrugated Metal Roofing Gauge 26 (0.551 mm)', 
    dpwhItem: '1013 (1)',
    description: 'Corrugated Metal Roofing Gauge 26 (0.551 mm)',
    maxPurlinSpacing_mm: 600 
  },
  { 
    type: 'Asphalt_3mm', 
    name: 'Corrugated Asphalt Roofing 3 mm', 
    dpwhItem: '1013 (5)',
    description: 'Corrugated Asphalt Roofing 3 mm',
    maxPurlinSpacing_mm: 600 
  },
];

export interface PurlinSpecification {
  section: string;
  weight_kg_per_m: number;
}

export const purlinSections: PurlinSpecification[] = [
  { section: 'C50x25x15x1.6', weight_kg_per_m: 1.89 },
  { section: 'C75x40x15x2.0', weight_kg_per_m: 2.93 },
  { section: 'C100x50x20x2.0', weight_kg_per_m: 3.91 },
  { section: 'C125x65x20x2.3', weight_kg_per_m: 5.41 },
  { section: '2x3" Coco Lumber', weight_kg_per_m: 2.8 },
  { section: '2x4" Coco Lumber', weight_kg_per_m: 3.7 },
];

export interface BracingConfiguration {
  type: 'X-Brace' | 'Diagonal' | 'K-Brace';
  interval_mm: number; // Spacing between bracing bays (typically 6000-8000mm)
  material: {
    section: string;
    weight_kg_per_m: number;
  };
}

export interface FramingParameters {
  // Truss details
  trussSpan_mm: number;
  trussSpacing_mm: number;
  buildingLength_mm: number;
  trussQuantity: number;
  
  // Purlin configuration
  roofingMaterial: RoofingMaterial;
  purlinSpacing_mm: number; // Actual purlin spacing (must be <= maxPurlinSpacing_mm)
  purlinSpec: PurlinSpecification;
  
  // Bracing configuration
  bracing: BracingConfiguration;
  
  // Additional components
  includeRidgeCap: boolean;
  includeEaveGirt: boolean;
}

export interface PurlinLine {
  position_mm: number; // Distance from eave along slope
  length_mm: number; // Total length (building length)
  quantity: number; // Number of continuous pieces needed
  side: 'left' | 'right' | 'ridge';
}

export interface BracingMember {
  type: 'diagonal' | 'horizontal';
  bayNumber: number;
  length_mm: number;
  quantity: number;
  hasTurnbuckle: boolean;
}

export interface FramingResult {
  purlins: {
    lines: PurlinLine[];
    totalLength_m: number;
    totalWeight_kg: number;
    linesPerSide: number;
  };
  
  bracing: {
    members: BracingMember[];
    totalLength_m: number;
    totalWeight_kg: number;
    turnbuckleCount: number;
    bayCount: number;
  };
  
  accessories: {
    ridgeCap_m: number;
    eaveGirt_m: number;
    boltsAndNuts: number;
    purlinClips: number;
  };
  
  roofing: {
    area_m2: number;
    sheets: number;
    screws: number;
  };
  
  summary: {
    totalSteelWeight_kg: number;
    totalTimberVolume_m3: number;
  };
}

/**
 * Calculate purlin layout along roof slope
 */
function calculatePurlins(params: FramingParameters): {
  lines: PurlinLine[];
  totalLength_m: number;
  totalWeight_kg: number;
  linesPerSide: number;
} {
  const { trussSpan_mm, buildingLength_mm, purlinSpacing_mm, purlinSpec } = params;
  
  // Calculate roof slope length (from eave to ridge on one side)
  const halfSpan = trussSpan_mm / 2;
  const slopeLength_mm = halfSpan; // Simplified - actual should account for rise
  
  // Number of purlin lines per side (excluding ridge)
  const linesPerSide = Math.ceil(slopeLength_mm / purlinSpacing_mm);
  
  const lines: PurlinLine[] = [];
  
  // Left side purlins
  for (let i = 0; i <= linesPerSide; i++) {
    const position = i * purlinSpacing_mm;
    if (position <= slopeLength_mm) {
      lines.push({
        position_mm: position,
        length_mm: buildingLength_mm,
        quantity: Math.ceil(buildingLength_mm / 6000), // 6m standard length
        side: 'left',
      });
    }
  }
  
  // Ridge purlin
  lines.push({
    position_mm: slopeLength_mm,
    length_mm: buildingLength_mm,
    quantity: Math.ceil(buildingLength_mm / 6000),
    side: 'ridge',
  });
  
  // Right side purlins (mirror of left)
  for (let i = 0; i <= linesPerSide; i++) {
    const position = i * purlinSpacing_mm;
    if (position <= slopeLength_mm) {
      lines.push({
        position_mm: position,
        length_mm: buildingLength_mm,
        quantity: Math.ceil(buildingLength_mm / 6000),
        side: 'right',
      });
    }
  }
  
  // Calculate total length
  const totalLength_mm = lines.reduce((sum, line) => sum + line.length_mm, 0);
  const totalLength_m = totalLength_mm / 1000;
  
  // Calculate weight
  const totalWeight_kg = totalLength_m * purlinSpec.weight_kg_per_m;
  
  return {
    lines,
    totalLength_m,
    totalWeight_kg,
    linesPerSide,
  };
}

/**
 * Calculate cross bracing members
 */
function calculateBracing(params: FramingParameters): {
  members: BracingMember[];
  totalLength_m: number;
  totalWeight_kg: number;
  turnbuckleCount: number;
  bayCount: number;
} {
  const { buildingLength_mm, trussSpacing_mm, bracing } = params;
  
  // Calculate number of bracing bays
  const bayCount = Math.ceil(buildingLength_mm / bracing.interval_mm);
  
  const members: BracingMember[] = [];
  
  if (bracing.type === 'X-Brace') {
    // X-bracing: 2 diagonals per bay
    for (let i = 0; i < bayCount; i++) {
      // Calculate diagonal length using Pythagorean theorem
      const bayWidth = Math.min(bracing.interval_mm, buildingLength_mm - i * bracing.interval_mm);
      const diagonalLength = Math.sqrt(
        Math.pow(bayWidth, 2) + Math.pow(trussSpacing_mm, 2)
      );
      
      members.push({
        type: 'diagonal',
        bayNumber: i + 1,
        length_mm: diagonalLength,
        quantity: 2, // Two diagonals for X
        hasTurnbuckle: true,
      });
    }
  } else if (bracing.type === 'Diagonal') {
    // Single diagonal per bay
    for (let i = 0; i < bayCount; i++) {
      const bayWidth = Math.min(bracing.interval_mm, buildingLength_mm - i * bracing.interval_mm);
      const diagonalLength = Math.sqrt(
        Math.pow(bayWidth, 2) + Math.pow(trussSpacing_mm, 2)
      );
      
      members.push({
        type: 'diagonal',
        bayNumber: i + 1,
        length_mm: diagonalLength,
        quantity: 1,
        hasTurnbuckle: true,
      });
    }
  }
  
  // Calculate totals
  const totalLength_mm = members.reduce((sum, m) => sum + (m.length_mm * m.quantity), 0);
  const totalLength_m = totalLength_mm / 1000;
  const totalWeight_kg = totalLength_m * bracing.material.weight_kg_per_m;
  const turnbuckleCount = members.filter(m => m.hasTurnbuckle).length * 
                          (bracing.type === 'X-Brace' ? 2 : 1);
  
  return {
    members,
    totalLength_m,
    totalWeight_kg,
    turnbuckleCount,
    bayCount,
  };
}

/**
 * Calculate accessories and fasteners
 */
function calculateAccessories(params: FramingParameters, purlins: any): {
  ridgeCap_m: number;
  eaveGirt_m: number;
  boltsAndNuts: number;
  purlinClips: number;
} {
  const { buildingLength_mm, trussQuantity, includeRidgeCap, includeEaveGirt } = params;
  
  return {
    ridgeCap_m: includeRidgeCap ? buildingLength_mm / 1000 : 0,
    eaveGirt_m: includeEaveGirt ? (buildingLength_mm / 1000) * 2 : 0, // Both sides
    boltsAndNuts: trussQuantity * purlins.linesPerSide * 2 * 2, // 2 bolts per connection, both sides
    purlinClips: trussQuantity * purlins.lines.length, // One clip per purlin-truss intersection
  };
}

/**
 * Calculate roofing sheet requirements
 */
function calculateRoofing(params: FramingParameters): {
  area_m2: number;
  sheets: number;
  screws: number;
} {
  const { trussSpan_mm, buildingLength_mm, roofingMaterial } = params;
  
  // Simplified roof area (both slopes)
  const slopeLength_m = (trussSpan_mm / 2) / 1000;
  const buildingLength_m = buildingLength_mm / 1000;
  const area_m2 = slopeLength_m * buildingLength_m * 2; // Both sides
  
  // Standard GI sheet: 0.6m x 2.4m = 1.44 m²
  const sheetArea_m2 = roofingMaterial.type === 'GI_Sheet' ? 1.44 : 2.0;
  const sheets = Math.ceil(area_m2 / sheetArea_m2 * 1.1); // 10% waste
  
  // Screws: ~8 per sheet
  const screws = sheets * 8;
  
  return {
    area_m2,
    sheets,
    screws,
  };
}

/**
 * Main framing calculation function
 */
export function calculateRoofFraming(params: FramingParameters): FramingResult {
  const purlins = calculatePurlins(params);
  const bracing = calculateBracing(params);
  const accessories = calculateAccessories(params, purlins);
  const roofing = calculateRoofing(params);
  
  // Calculate summary
  const totalSteelWeight_kg = purlins.totalWeight_kg + bracing.totalWeight_kg;
  const totalTimberVolume_m3 = 0; // Calculate if using timber purlins
  
  return {
    purlins,
    bracing,
    accessories,
    roofing,
    summary: {
      totalSteelWeight_kg,
      totalTimberVolume_m3,
    },
  };
}
