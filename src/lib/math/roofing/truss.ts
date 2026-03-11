/**
 * Truss Design and Calculation Library
 * Supports Howe, Fink, King Post, Queen Post, and other truss types
 */

export type TrussType = 'howe' | 'fink' | 'kingpost' | 'queenpost' | 'pratt' | 'warren';
export type PlateThickness = '1.0mm (20 gauge)' | '1.2mm (18 gauge)' | '1.5mm (16 gauge)' | '2.0mm (14 gauge)';

export interface MaterialSpecification {
  section: string; // e.g., "C75x40x15x2.3", "2L50x50x6"
  weight_kg_per_m: number; // Weight per linear meter
}

export interface TrussParameters {
  type: TrussType;
  span_mm: number;
  middleRise_mm: number; // Required: exact height at middle/peak
  overhang_mm?: number;
  spacing_mm: number;
  verticalWebCount?: number; // Optional: number of vertical web members (excluding center), applies to Howe truss
  plateThickness: PlateThickness;
  // Material specifications for steel components (required)
  topChordMaterial: MaterialSpecification;
  bottomChordMaterial: MaterialSpecification;
  webMaterial: MaterialSpecification;
}

export interface TrussMember {
  name: string;
  type: 'chord' | 'web';
  subtype: 'top' | 'bottom' | 'vertical' | 'diagonal';
  length_mm: number;
  quantity: number;
  section: string; // e.g., "40x90mm", "40x70mm"
  forceType: 'compression' | 'tension' | 'both';
}

export interface ConnectorPlate {
  name: string;
  size_mm: string; // e.g., "40x50mm"
  gauge: string;
  quantity: number;
}

export interface TrussResult {
  type: TrussType;
  geometry: {
    span_mm: number;
    rise_mm: number;
    pitch_deg: number;
    overhang_mm: number;
    totalLength_mm: number; // Including overhangs
    height_mm: number;
  };
  members: TrussMember[];
  connectorPlates: ConnectorPlate[];
  summary: {
    totalWeight_kg: number;
    topChordLength_mm: number;
    bottomChordLength_mm: number;
    webMembersTotal_mm: number;
    plateCount: number;
    materialVolume_m3: number;
    // Weight breakdown
    topChordWeight_kg: number;
    bottomChordWeight_kg: number;
    webWeight_kg: number;
  };
  validation: {
    valid: boolean;
    warnings: string[];
  };
}

/**
 * Calculate member length between two points
 */
function calculateLength(dx_mm: number, dy_mm: number): number {
  return Math.sqrt(dx_mm * dx_mm + dy_mm * dy_mm);
}

/**
 * Generate Howe Truss Design
 * Characteristics: Vertical web members (compression), Diagonal web members (tension)
 * Efficient for medium to long spans (6-20m)
 */
