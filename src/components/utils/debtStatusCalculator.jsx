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
 * מחזיר את שם הסטטוס המומלץ (לא ה-ID)
 */
export function calculateDebtStatus(totalDebt, settings, isArchived = false) {
  // NOTE: isArchived does NOT affect status. Archive is a tab/filter only.

  const validation = validateThresholds(settings);
  if (!validation.valid) {
    console.error('[debtStatusCalculator] Thresholds invalid:', validation.error);
    return 'תקין'; // fallback
  }

  const { collectFrom, legalFrom } = validation.thresholds;

  // חשוב: אל תשתמש ב-"totalDebt || 0" כי 0 תקין אבל גם NaN/undefined צריך טיפול ברור
  const tdNum = Number(String(totalDebt ?? '').replace(/[^\d.]/g, ''));
  const td = Number.isFinite(tdNum) ? tdNum : 0;

  if (td >= legalFrom) return 'חריגה מופרזת';
  if (td >= collectFrom) return 'לגבייה מיידית';
  return 'תקין';
}

/**
 * מחזיר את ה-ID של הסטטוס המשפטי המתאים לפי סכום החוב
 * @param {number} totalDebt - סכום החוב הכולל
 * @param {object} settings - הגדרות הספים
 * @param {array} legalStatuses - רשימת כל הסטטוסים המשפטיים
 * @returns {string|null} - ID של הסטטוס המשפטי המתאים, או null אם לא נמצא
 */
export function calculateLegalStatusId(totalDebt, settings, legalStatuses) {
  if (!legalStatuses || legalStatuses.length === 0) {
    console.warn('[debtStatusCalculator] No legal statuses provided');
    return null;
  }

  const debtStatus = calculateDebtStatus(totalDebt, settings);
  
  // מיפוי סטטוס חוב לשם סטטוס משפטי
  const statusNameMap = {
    'תקין': 'תקין',
    'לגבייה מיידית': 'לגבייה מיידית',
    'חריגה מופרזת': 'חריגה מופרזת'
  };

  const targetStatusName = statusNameMap[debtStatus];
  
  // חיפוש הסטטוס המתאים ברשימה
  const matchingStatus = legalStatuses.find(s => 
    s.type === 'LEGAL' && 
    s.is_active === true && 
    s.name === targetStatusName
  );

  if (matchingStatus) {
    return matchingStatus.id;
  }

  // אם לא נמצא - נחפש את ברירת המחדל
  const defaultStatus = legalStatuses.find(s => s.type === 'LEGAL' && s.is_default === true);
  if (defaultStatus) {
    console.warn(`[debtStatusCalculator] Status "${targetStatusName}" not found, using default: ${defaultStatus.name}`);
    return defaultStatus.id;
  }

  console.warn('[debtStatusCalculator] No matching or default legal status found');
  return null;
}

/**
 * מחשב debug string עם פירוט הספים והסטטוס
 */
export function calculateDebtStatusDebug(totalDebt, settings, isArchived = false) {
  const validation = validateThresholds(settings);
  const td = totalDebt || 0;
  
  if (!validation.valid) {
    return `ERROR: ${validation.error}`;
  }

  const { okMax, collectFrom, legalFrom } = validation.thresholds;
  const status = calculateDebtStatus(totalDebt, settings);
  
  return `td=${td} | okMax=${okMax} | collectFrom=${collectFrom} | legalFrom=${legalFrom} | result=${status}`;
}

/**
 * בודק אם יש צורך לעדכן סטטוס חוב
 * מחזיר אובייקט עדכון או null
 */
export function shouldUpdateDebtStatus(record, settings) {
  const currentStatus = record.debt_status_auto || 'תקין';
  const calculatedStatus = calculateDebtStatus(record.totalDebt, settings);

  if (currentStatus !== calculatedStatus) {
    return {
      debt_status_auto: calculatedStatus
    };
  }

  return null;
}