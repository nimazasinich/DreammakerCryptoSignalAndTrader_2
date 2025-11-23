/**
 * Safe numeric formatting utility
 * Guards against runtime crashes from calling .toFixed() on undefined/null/NaN values
 */

/**
 * Format a number to a fixed number of decimal places
 * Returns '—' (em dash) for invalid numbers
 * @param v - The value to format
 * @param d - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export const fmt = (v: number | undefined | null, d = 2): string =>
  Number.isFinite(v as number) ? (v as number).toFixed(d) : '—';