function generateHoweTruss(params: TrussParameters): TrussResult {
  const { span_mm, middleRise_mm, overhang_mm = 450, spacing_mm, verticalWebCount } = params;
  
  const rise_mm = middleRise_mm;
  const totalLength_mm = span_mm + 2 * overhang_mm;
  
  // Use verticalWebCount if provided, otherwise auto-calculate (default 3-5 based on span)
  const actualVerticalCount = verticalWebCount ?? Math.max(3, Math.min(5, Math.floor(span_mm / 2000)));
  // Total panels = vertical webs + 1 (panels between verticals plus end panels)
  const panelCount = actualVerticalCount + 1;
  const panelWidth_mm = span_mm / panelCount;
  
  const members: TrussMember[] = [];
  const connectorPlates: ConnectorPlate[] = [];
  
  // Calculate top chord length (sloped)
  const halfSpan_mm = span_mm / 2;
  const topChordSegmentLength_mm = calculateLength(panelWidth_mm, rise_mm / (panelCount / 2));
  const topChordTotalPerSide_mm = topChordSegmentLength_mm * (panelCount / 2);
  
  // Top Chord (2 pieces, left and right slope)
  members.push({
    name: 'Top Chord',
    type: 'chord',
    subtype: 'top',
    length_mm: topChordTotalPerSide_mm + overhang_mm,
    quantity: 2,
    section: '40x90mm',
    forceType: 'compression',
  });
  
  // Bottom Chord (horizontal)
  members.push({
    name: 'Bottom Chord',
    type: 'chord',
    subtype: 'bottom',
    length_mm: span_mm,
    quantity: 1,
    section: '40x90mm',
    forceType: 'tension',
  });
  
  // Vertical Web Members (compression) - Main internal webs
  members.push({
    name: 'Vertical Web',
    type: 'web',
    subtype: 'vertical',
    length_mm: rise_mm / (panelCount / 2), // Average height
    quantity: actualVerticalCount,
    section: '40x70mm',
    forceType: 'compression',
  });

  // Vertical End Webs (at both ends, when overhang exists)
  // These support the overhang and are separate from the main vertical web count
  if (overhang_mm > 0) {
    members.push({
      name: 'End Vertical Web',
      type: 'web',
      subtype: 'vertical',
      length_mm: overhang_mm * Math.tan(Math.atan(rise_mm / halfSpan_mm)), // Height at overhang position
      quantity: 2, // One at each end
      section: '40x70mm',
      forceType: 'compression',
    });
  }
  
  // Diagonal Web Members (tension)
  const diagonalLength_mm = calculateLength(panelWidth_mm, rise_mm / (panelCount / 2));
  
  // Base diagonal count for main span
  let diagonalQuantity = panelCount;
  
  // Add 2 more diagonals if overhang exists (for overhang triangular sections)
  if (overhang_mm > 0) {
    diagonalQuantity += 2;
  }
  
  members.push({
    name: 'Diagonal Web',
    type: 'web',
    subtype: 'diagonal',
    length_mm: diagonalLength_mm,
    quantity: diagonalQuantity,
    section: '40x70mm',
    forceType: 'tension',
  });
  
  // Connector Plates
  // Heel plates (at supports)
  connectorPlates.push({
    name: 'Heel Plate',
    size_mm: '80x100mm',
    gauge: params.plateThickness,
    quantity: 2,
  });
  
  // Middle rise plate (at apex)
  connectorPlates.push({
    name: 'Middle Rise Plate',
    size_mm: '100x150mm',
    gauge: params.plateThickness,
    quantity: 1,
  });
  
  // Internal node plates
  const internalNodes = (panelCount - 1) * 2; // Both top and bottom
  connectorPlates.push({
    name: 'Node Plate',
    size_mm: '60x80mm',
    gauge: params.plateThickness,
    quantity: internalNodes,
  });
  
  // Calculate total weight using steel material specifications
  let topChordWeight_kg = 0;
  let bottomChordWeight_kg = 0;
  let webWeight_kg = 0;
  
  members.forEach(member => {
    if (member.subtype === 'top') {
      const weight_kg = (member.length_mm / 1000) * params.topChordMaterial.weight_kg_per_m * member.quantity;
      topChordWeight_kg += weight_kg;
    } else if (member.subtype === 'bottom') {
      const weight_kg = (member.length_mm / 1000) * params.bottomChordMaterial.weight_kg_per_m * member.quantity;
      bottomChordWeight_kg += weight_kg;
    } else if (member.subtype === 'vertical' || member.subtype === 'diagonal') {
      const weight_kg = (member.length_mm / 1000) * params.webMaterial.weight_kg_per_m * member.quantity;
      webWeight_kg += weight_kg;
    }
  });
  
  const platesWeight_kg = connectorPlates.reduce((sum, p) => sum + p.quantity * 0.15, 0); // ~150g per plate
  const totalWeight_kg = topChordWeight_kg + bottomChordWeight_kg + webWeight_kg + platesWeight_kg;
  
  // Validation
  const warnings: string[] = [];
  const slendernessRatio = rise_mm / span_mm;
  
  if (slendernessRatio < 0.15) {
    warnings.push('Low pitch: Consider increasing pitch for better structural efficiency');
  }
  if (slendernessRatio > 0.5) {
    warnings.push('High pitch: Excessive rise may require additional bracing');
  }
  if (span_mm > 12000) {
    warnings.push('Large span: Consider professional structural review');
  }
  
  // Calculate diagonal member slenderness for compression check
  const diagonalSlenderness = diagonalLength_mm / 70; // Length / thickness
  if (diagonalSlenderness > 150) {
    warnings.push('Diagonal compression member slenderness ratio is high. Consider increasing thickness or bracing.');
  }
  
  // Calculate pitch from rise and span
  const pitch_deg = Math.atan(rise_mm / (span_mm / 2)) * 180 / Math.PI;
  
  return {
    type: 'howe',
    geometry: {
      span_mm,
      rise_mm,
      pitch_deg,
      overhang_mm,
      totalLength_mm,
      height_mm: rise_mm,
    },
    members,
    connectorPlates,
    summary: {
      totalWeight_kg,
      topChordLength_mm: (topChordTotalPerSide_mm + overhang_mm) * 2,
      bottomChordLength_mm: span_mm,
      webMembersTotal_mm: 
        (members.find(m => m.subtype === 'vertical')?.length_mm || 0) * actualVerticalCount +
        (members.find(m => m.subtype === 'diagonal')?.length_mm || 0) * panelCount,
      plateCount: connectorPlates.reduce((sum, p) => sum + p.quantity, 0),
      materialVolume_m3: 0, // Steel only - no volume calculation needed
      topChordWeight_kg,
      bottomChordWeight_kg,
      webWeight_kg,
    },
    validation: {
      valid: warnings.length === 0,
      warnings,
    },
  };
}

