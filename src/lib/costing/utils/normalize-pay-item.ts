/**
 * Normalize pay item number for consistent matching
 * Handles spacing variations: "900 (1) c" vs "900 (1)c"
 */
export function normalizePayItemNumber(payItemNumber: string): string {
  return payItemNumber
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+\./g, '.');
}

/**
 * Check if two pay item numbers match (exact or normalized)
 */
export function payItemsMatch(payItem1: string, payItem2: string): boolean {
  return normalizePayItemNumber(payItem1) === normalizePayItemNumber(payItem2);
}
