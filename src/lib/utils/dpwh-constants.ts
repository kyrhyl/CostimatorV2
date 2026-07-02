/**
 * DPWH constants for Part and Division mappings
 * Used across Program of Works forms
 */

// ============================================================================
// Part Descriptions
// ============================================================================

export const PART_DESCRIPTIONS: Record<string, string> = {
  'PART A': 'FACILITIES FOR THE ENGINEER',
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

const DESCRIPTION_TO_PART = Object.entries(PART_DESCRIPTIONS).reduce<Record<string, string>>((acc, [part, description]) => {
  acc[description.toUpperCase()] = part;
  return acc;
}, {});

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
  return DIVISION_MAP[getPartKey(part)] || '';
}

/**
 * Get description for a given part
 */
export function getPartDescription(part: string): string {
  return PART_DESCRIPTIONS[getPartKey(part)] || 'Other Works';
}

/**
 * Extract canonical part key such as "PART E"
 */
export function getPartKey(part?: string): string {
  const raw = String(part || '').trim().toUpperCase();
  if (!raw) {
    return '';
  }

  const directMatch = raw.match(/^PART\s+([A-Z])/);
  if (directMatch) {
    return `PART ${directMatch[1]}`;
  }

  const compactMatch = raw.match(/^PART([A-Z])$/);
  if (compactMatch) {
    return `PART ${compactMatch[1]}`;
  }

  if (/^[A-Z]$/.test(raw)) {
    return `PART ${raw}`;
  }

  return DESCRIPTION_TO_PART[raw] || '';
}

/**
 * Normalize part label to the Pay Item source-of-truth format
 * Example: "PART E" -> "PART E: FINISHINGS AND OTHER CIVIL WORKS"
 */
export function normalizePart(part?: string): string {
  const key = getPartKey(part);
  if (!key) {
    return '';
  }

  const description = PART_DESCRIPTIONS[key];
  return description ? `${key}: ${description}` : key;
}

export function derivePartLabel(part?: string): string {
  return normalizePart(part);
}

/**
 * Infer the DPWH part from a pay item number prefix.
 * Returns the full normalized part string (e.g. "PART B: OTHER GENERAL REQUIREMENTS")
 * or null if the item number doesn't map to an inferred part.
 *
 * Currently handles: B prefix -> PART B
 */
export function inferPartFromPayItemNumber(payItemNumber: string): string | null {
  const trimmed = String(payItemNumber || '').trim().toUpperCase();
  if (/^B\b/.test(trimmed)) {
    return normalizePart('PART B');
  }
  return null;
}
