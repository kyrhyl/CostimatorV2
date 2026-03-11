/**
 * Rounding Utilities
 * Standardized rounding functions following DPWH computation standards
 */

/**
 * Round a number to specified decimal places
 * 
 * @param value - Number to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded number
 * 
 * @example
 * round(123.456, 2);  // 123.46
 * round(123.456, 0);  // 123
 * round(123.456, 3);  // 123.456
 */
export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Round to 2 decimal places (standard for currency)
 * 
 * @param value - Number to round
 * @returns Rounded number
 * 
 * @example
 * roundTo2Decimals(123.456);  // 123.46
 */
export function roundTo2Decimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Round to 4 decimal places (for precise calculations)
 * 
 * @param value - Number to round
 * @returns Rounded number
 * 
 * @example
 * roundTo4Decimals(123.456789);  // 123.4568
 */
export function roundTo4Decimals(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * Round up to specified decimal places (ceiling)
 * 
 * @param value - Number to round up
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded up number
 * 
 * @example
 * roundUp(123.451, 2);  // 123.46
 * roundUp(123.001, 0);  // 124
 */
export function roundUp(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.ceil(value * factor) / factor;
}

/**
 * Round down to specified decimal places (floor)
 * 
 * @param value - Number to round down
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded down number
 * 
 * @example
 * roundDown(123.459, 2);  // 123.45
 * roundDown(123.999, 0);  // 123
 */
export function roundDown(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.floor(value * factor) / factor;
}

/**
 * Round to nearest specified value
 * Useful for rounding to nearest 5, 10, 100, etc.
 * 
 * @param value - Number to round
 * @param nearest - Value to round to
 * @returns Rounded number
 * 
 * @example
 * roundToNearest(123, 5);    // 125
 * roundToNearest(123, 10);   // 120
 * roundToNearest(123, 100);  // 100
 */
export function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}

/**
 * Round up to nearest specified value (ceiling)
 * 
 * @param value - Number to round up
 * @param nearest - Value to round to
 * @returns Rounded up number
 * 
 * @example
 * roundUpToNearest(121, 5);   // 125
 * roundUpToNearest(101, 10);  // 110
 */
export function roundUpToNearest(value: number, nearest: number): number {
  return Math.ceil(value / nearest) * nearest;
}

/**
 * Round down to nearest specified value (floor)
 * 
 * @param value - Number to round down
 * @param nearest - Value to round to
 * @returns Rounded down number
 * 
 * @example
 * roundDownToNearest(129, 5);   // 125
 * roundDownToNearest(199, 10);  // 190
 */
export function roundDownToNearest(value: number, nearest: number): number {
  return Math.floor(value / nearest) * nearest;
}

/**
 * Check if two numbers are equal within a tolerance
 * Useful for floating-point comparisons
 * 
 * @param a - First number
 * @param b - Second number
 * @param tolerance - Allowed difference (default: 0.01)
 * @returns True if numbers are equal within tolerance
 * 
 * @example
 * areEqual(123.456, 123.457, 0.01);  // true
 * areEqual(123.4, 123.5, 0.01);      // false
 */
export function areEqual(a: number, b: number, tolerance: number = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}

/**
 * Banker's rounding (round half to even)
 * More accurate for large datasets, reduces cumulative rounding errors
 * 
 * @param value - Number to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded number
 * 
 * @example
 * bankersRound(2.5, 0);   // 2 (round to even)
 * bankersRound(3.5, 0);   // 4 (round to even)
 */
export function bankersRound(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  const shifted = value * factor;
  const floor = Math.floor(shifted);
  const fraction = shifted - floor;
  
  if (fraction === 0.5) {
    // Round to even
    return (floor % 2 === 0 ? floor : floor + 1) / factor;
  }
  
  return Math.round(shifted) / factor;
}

/**
 * Ensure a number is within a specified range
 * 
 * @param value - Number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped number
 * 
 * @example
 * clamp(150, 0, 100);  // 100
 * clamp(-10, 0, 100);  // 0
 * clamp(50, 0, 100);   // 50
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
