/**
 * Sorting utilities for Program of Works data
 */

import { PART_ORDER } from './dpwh-constants';

// ============================================================================
// Generic Sort Functions
// ============================================================================

/**
 * Sort items by part order (A, B, C, D, etc.)
 * Generic function that works with any object containing a 'part' property
 */
export function sortByPart<T extends { part: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aOrder = PART_ORDER.indexOf(a.part.replace('PART ', ''));
    const bOrder = PART_ORDER.indexOf(b.part.replace('PART ', ''));
    if (aOrder !== -1 && bOrder !== -1) return aOrder - bOrder;
    return a.part.localeCompare(b.part);
  });
}

/**
 * Sort items by part and then by item number
 */
export function sortByPartAndItemNumber<T extends { part: string; itemNumber?: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    // First sort by part
    const aPartOrder = PART_ORDER.indexOf(a.part.replace('PART ', ''));
    const bPartOrder = PART_ORDER.indexOf(b.part.replace('PART ', ''));
    
    if (aPartOrder !== bPartOrder) {
      if (aPartOrder === -1) return 1;
      if (bPartOrder === -1) return -1;
      return aPartOrder - bPartOrder;
    }
    
    // Then sort by item number if available
    if (a.itemNumber && b.itemNumber) {
      return a.itemNumber.localeCompare(b.itemNumber);
    }
    
    return 0;
  });
}

// ============================================================================
// Comparison Helpers
// ============================================================================

/**
 * Compare two parts for sorting
 * Returns negative if a comes before b, positive if b comes before a
 */
export function compareParts(partA: string, partB: string): number {
  const orderA = PART_ORDER.indexOf(partA.replace('PART ', ''));
  const orderB = PART_ORDER.indexOf(partB.replace('PART ', ''));
  
  if (orderA !== -1 && orderB !== -1) {
    return orderA - orderB;
  }
  
  // If one is not in the standard order, sort it to the end
  if (orderA === -1 && orderB === -1) {
    return partA.localeCompare(partB);
  }
  
  return orderA === -1 ? 1 : -1;
}

// ============================================================================
// Array Helpers
// ============================================================================

/**
 * Group items by a key and maintain part order within groups
 */
export function groupAndSortByPart<T extends { part: string }>(
  items: T[],
  groupKey: keyof T
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  
  // Group items
  items.forEach((item) => {
    const key = String(item[groupKey]);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  });
  
  // Sort each group by part
  groups.forEach((groupItems) => {
    groupItems.sort((a, b) => compareParts(a.part, b.part));
  });
  
  return groups;
}