/**
 * Generate Fink Truss Design
 * Characteristics: W-shaped web pattern, very efficient for residential spans
 */
function generateFinkTruss(params: TrussParameters): TrussResult {
  const { span_mm, middleRise_mm, overhang_mm = 450 } = params;
  
  const rise_mm = middleRise_mm;
  const totalLength_mm = span_mm + 2 * overhang_mm;
  
  const members: TrussMember[] = [];
  const connectorPlates: ConnectorPlate[] = [];
  
  // Top chords (2 pieces)
  const topChordLength_mm = calculateLength(span_mm / 2, rise_mm) + overhang_mm;
  members.push({
    name: 'Top Chord',
    type: 'chord',
    subtype: 'top',
    length_mm: topChordLength_mm,
    quantity: 2,
    section: '40x90mm',
    forceType: 'compression',
  });
  
  // Bottom chord
  members.push({
    name: 'Bottom Chord',
    type: 'chord',
    subtype: 'bottom',
    length_mm: span_mm,
    quantity: 1,
    section: '40x90mm',
    forceType: 'tension',
  });
  
  // Center vertical (king post)
  members.push({
    name: 'Center Post',
    type: 'web',
    subtype: 'vertical',
    length_mm: rise_mm,
    quantity: 1,
    section: '40x70mm',
    forceType: 'compression',
  });

  // Vertical End Webs (at both ends, when overhang exists)
  if (overhang_mm > 0) {
    const endWebHeight_mm = overhang_mm * Math.tan(Math.atan(rise_mm / (span_mm / 2)));
    members.push({
      name: 'End Vertical Web',
      type: 'web',
      subtype: 'vertical',
      length_mm: endWebHeight_mm,
      quantity: 2, // One at each end
      section: '40x70mm',
      forceType: 'compression',
    });
  }
  
  // W-pattern diagonals (4 pieces forming W)
  const quarterSpan = span_mm / 4;
  const halfRise = rise_mm / 2;
  const diagonalLength_mm = calculateLength(quarterSpan, halfRise);
  
  members.push({
    name: 'Web Diagonal',
    type: 'web',
    subtype: 'diagonal',
    length_mm: diagonalLength_mm,
    quantity: 4,
    section: '40x70mm',
    forceType: 'both',
  });
  
  // Connector plates
  connectorPlates.push({
    name: 'Heel Plate (HPP)',
    size_mm: '90x100mm',
    gauge: params.plateThickness,
    quantity: 2,
  });
  
  connectorPlates.push({
    name: 'Middle Rise Plate (MRP)',
    size_mm: '150x250mm',
    gauge: params.plateThickness,
    quantity: 1,
  });
  
  connectorPlates.push({
    name: 'Web Connection Plate',
    size_mm: '70x90mm',
    gauge: params.plateThickness,
    quantity: 6,
  });
  
  // Weight calculation using steel material specifications
  let topChordWeight_kg = 0;
  let bottomChordWeight_kg = 0;
  let webWeight_kg = 0;
  
  members.forEach(member => {
    if (member.subtype === 'top') {
      const weight_kg = (member.length_mm / 1000) * params.topChordMaterial.weight_kg_per_m * member.quantity;
      topChordWeight_kg += weight_kg;
    } else if (member.subtype === 'bottom') {
      const weight_kg = (member.length_mm / 1000) * params.bottomChordMaterial.weight_kg_per_m * member.quantity;
      bottomChordWeight_kg += weight_kg;
    } else if (member.subtype === 'vertical' || member.subtype === 'diagonal') {
      const weight_kg = (member.length_mm / 1000) * params.webMaterial.weight_kg_per_m * member.quantity;
      webWeight_kg += weight_kg;
    }
  });
  
  const platesWeight_kg = connectorPlates.reduce((sum, p) => sum + p.quantity * 0.15, 0);
  const totalWeight_kg = topChordWeight_kg + bottomChordWeight_kg + webWeight_kg + platesWeight_kg;
  
  const warnings: string[] = [];
  if (span_mm > 10000) warnings.push('Fink truss most efficient for spans under 10m');
  
  // Calculate pitch from rise and span
  const pitch_deg = Math.atan(rise_mm / (span_mm / 2)) * 180 / Math.PI;

  return {
    type: 'fink',
    geometry: {
      span_mm,
      rise_mm,
      pitch_deg,
      overhang_mm,
      totalLength_mm,
      height_mm: rise_mm,
    },
    members,
    connectorPlates,
    summary: {
      totalWeight_kg,
      topChordLength_mm: topChordLength_mm * 2,
      bottomChordLength_mm: span_mm,
      webMembersTotal_mm: rise_mm + (diagonalLength_mm * 4),
      plateCount: connectorPlates.reduce((sum, p) => sum + p.quantity, 0),
      materialVolume_m3: 0, // Steel only - no volume calculation needed
      topChordWeight_kg,
      bottomChordWeight_kg,
      webWeight_kg,
    },
    validation: {
      valid: warnings.length === 0,
      warnings,
    },
  };
}

