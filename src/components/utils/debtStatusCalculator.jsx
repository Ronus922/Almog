/**
 * Debt Status Calculator - Dynamic & Validated
 * מחשבון סטטוס חוב דינמי - מקור אמת יחיד
 */

/**
 * ממיר ערך לספרתי תקין
 */
function toNum(x) {
  const cleaned = String(x ?? '').replace(/[^\d.]/g, '');
  return Number(cleaned);
}

/**
 * מאמת שהספים מ-Settings תקינים והגיוניים
 * @returns {object} { valid: boolean, error?: string, thresholds?: object }
 */
export function validateThresholds(settings) {
  if (!settings) {
    return { valid: false, error: 'הגדרות חסרות' };
  }

  const okMax = toNum(settings.threshold_ok_max);
  const collectFrom = toNum(settings.threshold_collect_from);
  const legalFrom = toNum(settings.threshold_legal_from);

  // בדיקת NaN
  if (isNaN(okMax) || isNaN(collectFrom) || isNaN(legalFrom)) {
    return { 
      valid: false, 
      error: 'ערכי ספים לא תקינים - נא להזין מספרים בלבד' 
    };
  }

  // בדיקת הגיון: okMax < collectFrom <= legalFrom
  if (!(okMax < collectFrom && collectFrom <= legalFrom)) {
    return { 
      valid: false, 
      error: `הגיון ספים שגוי: תקין (${okMax}) < גבייה (${collectFrom}) ≤ משפטי (${legalFrom})` 
    };
  }

  return { 
    valid: true, 
    thresholds: { okMax, collectFrom, legalFrom } 
  };
}

/**
 * מחשב סטטוס חוב אוטומטי - דינמי לפי Settings
 */
export function calculateDebtStatus(totalDebt, settings, isArchived = false) {
  // רשומות בארכיון - סטטוס מיוחד
  if (isArchived) {
    return 'בארכיון';
  }

  const validation = validateThresholds(settings);
  if (!validation.valid) {
    console.error('[debtStatusCalculator] Thresholds invalid:', validation.error);
    return 'תקין'; // fallback
  }

  const { okMax, collectFrom, legalFrom } = validation.thresholds;
  const td = totalDebt || 0;

  if (td >= legalFrom) return 'חריגה מופרזת';
  if (td >= collectFrom) return 'לגבייה מיידית';
  return 'תקין';
}

/**
 * מחשב debug string עם פירוט הספים והסטטוס
 */
export function calculateDebtStatusDebug(totalDebt, settings, isArchived = false) {
  const td = totalDebt || 0;
  
  if (isArchived) {
    return `td=${td} | isArchived=true | result=בארכיון`;
  }
  
  const validation = validateThresholds(settings);
  if (!validation.valid) {
    return `ERROR: ${validation.error}`;
  }

  const { okMax, collectFrom, legalFrom } = validation.thresholds;
  const status = calculateDebtStatus(totalDebt, settings, isArchived);
  
  return `td=${td} | okMax=${okMax} | collectFrom=${collectFrom} | legalFrom=${legalFrom} | result=${status}`;
}

/**
 * בודק אם יש צורך לעדכן סטטוס חוב
 * מחזיר אובייקט עדכון או null
 */
export function shouldUpdateDebtStatus(record, settings) {
  const currentStatus = record.debt_status_auto || 'תקין';
  const calculatedStatus = calculateDebtStatus(record.totalDebt, settings, record.isArchived);

  if (currentStatus !== calculatedStatus) {
    return {
      debt_status_auto: calculatedStatus
    };
  }

  return null;
}