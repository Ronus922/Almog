/**
 * ImportProtectionRules.js
 * 
 * הגנה קשיחה על יבוא אקסל למודול דירות/אנשי קשר
 * יעבוד רק ב-MERGE (לא REPLACE), מגן על שדות רגישים
 */

// ═══════════════════════════════════════════════════════════
// WHITELIST: שדות מורשים לעדכון מיבוא בלבד
// ═══════════════════════════════════════════════════════════
export const ALLOWED_UPDATE_FIELDS = {
  // שדות בסיסיים מיבוא אקסל
  apartment_number: true,    // מפתח זיהוי - רק יצירה
  owner_name: true,          // מורשה לעדכון
  tenant_name: true,         // מורשה לעדכון
  management_fees: true,     // מורשה לעדכון
  address: true,             // מורשה לעדכון
  
  // שדות חישוביים (אקסל -> DebtorRecord)
  totalDebt: true,           // מחושב מאקסל
  monthlyDebt: true,         // מחושב מאקסל
  specialDebt: true,         // מחושב מאקסל
  detailsMonthly: true,      // מאקסל
  managementMonthsRaw: true, // מאקסל (רק אם ריק)
  debt_status_auto: true,    // מחושב אוטומטי
  
  // עדכון מערכת
  importedThisRun: true,
  lastImportRunId: true,
  lastImportAt: true,
  flaggedAsCleared: true,
  clearedAt: true
};

// ═══════════════════════════════════════════════════════════
// BLACKLIST: שדות מוגנים שאסור לדרוס מיבוא
// ═══════════════════════════════════════════════════════════
export const PROTECTED_FIELDS = {
  // שדות Operator (ניהול מפעיל)
  operator_id: true,
  
  // פרטי קשר ידניים (אסור לדרוס)
  owner_phone: true,
  owner_email: true,
  tenant_phone: true,
  tenant_email: true,
  phonesRaw: true,
  phoneOwner: true,
  phoneTenant: true,
  phonePrimary: true,
  phonesManualOverride: true,
  
  // סימוני אנשי קשר ראשיים (אסור לדרוס)
  owner_is_primary_contact: true,
  tenant_is_primary_contact: true,
  operator_is_primary_contact: true,
  contact_type: true,
  resident_type: true,
  
  // נתונים ידניים/הערות (אסור לדרוס)
  notes: true,
  tags: true,
  
  // פרטי WhatsApp Sync (אסור לדרוס)
  whatsapp_profile_image: true,
  whatsapp_profile_image_url: true,
  whatsapp_profile_sync_status: true,
  whatsapp_profile_last_synced_at: true,
  whatsapp_profile_sync_error: true,
  last_whatsapp_sent_at: true,
  
  // פרטי Audit / System (אסור לדרוס)
  notes: true,
  lastContactDate: true,
  nextActionDate: true,
  
  // פרטי סטטוס משפטי (אסור לדרוס אם נעול/דרוס)
  legal_status_id: true,      // מחמיר: לא להחליף בשום אקסל
  legal_status_overridden: true,
  legal_status_lock: true,
  legal_status_updated_at: true,
  legal_status_updated_by: true,
  legal_status_source: true,
  legal_status_manual: true,
  
  // מטא נתונים (אסור לדרוס)
  isArchived: true,
  id: true,
  created_date: true,
  updated_date: true,
  created_by: true
};

// ═══════════════════════════════════════════════════════════
// VALIDATION: בדיקות על שדות ערך ריק
// ═══════════════════════════════════════════════════════════

/**
 * בדוק אם ערך "ריק" לפי לוגיקת היבוא
 */
export const isEmpty = (val) => {
  if (val === null || val === undefined || val === '') return true;
  const str = String(val).trim();
  return str === '' || 
         str === 'אין מספר' || 
         str === '-' || 
         str === 'לא ידוע' || 
         /^0+$/.test(str);
};

// ═══════════════════════════════════════════════════════════
// MERGE LOGIC: בנה patch בטוח
// ═══════════════════════════════════════════════════════════