/**
 * Generate King Post Truss (simplest form)
 */
function generateKingPostTruss(params: TrussParameters): TrussResult {
  const { span_mm, middleRise_mm, overhang_mm = 450 } = params;
  
  const rise_mm = middleRise_mm;
  const members: TrussMember[] = [];
  const connectorPlates: ConnectorPlate[] = [];
  
  // Top chords
  const topChordLength_mm = calculateLength(span_mm / 2, rise_mm) + overhang_mm;
  members.push({
    name: 'Top Chord',
    type: 'chord',
    subtype: 'top',
    length_mm: topChordLength_mm,
    quantity: 2,
    section: '40x90mm',
    forceType: 'compression',
  });
  
  // Bottom chord
  members.push({
    name: 'Bottom Chord',
    type: 'chord',
    subtype: 'bottom',
    length_mm: span_mm,
    quantity: 1,
    section: '40x90mm',
    forceType: 'tension',
  });
  
  // King post (center vertical)
  members.push({
    name: 'King Post',
    type: 'web',
    subtype: 'vertical',
    length_mm: rise_mm,
    quantity: 1,
    section: '40x90mm',
    forceType: 'compression',
  });

  // Vertical End Webs (at both ends, when overhang exists)
  if (overhang_mm > 0) {
    const endWebHeight_mm = overhang_mm * Math.tan(Math.atan(rise_mm / (span_mm / 2)));
    members.push({
      name: 'End Vertical Web',
      type: 'web',
      subtype: 'vertical',
      length_mm: endWebHeight_mm,
      quantity: 2, // One at each end
      section: '40x70mm',
      forceType: 'compression',
    });
  }
  
  // Two principal rafters (acting as struts)
  const strutLength_mm = calculateLength(span_mm / 2, rise_mm);
  members.push({
    name: 'Strut',
    type: 'web',
    subtype: 'diagonal',
    length_mm: strutLength_mm,
    quantity: 2,
    section: '40x70mm',
    forceType: 'tension',
  });
  
  connectorPlates.push({
    name: 'Heel Plate',
    size_mm: '80x100mm',
    gauge: params.plateThickness,
    quantity: 2,
  });
  
  connectorPlates.push({
    name: 'Middle Rise Plate',
    size_mm: '100x120mm',
    gauge: params.plateThickness,
    quantity: 1,
  });
  
  // Weight calculation using steel material specifications
  let topChordWeight_kg = 0;
  let bottomChordWeight_kg = 0;
  let webWeight_kg = 0;
  
  members.forEach(member => {
    if (member.subtype === 'top') {
      const weight_kg = (member.length_mm / 1000) * params.topChordMaterial.weight_kg_per_m * member.quantity;
      topChordWeight_kg += weight_kg;
    } else if (member.subtype === 'bottom') {
      const weight_kg = (member.length_mm / 1000) * params.bottomChordMaterial.weight_kg_per_m * member.quantity;
      bottomChordWeight_kg += weight_kg;
    } else if (member.subtype === 'vertical' || member.subtype === 'diagonal') {
      const weight_kg = (member.length_mm / 1000) * params.webMaterial.weight_kg_per_m * member.quantity;
      webWeight_kg += weight_kg;
    }
  });
  
  const platesWeight_kg = connectorPlates.reduce((sum, p) => sum + p.quantity * 0.15, 0);
  const totalWeight_kg = topChordWeight_kg + bottomChordWeight_kg + webWeight_kg + platesWeight_kg;
  
  const warnings: string[] = [];
  if (span_mm > 6000) warnings.push('King post truss recommended for spans under 6m');
  
  // Calculate pitch from rise and span
  const pitch_deg = Math.atan(rise_mm / (span_mm / 2)) * 180 / Math.PI;

  return {
    type: 'kingpost',
    geometry: {
      span_mm,
      rise_mm,
      pitch_deg,
      overhang_mm,
      totalLength_mm: span_mm + 2 * overhang_mm,
      height_mm: rise_mm,
    },
    members,
    connectorPlates,
    summary: {
      totalWeight_kg,
      topChordLength_mm: topChordLength_mm * 2,
      bottomChordLength_mm: span_mm,
      webMembersTotal_mm: rise_mm + (strutLength_mm * 2),
      plateCount: connectorPlates.reduce((sum, p) => sum + p.quantity, 0),

      materialVolume_m3: 0,
      topChordWeight_kg,
      bottomChordWeight_kg,
      webWeight_kg,
    },
    validation: {
      valid: warnings.length === 0,
      warnings,
    },
  };
}

