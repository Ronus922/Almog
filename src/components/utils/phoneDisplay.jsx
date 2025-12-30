/**
 * Phone Display Utilities
 * לוגיקת בחירת טלפון להצגה בטבלה
 */

/**
 * בודק אם ערך טלפון תקין
 */
function isValidPhone(phone) {
  if (!phone) return false;
  
  const cleaned = String(phone).trim();
  
  // ריק או whitespace
  if (cleaned === '') return false;
  
  // רק אפסים
  if (/^0+$/.test(cleaned.replace(/\D/g, ''))) return false;
  
  // ערכים שליליים
  if (cleaned === '-' || cleaned === '—' || cleaned.toLowerCase() === 'אין מספר') return false;
  
  return true;
}

/**
 * מחזיר טלפון להצגה בטבלה לפי כללי Fallback
 * @param {object} record - רשומת חייב
 * @returns {string} טלפון להצגה או ריק
 */
export function getPhoneForTable(record) {
  // 1. נסה phonePrimary (phoneDisplay)
  if (isValidPhone(record.phonePrimary)) {
    return record.phonePrimary.trim();
  }
  
  // 2. נסה phoneOwner
  if (isValidPhone(record.phoneOwner)) {
    return record.phoneOwner.trim();
  }
  
  // 3. ריק
  return '';
}

/**
 * פורמט טלפון להצגה
 */
export function formatPhoneForDisplay(phone) {
  if (!phone) return '—';
  return phone;
}