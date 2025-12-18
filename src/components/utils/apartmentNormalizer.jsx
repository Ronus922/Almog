/**
 * Canonical Apartment Number Normalization
 * 
 * Single source of truth for apartmentNumber formatting across the entire system.
 * Applied consistently in: Import, Upsert, API filtering, and grouping.
 */

/**
 * Normalize apartment number to canonical format
 * @param {any} apartmentNumber - Raw apartment number (string, number, etc.)
 * @returns {string} - Normalized apartment number
 * 
 * Rules:
 * 1. Convert to string
 * 2. Trim whitespace
 * 3. Remove .0 suffix (from Excel numbers)
 * 4. Remove all non-digit characters
 * 5. Remove leading zeros
 * 6. Return as canonical string
 * 
 * Examples:
 * - "  1234  " -> "1234"
 * - "1234.0" -> "1234"
 * - "0001234" -> "1234"
 * - "12-34" -> "1234"
 * - "12 34" -> "1234"
 * - 1234 -> "1234"
 */
export function normalizeApartmentNumber(apartmentNumber) {
  if (apartmentNumber === null || apartmentNumber === undefined) return '';
  
  // 1. Convert to string
  let normalized = String(apartmentNumber);
  
  // 2. Trim
  normalized = normalized.trim();
  
  // 3. Remove .0 suffix
  if (normalized.endsWith('.0')) {
    normalized = normalized.slice(0, -2);
  }
  
  // 4. Remove all non-digit characters
  normalized = normalized.replace(/\D/g, '');
  
  // 5. Remove leading zeros (except for "0" itself)
  if (normalized.length > 0) {
    normalized = normalized.replace(/^0+/, '') || '0';
  }
  
  // 6. Return canonical string
  return normalized;
}