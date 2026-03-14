/**
 * Phone Display Utilities
 * לוגיקת בחירת טלפון להצגה בטבלה
 */

/**
 * ניקוי ערך טלפון - מחזיר null אם לא תקין
 */
export function normalizePhone(v) {
  if (v === null || v === undefined) return null;
  
  const s = String(v).trim();
  
  // ריק
  if (s === '') return null;
  
  // ערכים לא תקינים
  if (s === '—' || s === '-') return null;
  
  // רק אפסים
  const digits = s.replace(/\D/g, '');
  if (digits === '0' || digits === '000000000' || /^0+$/.test(digits)) return null;
  
  return s;
}

/**
 * מחזיר טלפון להצגה בטבלה לפי כללי Fallback
 * @param {object} record - רשומת חייב
 * @returns {string} טלפון להצגה
 */
export function getPhonePrimaryForTable(record) {
  // phoneOwner → phoneTenant
  return normalizePhone(record.phoneOwner) ?? normalizePhone(record.phoneTenant) ?? null;
}

/**
 * פורמט טלפון להצגה
 */
export function formatPhoneForDisplay(phone) {
  if (!phone) return '—';
  return phone;
}