/**
 * בנה patch עדכון בטוח - רק שדות מורשים, אל תדרוס ערכים קיימים ריקים
 * 
 * @param {Object} excelData - נתונים מאקסל (לאחר עיבוד)
 * @param {Object} existingRecord - הרשומה הקיימת במערכת
 * @param {string} importRunId - מזהה ריצת היבוא
 * @param {string} importTimestamp - זמן היבוא
 * @returns {Object} patch בטוח לעדכון
 */
export const buildSafePatch = (
  excelData,
  existingRecord,
  importRunId,
  importTimestamp
) => {
  const patch = {};
  
  // עדכן רק שדות מורשים
  for (const field of Object.keys(ALLOWED_UPDATE_FIELDS)) {
    if (field === 'apartment_number') {
      // apartment_number - לא משנים קיים
      continue;
    }
    
    if (!(field in excelData)) {
      // לא בנתוני אקסל - skip
      continue;
    }
    
    const excelValue = excelData[field];
    const existingValue = existingRecord?.[field];
    
    // כלל ראשון: ערך קיים גובר על ריק באקסל
    if (!isEmpty(existingValue) && isEmpty(excelValue)) {
      patch[field] = existingValue; // שמור ערך קיים
      continue;
    }
    
    // אחרת: עדכן בערך מאקסל
    patch[field] = excelValue;
  }
  
  // עדכונים חובה למערכת
  patch.importedThisRun = true;
  patch.lastImportRunId = importRunId;
  patch.lastImportAt = importTimestamp;
  patch.flaggedAsCleared = false;
  patch.clearedAt = null;
  
  return patch;
};

/**
 * בדוק אם patch מכיל שדה מוגן (הגנה כפולה)
 */
export const hasProtectedFields = (patch) => {
  return Object.keys(patch).some(field => PROTECTED_FIELDS[field]);
};

/**
 * סנן patch: הסר שדות מוגנים (בטיחות כפולה)
 */
export const filterProtectedFields = (patch) => {
  const safe = { ...patch };
  for (const field of Object.keys(PROTECTED_FIELDS)) {
    delete safe[field];
  }
  return safe;
};

// ═══════════════════════════════════════════════════════════
// PREVIEW: הצגת preview לפני אישור
// ═══════════════════════════════════════════════════════════

/**
 * בנה preview של היבוא
 */
export const buildImportPreview = (
  createsQueue,
  updatesQueue,
  warnings
) => {
  return {
    willCreate: createsQueue.length,
    willUpdate: updatesQueue.length,
    willSkip: warnings.length,
    fieldsToUpdate: ALLOWED_UPDATE_FIELDS,
    protectedFields: PROTECTED_FIELDS,
    willNotUpdate: Object.keys(PROTECTED_FIELDS),
    summary: {
      createText: `יוצר ${createsQueue.length} דירות חדשות`,
      updateText: `מעדכן ${updatesQueue.length} דירות קיימות`,
      skipText: `דלג ${warnings.length} שורות`,
      protectedText: `מגן על ${Object.keys(PROTECTED_FIELDS).length} שדות`
    }
  };
};

// ═══════════════════════════════════════════════════════════
// IMPORT LOG: תיעוד היבוא
// ═══════════════════════════════════════════════════════════

export const createImportLog = (
  importRunId,
  uploader,
  uploadTime,
  createdCount,
  updatedCount,
  skippedCount,
  fieldsUpdated
) => {
  return {
    importRunId,
    uploadedBy: uploader,
    uploadedAt: uploadTime,
    recordsCreated: createdCount,
    recordsUpdated: updatedCount,
    recordsSkipped: skippedCount,
    fieldsUpdated: Object.keys(fieldsUpdated).filter(f => fieldsUpdated[f]),
    protectedFields: Object.keys(PROTECTED_FIELDS),
    protectionMode: 'MERGE_ONLY',
    timestamp: new Date().toISOString()
  };
};

// ═══════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════

export default {
  ALLOWED_UPDATE_FIELDS,
  PROTECTED_FIELDS,
  isEmpty,
  buildSafePatch,
  hasProtectedFields,
  filterProtectedFields,
  buildImportPreview,
  createImportLog
};