/**
 * Main truss generation function
 */
export function generateTruss(params: TrussParameters): TrussResult {
  switch (params.type) {
    case 'howe':
      return generateHoweTruss(params);
    case 'fink':
      return generateFinkTruss(params);
    case 'kingpost':
      return generateKingPostTruss(params);
    default:
      throw new Error(`Truss type '${params.type}' not yet implemented`);
  }
}

/**
 * Calculate required number of trusses for a building
 */
export function calculateTrussQuantity(
  buildingLength_mm: number,
  trussSpacing_mm: number
): number {
  // Number of spaces + 1 (trusses at both ends)
  return Math.ceil(buildingLength_mm / trussSpacing_mm) + 1;
}

/**
 * Calculate total material takeoff for all trusses
 */
export function calculateTotalTrussQuantities(
  singleTruss: TrussResult,
  quantity: number
) {
  return {
    totalWeight_kg: singleTruss.summary.totalWeight_kg * quantity,
    members: singleTruss.members.map(member => ({
      ...member,
      totalLength_mm: member.length_mm * member.quantity * quantity,
      totalQuantity: member.quantity * quantity,
    })),
    connectorPlates: singleTruss.connectorPlates.map(plate => ({
      ...plate,
      totalQuantity: plate.quantity * quantity,
    })),
    totalVolume_m3: singleTruss.summary.materialVolume_m3 * quantity,
  };
}
