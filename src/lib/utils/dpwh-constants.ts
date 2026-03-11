/**
 * DPWH constants for Part and Division mappings
 * Used across Program of Works forms
 */

// ============================================================================
// Part Descriptions
// ============================================================================

export const PART_DESCRIPTIONS: Record<string, string> = {
  'PART A': 'GENERAL',
  'PART B': 'OTHER GENERAL REQUIREMENTS',
  'PART C': 'EARTHWORK',
  'PART D': 'REINFORCED CONCRETE / BUILDINGS',
  'PART E': 'FINISHINGS AND OTHER CIVIL WORKS',
  'PART F': 'ELECTRICAL',
  'PART G': 'MECHANICAL',
  'PART H': 'Water Supply',
  'PART I': 'Pipe Lines (Water Distribution)',
  'PART J': 'Sewerage',
  'PART K': 'Bridge',
  'PART L': 'FLOOD AND RIVER CONTROL AND DRAINAGE',
};

// ============================================================================
// Division Mappings
// ============================================================================

export const DIVISION_MAP: Record<string, string> = {
  'PART A': 'DIVISION I',
  'PART B': 'DIVISION I',
  'PART C': 'DIVISION I',
  'PART D': 'DIVISION I',
  'PART E': 'DIVISION II',
  'PART F': 'DIVISION II',
  'PART G': 'DIVISION II',
  'PART H': 'DIVISION III',
  'PART I': 'DIVISION III',
  'PART J': 'DIVISION III',
  'PART K': 'DIVISION IV',
  'PART L': 'DIVISION V',
};

export const DIVISION_NAMES: Record<string, string> = {
  'DIVISION I': 'General',
  'DIVISION II': 'Buildings',
  'DIVISION III': 'Water Supply and Sewerage',
  'DIVISION IV': 'Bridges',
  'DIVISION V': 'Flood Control',
};

// ============================================================================
// Part Order for Sorting
// ============================================================================

export const PART_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export const PART_PREFIX_MAP: Record<string, string> = {
  '1': 'PART A',
  '2': 'PART B',
  '3': 'PART C',
  '4': 'PART D',
  '5': 'PART E',
  '6': 'PART F',
  '7': 'PART G',
  '8': 'PART H',
  '9': 'PART I',
};

// ============================================================================
// Form Constants
// ============================================================================

export const FORM_VERSIONS = {
  '13-10': 'DPWH-QMSP-13-10 Rev.00',
  '13-11': 'DPWH-QMSP-13-11 Rev.00',
  '13-13': 'DPWH-QMSP-13-13 Rev.00',
  '13-14': 'DPWH-QMSP-13-14 Rev.00',
  '13-15': 'DPWH-QMSP-13-15 Rev.00',
  '13-16': 'DPWH-QMSP-13-16 Rev.00',
} as const;

export const FORM_TITLES = {
  '13-10': 'PROGRAM OF WORKS/BUDGET COST',
  '13-11': 'ITEMIZED BREAKDOWN',
  '13-13': 'Detailed Breakdown of Component for Each Item',
  '13-14': 'SUMMARY OF APPROVED BUDGET FOR THE CONTRACT',
  '13-15': 'APPROVED BUDGET FOR THE CONTRACT',
  '13-16': 'DETAILED UNIT PRICE ANALYSIS',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get division name for a given division code
 */
export function getDivisionName(division: string): string {
  return DIVISION_NAMES[division] || '';
}

/**
 * Get division for a given part
 */
export function getDivisionForPart(part: string): string {
  return DIVISION_MAP[part] || '';
}

/**
 * Get description for a given part
 */
export function getPartDescription(part: string): string {
  return PART_DESCRIPTIONS[part] || 'Other Works';
}

/**
 * Normalize part string to standard format
 */
export function normalizePart(part?: string): string {
  const raw = (part || 'C').toString().trim().toUpperCase();
  if (raw.startsWith('PART ')) return raw;
  if (raw.startsWith('PART') && raw.length === 5) return `PART ${raw.slice(-1)}`;
  if (raw.length === 1) return `PART ${raw}`;
  return `PART ${raw}`;
}

export function derivePartLabel(part?: string, payItemNumber?: string): string {
  if (part && part.trim()) {
    return normalizePart(part);
  }
  if (!payItemNumber) {
    return 'PART C';
  }
  const digits = payItemNumber.replace(/[^0-9]/g, '');
  const firstDigit = digits.charAt(0);
  return normalizePart(PART_PREFIX_MAP[firstDigit] || 'PART C');
}
