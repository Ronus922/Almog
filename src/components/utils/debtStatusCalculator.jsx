/**
 * Debt Status Calculator
 * מחשבון מרכזי לסטטוס חוב - Single Source of Truth
 */

/**
 * מחשב debt_status_auto לפי totalDebt והספים
 * @param {number} totalDebt - סך החוב
 * @param {object} settings - הגדרות ספים
 * @param {boolean} isArchived - האם הרשומה בארכיון
 * @returns {string} 'תקין' | 'לגבייה מיידית' | 'חריגה מופרזת'
 */
export function calculateDebtStatus(totalDebt, settings, isArchived = false) {
  // רשומות בארכיון - תמיד תקין (לא מוצגות בדשבורד הראשי)
  if (isArchived) {
    return 'תקין';
  }

  const debt = totalDebt || 0;
  const legalThreshold = settings?.threshold_legal_from || 5000;
  const collectThreshold = settings?.threshold_collect_from || 1500;

  if (debt >= legalThreshold) {
    return 'חריגה מופרזת';
  } else if (debt >= collectThreshold) {
    return 'לגבייה מיידית';
  } else {
    return 'תקין';
  }
}

/**
 * מעדכן debt_status_auto לרשומה בודדת אם צריך
 * @param {object} record - רשומת חייב
 * @param {object} settings - הגדרות ספים
 * @returns {object|null} אובייקט עדכון או null אם אין צורך בעדכון
 */
export function getStatusUpdateIfNeeded(record, settings) {
  const newStatus = calculateDebtStatus(record.totalDebt, settings, record.isArchived);
  
  if (record.debt_status_auto !== newStatus) {
    return { debt_status_auto: newStatus };
  }
  
  return null;
}