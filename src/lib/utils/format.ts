/**
 * Formatting Utilities
 * Common formatting functions for currency, numbers, dates, etc.
 */

/**
 * Format a number as Philippine Peso currency
 * 
 * @param amount - Amount to format
 * @param includeSymbol - Include ₱ symbol (default: true)
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1234.56);     // "₱1,234.56"
 * formatCurrency(1000000);     // "₱1,000,000.00"
 * formatCurrency(123.4, false); // "123.40"
 */
export function formatCurrency(amount: number, includeSymbol: boolean = true): string {
  const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return includeSymbol ? `₱${formatted}` : formatted;
}

/**
 * Format a number with thousands separator
 * 
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1234.567);      // "1,234.57"
 * formatNumber(1000000, 0);    // "1,000,000"
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format a number as percentage
 * 
 * @param value - Value to format (0-100 or 0-1)
 * @param asDecimal - If true, expects 0-1 range (default: false)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 * 
 * @example
 * formatPercent(15.5);           // "15.50%"
 * formatPercent(0.155, true);    // "15.50%"
 * formatPercent(12.3456, false, 1); // "12.3%"
 */
export function formatPercent(
  value: number,
  asDecimal: boolean = false,
  decimals: number = 2
): string {
  const percent = asDecimal ? value * 100 : value;
  return `${percent.toFixed(decimals)}%`;
}

/**
 * Format a date as YYYY-MM-DD
 * 
 * @param date - Date to format
 * @returns Formatted date string
 * 
 * @example
 * formatDate(new Date('2025-12-16')); // "2025-12-16"
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a date as human-readable string
 * 
 * @param date - Date to format
 * @returns Formatted date string
 * 
 * @example
 * formatDateHuman(new Date('2025-12-16')); // "December 16, 2025"
 */
export function formatDateHuman(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format unit of measurement (abbreviate common units)
 * 
 * @param unit - Unit to format
 * @returns Formatted unit
 * 
 * @example
 * formatUnit('cubic meter');  // "cu.m."
 * formatUnit('kilogram');     // "kg"
 */
export function formatUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    'cubic meter': 'cu.m.',
    'cubic meters': 'cu.m.',
    'square meter': 'sq.m.',
    'square meters': 'sq.m.',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'lump sum': 'l.s.',
    'piece': 'pc',
    'pieces': 'pcs',
    'bag': 'bag',
    'bags': 'bags'
  };
  
  return unitMap[unit.toLowerCase()] || unit;
}

/**
 * Parse currency string to number
 * Removes currency symbol and commas
 * 
 * @param currencyString - Currency string to parse
 * @returns Numeric value
 * 
 * @example
 * parseCurrency("₱1,234.56"); // 1234.56
 * parseCurrency("1,000");     // 1000
 */
export function parseCurrency(currencyString: string): number {
  const cleaned = currencyString.replace(/[₱,\s]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Truncate text with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 * 
 * @example
 * truncateText("Very long description", 10); // "Very long..."
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format file size in human-readable format
 * 
 * @param bytes - Size in bytes
 * @returns Formatted size string
 * 
 * @example
 * formatFileSize(1024);        // "1.00 KB"
 * formatFileSize(1048576);     // "1.00 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
