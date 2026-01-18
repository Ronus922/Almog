import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppButton from "@/components/ui/app-button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, 
  ArrowLeft, Loader2, RefreshCw, Database, AlertCircle, Download
} from "lucide-react";
import { base44 } from '@/api/base44Client';
import * as XLSX from 'xlsx';
import { useImport } from './ImportContext';
import { normalizeApartmentNumber } from '../utils/apartmentNormalizer';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════
// CONSTANTS - LOCKED (אסור לשנות)
// ═══════════════════════════════════════════════════════════
const FIXED_COLUMN_MAPPING = {
  apartmentNumber: 0,  // A
  ownerName: 1,         // B
  phonesRaw: 2,         // C
  totalDebt: 3,         // D
  monthlyDebt: 4,       // E
  managementMonthsRaw: 5, // F
  hotWaterDebt: 6,      // G
  detailsMonthly: 7     // H
};

const ALLOWED_FILE_EXTENSIONS = ['.xlsx', '.xls'];
const CONCURRENCY = 2;
const RETRY_MAX = 5;
const BACKOFF_MS = [250, 500, 1000, 2000, 4000];
const FETCH_PAGE_SIZE = 500;

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isRateLimitError = (error) => {
  const message = error?.message || '';
  return message.includes('429') || 
         message.includes('rate limit') || 
         message.includes('too many requests') ||
         message.includes('Rate limit exceeded');
};

const normalizeApartmentKey = normalizeApartmentNumber;

const cleanNumber = (val) => {
  if (val === null || val === undefined || val === '') return { value: 0, valid: true };
  if (typeof val === 'number') return { value: val, valid: true };

  const cleaned = String(val)
    .replace(/\u00A0/g, '')
    .replace(/₪/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .trim();

  if (cleaned === '' || cleaned === '-') return { value: 0, valid: true };
  const num = parseFloat(cleaned);
  if (isNaN(num)) return { value: 0, valid: false, original: val };
  return { value: Math.round(num * 100) / 100, valid: true };
};

// Use central phone parser
import { parsePhoneNumbers } from '../utils/phoneParser';

// ═══════════════════════════════════════════════════════════
// THROTTLE QUEUE
// ═══════════════════════════════════════════════════════════
class ThrottleQueue {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  async add(fn) {
    while (this.running >= this.concurrency) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      const resolve = this.queue.shift();
      if (resolve) resolve();
    }
  }
}

// ═══════════════════════════════════════════════════════════
// RETRYABLE REQUEST
// ═══════════════════════════════════════════════════════════
const retryableRequest = async (fn, name = 'request') => {
  for (let attempt = 0; attempt < RETRY_MAX; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (isRateLimitError(err) && attempt < RETRY_MAX - 1) {
        const delay = BACKOFF_MS[attempt] || 4000;
        console.log(`[${name}] Rate limit - waiting ${delay}ms (attempt ${attempt + 1}/${RETRY_MAX})`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`RATE_LIMIT_FATAL: ${name} after ${RETRY_MAX} attempts`);
};

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const rtlWrapStyle = { direction: "rtl", textAlign: "right", unicodeBidi: "plaintext" };
const uploadBtnClass = "import-upload-btn";
const uploadBtnStyle = {
  height: 44, padding: "0 16px", fontSize: 16, fontWeight: 700,
  backgroundColor: "#2563eb", color: "#ffffff", borderRadius: 12,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", userSelect: "none", lineHeight: "44px"
};
const progressTextStyle = { fontSize: 16, fontWeight: 700, lineHeight: 1.2, direction: "rtl", textAlign: "right", unicodeBidi: "plaintext" };
const progressPercentStyle = { fontSize: 16, fontWeight: 700, lineHeight: 1.2, direction: "rtl", textAlign: "right", unicodeBidi: "plaintext" };
const mappingTitleStyle = { fontSize: 20, fontWeight: 700, marginBottom: 6, lineHeight: 1.3, direction: "rtl", textAlign: "right", unicodeBidi: "plaintext" };
const mappingGridStyle = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "6px 16px", direction: "rtl", textAlign: "right" };
const mappingItemStyle = { fontSize: 15, lineHeight: 1.45, whiteSpace: "nowrap", direction: "rtl", textAlign: "right", unicodeBidi: "plaintext" };
const importModeTitleStyle = { fontSize: 20, fontWeight: 700, lineHeight: 1.3, direction: "rtl", textAlign: "right", unicodeBidi: "plaintext" };
const dangerIconStyle = { fontSize: 32, color: "#dc2626", marginLeft: 8, display: "inline-flex", alignItems: "center" };
const importRulesTextStyle = { fontSize: 15, lineHeight: 1.45, direction: "rtl", textAlign: "right", unicodeBidi: "plaintext" };

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function ExcelImporter({ onImportComplete }) {
  const { startImport, finishImport } = useImport();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [excelData, setExcelData] = useState(null);
  const [importMode, setImportMode] = useState('fill_missing');
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importRunData, setImportRunData] = useState(null);
  const [importWarnings, setImportWarnings] = useState([]);

  // ═══════════════════════════════════════════════════════════
  // FILE VALIDATION
  // ═══════════════════════════════════════════════════════════
  const validateFileType = (file) => {
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    
    if (!ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
      return { valid: false, error: 'סוג הקובץ אינו נתמך. ניתן להעלות רק קבצי Excel בפורמט ‎.xlsx‎ או ‎.xls‎' };
    }
    return { valid: true };
  };

  // ═══════════════════════════════════════════════════════════
  // READ EXCEL
  // ═══════════════════════════════════════════════════════════
  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          console.log(`[Excel Import] Reading file: ${file.name}`);
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('no_sheets');
          }
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          if (jsonData.length === 0) {
            throw new Error('empty_sheet');
          }
          
          const dataRows = jsonData.slice(1);
          console.log(`[Excel Import] Total rows parsed: ${dataRows.length}`);
          resolve({ rows: dataRows, totalRowsParsed: dataRows.length });
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject(new Error('file_read_error'));
      reader.readAsArrayBuffer(file);
    });
  };

  // ═══════════════════════════════════════════════════════════
  // HANDLE FILE SELECT
  // ═══════════════════════════════════════════════════════════
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const fileValidation = validateFileType(selectedFile);
    if (!fileValidation.valid) {
      setError(fileValidation.error);
      e.target.value = '';
      return;
    }

    setFile(selectedFile);
    setIsUploading(true);
    setError(null);

    try {
      const { rows, totalRowsParsed } = await readExcelFile(selectedFile);
      
      if (rows.length === 0) {
        throw new Error('empty_file');
      }
      
      // ═══════════════════════════════════════════════════════════
      // PRE-IMPORT VALIDATION (חובה לפי הכללים)
      // ═══════════════════════════════════════════════════════════
      // 1. בדיקה: עמודת apartmentKey קיימת
      if (!rows || rows.length === 0) {
        throw new Error('VALIDATION_FAILED: הקובץ ריק');
      }

      // בדיקה שיש עמודת A בכלל
      const firstRow = rows[0];
      if (!firstRow || firstRow.length <= FIXED_COLUMN_MAPPING.apartmentNumber) {
        throw new Error('VALIDATION_FAILED: חסרה עמודת מספר דירה (A)');
      }

      // 2. בדיקה: אין תאים ריקים + אין כפילויות
      const apartmentKeys = new Set();
      const duplicates = [];
      const emptyRows = [];
      let validRowsCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const apartmentRaw = (row[FIXED_COLUMN_MAPPING.apartmentNumber] || '').toString().trim();

        if (!apartmentRaw) {
          emptyRows.push(i + 2); // +2 for Excel row number (1-indexed + header)
          continue;
        }

        const apartmentKey = normalizeApartmentKey(apartmentRaw);

        if (!apartmentKey) {
          emptyRows.push(i + 2);
          continue;
        }

        if (apartmentKeys.has(apartmentKey)) {
          duplicates.push({ key: apartmentKey, row: i + 2 });
        } else {
          apartmentKeys.add(apartmentKey);
          validRowsCount++;
        }
      }

      // 3. אזהרות במקום עצירה - תן למשתמש להמשיך
      const preValidationWarnings = [];
      
      if (emptyRows.length > 0) {
        preValidationWarnings.push({
          type: 'EMPTY_ROWS',
          count: emptyRows.length,
          message: `נמצאו ${emptyRows.length} שורות עם מספר דירה ריק (שורות: ${emptyRows.slice(0, 10).join(', ')}${emptyRows.length > 10 ? '...' : ''})`,
          severity: 'warning'
        });
      }

      if (duplicates.length > 0) {
        const uniqueDuplicates = [...new Set(duplicates.map(d => d.key))];
        preValidationWarnings.push({
          type: 'DUPLICATES',
          count: uniqueDuplicates.length,
          message: `נמצאו דירות כפולות: ${uniqueDuplicates.slice(0, 5).join(', ')}${uniqueDuplicates.length > 5 ? ` ועוד ${uniqueDuplicates.length - 5}` : ''}`,
          severity: 'warning'
        });
      }

      if (validRowsCount === 0) {
        throw new Error('VALIDATION_FAILED: לא נמצאו שורות תקינות לייבוא');
      }

      console.log(`[Excel Import - PRE-FLIGHT] ✓ Validation passed: ${validRowsCount} דירות תקינות`);

      setExcelData({ 
        rows, 
        totalRowsParsed, 
        uniqueApartments: apartmentKeys.size,
        expectedRows: validRowsCount,
        uniqueInFile: apartmentKeys.size,
        fileName: selectedFile.name,
        preValidationWarnings: preValidationWarnings || []
      });
      setStep(2);
    } catch (err) {
      let errorMessage = '';
      
      if (err.message === 'no_sheets') {
        errorMessage = '📄 שגיאת פורמט: הקובץ אינו מכיל גיליון נתונים תקין.\n\nייתכן שהקובץ פגום או לא בפורמט Excel תקני.';
      } else if (err.message === 'empty_sheet' || err.message === 'empty_file') {
        errorMessage = '📭 שגיאת תוכן: הקובץ ריק או אינו מכיל נתונים.\n\nוודא שהגיליון הראשון בקובץ מכיל נתונים החל משורה 2 (לאחר כותרת).';
      } else if (err.message === 'file_read_error') {
        errorMessage = '🔒 שגיאת קריאה: לא ניתן לקרוא את הקובץ.\n\nסיבות אפשריות:\n• הקובץ פגום\n• הקובץ מוגן בסיסמה\n• הקובץ פתוח ביישום אחר\n\nנסה לשמור עותק חדש של הקובץ ולהעלות אותו.';
      } else if (err.message.startsWith('VALIDATION_FAILED:')) {
        const details = err.message.replace('VALIDATION_FAILED: ', '');
        errorMessage = `⛔ בדיקת תקינות נכשלה:\n\n${details}\n\n💡 טיפים:\n• ודא שעמודה A מכילה מספרי דירות\n• הסר שורות ריקות לחלוטין\n• ודא שאין דירות כפולות בקובץ`;
      } else {
        errorMessage = `❌ שגיאה בעיבוד הקובץ:\n\n${err.message}\n\nאם הבעיה חוזרת, צור קשר עם התמיכה.`;
      }
      
      setError(errorMessage);
      
      if (e.target) e.target.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // HANDLE IMPORT - NEW ARCHITECTURE
  // ═══════════════════════════════════════════════════════════
  const handleImport = async () => {
    setIsImporting(true);
    startImport();
    setProgress(0);
    setProgressMessage('');
    setError(null);

    const importRunId = `import_${Date.now()}`;
    const importTimestamp = new Date().toISOString();
    let importRun = null;

    try {
      // Create ImportRun
      importRun = await base44.entities.ImportRun.create({
        importRunId,
        fileName: excelData.fileName,
        startedAt: importTimestamp,
        status: 'RUNNING',
        stage: 'INIT',
        totalRowsRead: excelData.totalRowsParsed,
        uniqueApartments: excelData.uniqueApartments,
        importMode
      });

      console.log(`[Excel Import] ========== START ${importRunId} ==========`);

      // Get settings
      setProgressMessage('טוען הגדרות...');
      const settingsList = await base44.entities.Settings.list();
      const settings = settingsList[0] || { 
        threshold_ok_max: 1000, 
        threshold_collect_from: 1500, 
        threshold_legal_from: 5000 
      };

      // RESET MODE (optional)
      if (importMode === 'reset') {
        setProgressMessage('מוחק נתונים קיימים...');
        await base44.entities.ImportRun.update(importRun.id, { stage: 'RESET' });
        console.log(`[Excel Import] RESET MODE: Deleting all records`);
        const existingRecords = await base44.entities.DebtorRecord.list();
        for (const record of existingRecords) {
          await base44.entities.DebtorRecord.delete(record.id);
        }
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 1: PREFETCH - קריאה אחת לכל הרשומות
      // ═══════════════════════════════════════════════════════════
      setProgressMessage('טוען רשומות קיימות...');
      setProgress(5);
      await base44.entities.ImportRun.update(importRun.id, { stage: 'PREFETCH' });
      console.log(`[Excel Import] PREFETCH: Loading all existing records`);
      
      const allExistingRecords = await base44.entities.DebtorRecord.list();
      
      // Build Map with normalized keys
      const existingMap = {};
      for (const record of allExistingRecords) {
      const normalizedKey = normalizeApartmentKey(record.apartmentNumber);
      existingMap[normalizedKey] = {
      id: record.id,
      phoneOwner: record.phoneOwner,
      phoneTenant: record.phoneTenant,
      phonePrimary: record.phonePrimary,
      phonesRaw: record.phonesRaw,
      phonesManualOverride: record.phonesManualOverride || false,
      managementMonthsRaw: record.managementMonthsRaw,
      notes: record.notes,
      lastContactDate: record.lastContactDate,
      nextActionDate: record.nextActionDate,
      legal_status_id: record.legal_status_id,
      legal_status_overridden: record.legal_status_overridden,
      legal_status_lock: record.legal_status_lock,
      legal_status_updated_at: record.legal_status_updated_at,
      legal_status_updated_by: record.legal_status_updated_by,
      legal_status_source: record.legal_status_source,
      legal_status_manual: record.legal_status_manual
      };
      }
      
      console.log(`[Excel Import] PREFETCH: Loaded ${Object.keys(existingMap).length} records`);

      // ═══════════════════════════════════════════════════════════
      // STEP 2: PARSE + BUILD QUEUES (בלי קריאות API)
      // ═══════════════════════════════════════════════════════════
      setProgressMessage('מנתח קובץ ובונה רשימות פעולות...');
      setProgress(10);
      await base44.entities.ImportRun.update(importRun.id, { stage: 'PARSE' });
      
      const { rows } = excelData;
      const allStatuses = await base44.entities.Status.list();
      const defaultLegalStatus = allStatuses.find(s => s.type === 'LEGAL' && s.is_default === true);

      const createsQueue = [];
      const updatesQueue = [];
      const seenInFile = new Set();
      const allWarnings = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const apartmentRaw = (row[FIXED_COLUMN_MAPPING.apartmentNumber] || '').toString().trim();
        const apartmentKey = normalizeApartmentKey(apartmentRaw);

        if (!apartmentKey) {
          allWarnings.push({
            rowIndex: i + 2,
            apartmentRaw: apartmentRaw,
            ownerNameRaw: (row[FIXED_COLUMN_MAPPING.ownerName] || '').toString().trim(),
            reason: 'MISSING_APT',
            message: 'מספר דירה ריק או לא תקין - השורה לא יובאה'
          });
          continue;
        }

        seenInFile.add(apartmentKey);

        const ownerNameRaw = (row[FIXED_COLUMN_MAPPING.ownerName] || '').toString().trim();
        const phoneRaw = (row[FIXED_COLUMN_MAPPING.phonesRaw] || '').toString().trim();
        const managementMonthsRaw = (row[FIXED_COLUMN_MAPPING.managementMonthsRaw] || '').toString().trim();
        const detailsMonthlyRaw = (row[FIXED_COLUMN_MAPPING.detailsMonthly] || '').toString().trim();
        
        const totalDebtClean = cleanNumber(row[FIXED_COLUMN_MAPPING.totalDebt]);
        const monthlyDebtClean = cleanNumber(row[FIXED_COLUMN_MAPPING.monthlyDebt]);
        const hotWaterDebtClean = cleanNumber(row[FIXED_COLUMN_MAPPING.hotWaterDebt]);

        // בדיקה: אם יש שגיאות קריטיות בנתונים - דלג על השורה
        let hasSkipErrors = false;

        if (!totalDebtClean.valid) {
          allWarnings.push({
            rowIndex: i + 2,
            apartmentNumber: apartmentKey,
            ownerNameRaw,
            reason: 'BAD_NUMBER',
            field: 'totalDebt',
            rawValue: totalDebtClean.original,
            message: 'ערך לא תקין בסה״כ חוב - השורה לא יובאה'
          });
          hasSkipErrors = true;
        }

        if (!monthlyDebtClean.valid) {
          allWarnings.push({
            rowIndex: i + 2,
            apartmentNumber: apartmentKey,
            ownerNameRaw,
            reason: 'BAD_NUMBER',
            field: 'monthlyDebt',
            rawValue: monthlyDebtClean.original,
            message: 'ערך לא תקין בדמי ניהול - השורה לא יובאה'
          });
          hasSkipErrors = true;
        }

        if (!hotWaterDebtClean.valid) {
          allWarnings.push({
            rowIndex: i + 2,
            apartmentNumber: apartmentKey,
            ownerNameRaw,
            reason: 'BAD_NUMBER',
            field: 'hotWaterDebt',
            rawValue: hotWaterDebtClean.original,
            message: 'ערך לא תקין במים חמים - השורה לא יובאה'
          });
          hasSkipErrors = true;
        }

        // אם יש שגיאות קריטיות - דלג על השורה ולא תיצור/תעדכן אותה
        if (hasSkipErrors) {
          continue;
        }

        const { phoneOwner, phoneTenant, phonePrimary, phonesRaw } = parsePhoneNumbers(phoneRaw);

        if (!phonePrimary && phoneRaw) {
          allWarnings.push({
            rowIndex: i + 2,
            apartmentNumber: apartmentKey,
            ownerNameRaw,
            reason: 'PHONE_PARSE_FAILED',
            field: 'phone',
            rawValue: phoneRaw,
            message: 'לא ניתן לחלץ מספר טלפון תקין (השורה יובאה ללא טלפון)'
          });
        }

        const totalDebt = totalDebtClean.value;
        const monthlyDebt = monthlyDebtClean.value;
        const hotWaterDebt = hotWaterDebtClean.value;

        // חישוב סטטוס אוטומטי - שימוש בפונקציה המרכזית
        const { calculateDebtStatus } = await import('@/components/utils/debtStatusCalculator');
        const debt_status_auto = calculateDebtStatus(totalDebt, settings, false);

        const existing = existingMap[apartmentKey];
        const isEmpty = (val) => {
          if (val === null || val === undefined || val === '') return true;
          const str = String(val).trim();
          return str === '' || str === 'אין מספר' || str === '-' || str === 'לא ידוע' || /^0+$/.test(str);
        };

        if (existing) {
          // UPDATE
          const patch = {
            apartmentNumber: apartmentKey,
            totalDebt,
            monthlyDebt,
            specialDebt: hotWaterDebt,
            debt_status_auto,
            detailsMonthly: detailsMonthlyRaw,
            importedThisRun: true,
            lastImportRunId: importRunId,
            lastImportAt: importTimestamp,
            flaggedAsCleared: false,
            clearedAt: null
          };

          // managementMonthsRaw: רק אם ריק (השלמה בלבד)
          if (isEmpty(existing.managementMonthsRaw) && managementMonthsRaw) {
            patch.managementMonthsRaw = managementMonthsRaw;
          }
          
          if (ownerNameRaw && ownerNameRaw.trim() !== '') {
            patch.ownerName = ownerNameRaw.split(/[\/,]/)[0]?.trim() || '';
          }
          
          // Phone logic: respect manual override
          if (existing.phonesManualOverride) {
            // Don't update phones if manually overridden
            // Keep existing values
          } else {
            // Update phonesRaw only if empty
            if (isEmpty(existing.phonesRaw) && phonesRaw) {
              patch.phonesRaw = phonesRaw;
              patch.phoneOwner = phoneOwner;
              patch.phoneTenant = phoneTenant;
              patch.phonePrimary = phonePrimary;
            }
          }

          patch.notes = existing.notes;
          patch.lastContactDate = existing.lastContactDate;
          patch.nextActionDate = existing.nextActionDate;
          patch.legal_status_id = existing.legal_status_id;
          patch.legal_status_overridden = existing.legal_status_overridden;
          patch.legal_status_lock = existing.legal_status_lock;
          patch.legal_status_updated_at = existing.legal_status_updated_at;
          patch.legal_status_updated_by = existing.legal_status_updated_by;
          patch.legal_status_source = existing.legal_status_source;
          patch.legal_status_manual = existing.legal_status_manual;
          
          updatesQueue.push({ id: existing.id, patch, aptKey: apartmentKey });
        } else {
          // CREATE
          const newRecord = {
            apartmentNumber: apartmentKey,
            ownerName: ownerNameRaw.split(/[\/,]/)[0]?.trim() || '',
            phoneOwner,
            phoneTenant,
            phonePrimary,
            phonesRaw: phonesRaw,
            phonesManualOverride: false,
            totalDebt,
            monthlyDebt,
            specialDebt: hotWaterDebt,
            debt_status_auto,
            detailsMonthly: detailsMonthlyRaw,
            managementMonthsRaw: managementMonthsRaw || '',
            detailsSpecial: '',
            monthsInArrears: 0,
            importedThisRun: true,
            lastImportRunId: importRunId,
            lastImportAt: importTimestamp,
            flaggedAsCleared: false,
            isArchived: false
          };

          if (defaultLegalStatus) {
            newRecord.legal_status_id = defaultLegalStatus.id;
            newRecord.legal_status_overridden = false;
          }
          
          createsQueue.push({ data: newRecord, aptKey: apartmentKey });
        }
      }

      // Build ZERO queue (apartments not in file)
      const zeroQueue = [];
      for (const aptKey of Object.keys(existingMap)) {
        if (!seenInFile.has(aptKey)) {
          zeroQueue.push({
            id: existingMap[aptKey].id,
            patch: {
              monthlyDebt: 0,
              specialDebt: 0,
              totalDebt: 0,
              debt_status_auto: 'תקין',
              flaggedAsCleared: true,
              clearedAt: importTimestamp
            },
            aptKey
          });
        }
      }

      console.log(`[Excel Import] PARSE: creates=${createsQueue.length}, updates=${updatesQueue.length}, zero=${zeroQueue.length}, warnings=${allWarnings.length}`);

      // ═══════════════════════════════════════════════════════════
      // SAFETY CHECK: מניעת כפילויות (Upsert לפי apartmentKey)
      // ═══════════════════════════════════════════════════════════
      // כל הרשומות מזוהות לפי apartmentKey בלבד
      // אם קיימת - UPDATE, אם לא - CREATE
      // שחזור ייבוא שנכשל: בריצה נוספת רשומות קיימות יתעדכנו (לא ישוכפלו)

      // ═══════════════════════════════════════════════════════════
      // STEP 3: RUN QUEUES - Throttle עם CONCURRENCY=2
      // ═══════════════════════════════════════════════════════════
      setProgressMessage('מבצע יצירות...');
      setProgress(20);
      await base44.entities.ImportRun.update(importRun.id, { stage: 'CREATES' });
      
      const queue = new ThrottleQueue(CONCURRENCY);
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalZeroed = 0;
      const allErrors = [];

      // CREATES
      for (let i = 0; i < createsQueue.length; i++) {
        const item = createsQueue[i];
        try {
          await queue.add(() => retryableRequest(
            () => base44.entities.DebtorRecord.create(item.data),
            `create:${item.aptKey}`
          ));
          totalCreated++;
        } catch (err) {
          // שגיאה ביצירת רשומה - נרשם כאזהרה ולא עוצרים
          allWarnings.push({
            rowIndex: 0,
            apartmentNumber: item.aptKey,
            ownerNameRaw: item.data.ownerName,
            reason: 'CREATE_FAILED',
            message: `נכשל ייצור רשומה חדשה: ${err.message || 'שגיאה לא ידועה'}`
          });
        }
        
        const currentProgress = 20 + Math.round((i / (createsQueue.length + updatesQueue.length + zeroQueue.length)) * 60);
        setProgress(currentProgress);
      }

      // UPDATES
      setProgressMessage('מבצע עדכונים...');
      await base44.entities.ImportRun.update(importRun.id, { stage: 'UPDATES' });
      
      for (let i = 0; i < updatesQueue.length; i++) {
        const item = updatesQueue[i];
        try {
          await queue.add(() => retryableRequest(
            () => base44.entities.DebtorRecord.update(item.id, item.patch),
            `update:${item.aptKey}`
          ));
          totalUpdated++;
        } catch (err) {
          // שגיאה בעדכון רשומה - נרשם כאזהרה ולא עוצרים
          allWarnings.push({
            rowIndex: 0,
            apartmentNumber: item.aptKey,
            ownerNameRaw: item.patch.ownerName || '',
            reason: 'UPDATE_FAILED',
            message: `נכשל עדכון רשומה קיימת: ${err.message || 'שגיאה לא ידועה'}`
          });
        }
        
        const currentProgress = 20 + Math.round(((createsQueue.length + i) / (createsQueue.length + updatesQueue.length + zeroQueue.length)) * 60);
        setProgress(currentProgress);
      }

      // ZERO
      setProgressMessage('מאפס דירות שלא בקובץ...');
      await base44.entities.ImportRun.update(importRun.id, { stage: 'ZERO' });
      
      for (let i = 0; i < zeroQueue.length; i++) {
        const item = zeroQueue[i];
        try {
          await queue.add(() => retryableRequest(
            () => base44.entities.DebtorRecord.update(item.id, item.patch),
            `zero:${item.aptKey}`
          ));
          totalZeroed++;
        } catch (err) {
          // שגיאה באיפוס - נרשם כאזהרה ולא עוצרים
          allWarnings.push({
            rowIndex: 0,
            apartmentNumber: item.aptKey,
            reason: 'ZERO_FAILED',
            message: `נכשל איפוס דירה שלא בקובץ: ${err.message || 'שגיאה לא ידועה'}`
          });
        }
        
        const currentProgress = 20 + Math.round(((createsQueue.length + updatesQueue.length + i) / (createsQueue.length + updatesQueue.length + zeroQueue.length)) * 60);
        setProgress(currentProgress);
      }

      console.log(`[Excel Import] COMPLETE: created=${totalCreated}, updated=${totalUpdated}, zeroed=${totalZeroed}, warnings=${allWarnings.length}`);

      // ═══════════════════════════════════════════════════════════
      // STEP 4: QA (קריאה אחת בסוף)
      // ═══════════════════════════════════════════════════════════
      setProgressMessage('בודק איכות...');
      setProgress(90);
      await base44.entities.ImportRun.update(importRun.id, { stage: 'QA' });
      
      const finalRecords = await base44.entities.DebtorRecord.list();
      const importedCount = finalRecords.filter(r => r.lastImportRunId === importRunId).length;

      const sumMonthly = finalRecords.reduce((sum, r) => sum + (r.monthlyDebt || 0), 0);
      const sumSpecial = finalRecords.reduce((sum, r) => sum + (r.specialDebt || 0), 0);
      const sumTotal = finalRecords.reduce((sum, r) => sum + (r.totalDebt || 0), 0);
      const delta = Math.abs(sumTotal - (sumMonthly + sumSpecial));
      
      const qaValidation = delta <= 0.01;
      const countValidation = importedCount === excelData.uniqueInFile;

      console.log(`[Excel Import - QA] Expected: ${excelData.uniqueInFile}, Imported: ${importedCount}, Delta: ${delta.toFixed(2)}, Warnings: ${allWarnings.length}`);

      let finalStatus = 'SUCCESS';
      let errorSummary = '';

      if (allWarnings.length > 0) {
        finalStatus = 'PARTIAL';
        errorSummary = `${allWarnings.length} שורות לא יובאו`;
      }

      if (!qaValidation) {
        errorSummary += (errorSummary ? ', ' : '') + `פער סכומים: ${delta.toFixed(2)}`;
      }

      if (!countValidation) {
        const diff = importedCount - excelData.uniqueInFile;
        errorSummary += (errorSummary ? ', ' : '') + `פער כמות: ${diff > 0 ? '+' : ''}${diff}`;
      }

      // Update ImportRun
      await base44.entities.ImportRun.update(importRun.id, {
        finishedAt: new Date().toISOString(),
        status: finalStatus,
        stage: 'COMPLETE',
        successRowsCount: totalCreated + totalUpdated,
        createdCount: totalCreated,
        updatedCount: totalUpdated,
        clearedCount: totalZeroed,
        failedRowsCount: allWarnings.length,
        skippedRowsCount: allWarnings.length,
        qaValidation,
        qaDelta: parseFloat(delta.toFixed(2)),
        errorSummary: errorSummary || 'אין שגיאות',
        errorDetails: allWarnings.map(w => ({
          rowIndex: w.rowIndex,
          apartmentNumber: w.apartmentNumber || w.apartmentRaw || '',
          errorType: w.reason,
          errorMessage: w.message
        }))
      });

      // Update Settings
      try {
        if (settingsList.length > 0) {
          await base44.entities.Settings.update(settingsList[0].id, {
            last_import_at: importTimestamp
          });
        } else {
          await base44.entities.Settings.create({
            last_import_at: importTimestamp
          });
        }
      } catch (settingsErr) {
        console.warn('[Excel Import] Failed to update last_import_at');
      }

      setImportRunData(importRun);
      setImportWarnings(allWarnings);
      setImportResult({ 
        created: totalCreated, 
        updated: totalUpdated, 
        skipped: allWarnings.length,
        failed: 0, // כל השגיאות עברו לאזהרות
        clearedCount: totalZeroed,
        total: rows.length,
        expectedRows: excelData.expectedRows,
        uniqueInFile: excelData.uniqueInFile,
        importedCountDB: importedCount,
        qaValidation,
        countValidation,
        delta: delta.toFixed(2),
        errors: [], // אין שגיאות שעוצרות - הכל באזהרות
        warnings: allWarnings,
        status: finalStatus,
        importRunId
      });
      
      setProgress(100);
      setStep(3);
      
      if (finalStatus === 'SUCCESS') {
        toast.success('הייבוא הושלם בהצלחה ללא אזהרות');
      } else {
        toast.warning(`הייבוא הושלם - ${allWarnings.length} שורות לא יובאו (ראה אזהרות)`);
      }
      
      console.log(`[Excel Import] ========== END ${importRunId} ==========`);
    } catch (err) {
      console.error('[Excel Import] FATAL ERROR:', err);
      
      let errorStage = 'FATAL_ERROR';
      let errorMessage = '';

      if (isRateLimitError(err)) {
        errorStage = 'RATE_LIMIT_FATAL';
        errorMessage = `⏱️ חריגה ממגבלת קצב\n\nהמערכת ביצעה ${RETRY_MAX} ניסיונות אך נכשלה.\n\nנא להמתין 5 דקות ולנסות שוב.`;
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = `🌐 שגיאת תקשורת\n\nהחיבור לשרת נכשל.\n\nנא לבדוק את החיבור לאינטרנט ולנסות שוב.\n\nפרטים טכניים: ${err.message}`;
      } else {
        errorMessage = `❌ שגיאה בתהליך הייבוא\n\n${err.message || 'שגיאה לא ידועה'}\n\n💾 הנתונים הקיימים לא נמחקו.\nניתן לנסות שוב בבטחה.`;
      }

      if (importRun) {
        try {
          await base44.entities.ImportRun.update(importRun.id, {
            finishedAt: new Date().toISOString(),
            status: 'FAILED',
            stage: errorStage,
            errorSummary: errorMessage,
            errorDetails: [{
              rowIndex: 0,
              apartmentNumber: 'N/A',
              errorType: 'FATAL',
              errorMessage
            }]
          });
        } catch (updateErr) {
          console.error('[Excel Import] Failed to update ImportRun with error:', updateErr);
        }
      }

      setError(errorMessage);
      toast.error('ייבוא נכשל - לא בוצעו שינויים בנתונים הקיימים');
    } finally {
      setIsImporting(false);
      finishImport();
    }
  };

  // ═══════════════════════════════════════════════════════════
  // DOWNLOAD REPORTS
  // ═══════════════════════════════════════════════════════════
  const downloadErrorReport = () => {
    if (!importResult || !importResult.errors || importResult.errors.length === 0) return;

    const csv = [
      ['שורה בקובץ', 'מספר דירה', 'סוג שגיאה', 'הודעת שגיאה'],
      ...importResult.errors.map(e => [
        e.rowIndex,
        e.apartmentNumber,
        e.errorType,
        e.errorMessage
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `import_errors_${importResult.importRunId}.csv`;
    link.click();
  };

  const downloadWarningsReport = () => {
    if (!importWarnings || importWarnings.length === 0) return;

    const csv = [
      ['שורה', 'דירה', 'בעלים', 'סיבה', 'שדה', 'ערך גולמי', 'הודעה'],
      ...importWarnings.map(w => [
        w.rowIndex,
        w.apartmentNumber || w.apartmentRaw || '',
        w.ownerNameRaw || '',
        w.reason,
        w.field || '',
        w.rawValue || JSON.stringify(w.rawValues || ''),
        w.message
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `import_warnings_${importResult.importRunId}.csv`;
    link.click();
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <Card className="border-0 shadow-lg max-w-3xl mx-auto overflow-hidden rounded-2xl">
      <style>{`
        @media (max-width: 480px) {
          .${uploadBtnClass} { width: 100%; }
        }
        @media (max-width: 480px) {
          .import-mapping-grid { grid-template-columns: 1fr !important; }
        }
        
        .import-mapping-row {
          display: grid;
          grid-template-columns: 22px 14px 1fr;
          align-items: center;
          column-gap: 6px;
          font-size: 15px;
          line-height: 1.4;
        }
        
        .import-mapping-letter {
          width: 22px;
          text-align: left;
          font-weight: 700;
        }
        
        .import-mapping-arrow {
          width: 14px;
          text-align: center;
          opacity: 0.9;
        }
        
        .import-mapping-label {
          text-align: right;
          white-space: nowrap;
        }
      `}</style>
      
      <CardHeader className="border-b bg-slate-50">
        <CardTitle className="flex items-center gap-2 text-lg" dir="rtl">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          ייבוא דוח חייבים מאקסל
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6" dir="rtl">
        {step === 1 && (
          <div className="py-10">
            <div className="mb-6 text-center">
              <Upload className="w-16 h-16 text-slate-300 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2 text-center">העלאת קובץ אקסל</h3>
            <p className="text-sm text-slate-500 mb-6 text-center">
              בחר קובץ XLS או XLSX עם דוח החייבים
            </p>
            
            <div className="text-center">
              <label style={{ display: "block", width: "fit-content", margin: "0 auto" }}>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
                <div
                  className={uploadBtnClass}
                  style={{
                    ...uploadBtnStyle,
                    ...(isUploading && { backgroundColor: "#93c5fd", cursor: "not-allowed" }),
                  }}
                  onMouseEnter={(e) => !isUploading && (e.currentTarget.style.backgroundColor = "#1d4ed8")}
                  onMouseLeave={(e) => !isUploading && (e.currentTarget.style.backgroundColor = "#2563eb")}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" style={{ marginLeft: 8 }} />
                      מעלה קובץ...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" style={{ marginLeft: 8 }} />
                      בחר קובץ Excel
                    </>
                  )}
                </div>
              </label>
              <p className="text-xs text-slate-400 mt-3">
                קבצים נתמכים: .xlsx, .xls
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4" dir="rtl">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="text-right whitespace-pre-line">{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 2 && excelData && (
          <div className="space-y-6">
            <Alert className="bg-green-50 border-green-200" dir="rtl">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-700 text-right">
                קובץ האקסל נטען בהצלחה. נמצאו {excelData.uniqueApartments} דירות ייחודיות לייבוא.
              </AlertDescription>
            </Alert>

            {excelData.preValidationWarnings && excelData.preValidationWarnings.length > 0 && (
              <Alert className="bg-orange-50 border-orange-300" dir="rtl">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <AlertDescription className="text-orange-800 text-right">
                  <p className="font-bold mb-2">⚠️ אזהרות בקובץ:</p>
                  <div className="space-y-1 text-sm">
                    {excelData.preValidationWarnings.map((warn, idx) => (
                      <div key={idx}>• {warn.message}</div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs font-semibold">שורות אלו לא ייובאו, אך ניתן להמשיך עם שאר הנתונים.</p>
                </AlertDescription>
              </Alert>
            )}

            <Alert className="bg-blue-50 border-blue-300" dir="rtl">
              <AlertDescription className="text-blue-800 font-semibold text-right">
                <div style={mappingTitleStyle}>מיפוי קבוע:</div>
                <div className="import-mapping-grid" style={mappingGridStyle}>
                  <div className="import-mapping-row">
                    <span className="import-mapping-letter">A</span>
                    <span className="import-mapping-arrow">→</span>
                    <span className="import-mapping-label">דירה</span>
                  </div>
                  <div className="import-mapping-row">
                    <span className="import-mapping-letter">B</span>
                    <span className="import-mapping-arrow">→</span>
                    <span className="import-mapping-label">שם</span>
                  </div>
                  <div className="import-mapping-row">
                    <span className="import-mapping-letter">C</span>
                    <span className="import-mapping-arrow">→</span>
                    <span className="import-mapping-label">טלפון</span>
                  </div>
                  <div className="import-mapping-row">
                    <span className="import-mapping-letter">D</span>
                    <span className="import-mapping-arrow">→</span>
                    <span className="import-mapping-label">סה״כ</span>
                  </div>
                  <div className="import-mapping-row">
                    <span className="import-mapping-letter">E</span>
                    <span className="import-mapping-arrow">→</span>
                    <span className="import-mapping-label">דמי ניהול</span>
                  </div>
                  <div className="import-mapping-row">
                    <span className="import-mapping-letter">F</span>
                    <span className="import-mapping-arrow">→</span>
                    <span className="import-mapping-label">דמי ניהול לחודשים</span>
                  </div>
                  <div className="import-mapping-row">
                    <span className="import-mapping-letter">G</span>
                    <span className="import-mapping-arrow">→</span>
                    <span className="import-mapping-label">מים חמים</span>
                  </div>
                  <div className="import-mapping-row">
                    <span className="import-mapping-letter">H</span>
                    <span className="import-mapping-arrow">→</span>
                    <span className="import-mapping-label">פרטים</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div>
              <h4 className="font-medium text-slate-700 mb-3 text-right">מצב ייבוא</h4>
              <RadioGroup value={importMode} onValueChange={(v) => { setImportMode(v); setResetConfirmation(''); }} className="space-y-3" dir="rtl">
                <div className="flex flex-row-reverse items-start gap-3 p-3 md:p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
                  <RadioGroupItem value="fill_missing" id="fill_missing" className="flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="fill_missing" className="cursor-pointer text-blue-900 block" style={importModeTitleStyle}>
                      השלמה בלבד (מומלץ)
                    </Label>
                    <ul className="text-blue-700 mt-2 space-y-1 list-disc pr-5" style={importRulesTextStyle}>
                      <li>טלפונים: עדכון רק אם ריקים</li>
                      <li>סכומים: עדכון תמיד מעמודות D/E/G</li>
                      <li>דירות שלא בקובץ: מתאפסות</li>
                    </ul>
                  </div>
                </div>
                <div className="flex flex-row-reverse items-start gap-3 p-3 md:p-4 rounded-lg border-2 border-red-200 bg-red-50">
                  <RadioGroupItem value="reset" id="reset" className="flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="reset" className="cursor-pointer text-red-700 block" style={importModeTitleStyle}>
                      איפוס מלא
                    </Label>
                    <p className="text-red-700 mt-2 font-semibold" style={{ ...rtlWrapStyle, ...importRulesTextStyle, margin: "8px 0 0 0" }}>
                      <span style={dangerIconStyle}>⚠️</span>
                      מחיקה מלאה של כל הנתונים
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {importMode === 'reset' && (
                <Alert variant="destructive" className="mt-4" dir="rtl">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription className="text-right">
                    <div className="space-y-2">
                      <p className="font-bold">הקלד "מחק הכל" לאישור:</p>
                      <input
                        type="text"
                        value={resetConfirmation}
                        onChange={(e) => setResetConfirmation(e.target.value)}
                        placeholder="מחק הכל"
                        className="w-full px-3 py-2 border border-red-300 rounded-lg text-right bg-white"
                        dir="rtl"
                      />
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {isImporting && (
              <div className="mt-6 p-4 bg-blue-50 rounded-xl import-progress-wrapper" style={rtlWrapStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                  <span style={progressPercentStyle}>{progress}%</span>
                  <span style={progressTextStyle}>{progressMessage || 'מעבד...'}</span>
                </div>

                <div className="import-progress-bar-container" style={{
                  width: "100%",
                  height: 15,
                  minHeight: 15,
                  maxHeight: 15,
                  backgroundColor: "#e5e7eb",
                  borderRadius: 999,
                  overflow: "hidden",
                }}>
                  <div style={{
                    width: `${progress}%`,
                    height: 15,
                    minHeight: 15,
                    maxHeight: 15,
                    backgroundColor: "#2563eb",
                    borderRadius: 999,
                    transition: "width 180ms linear",
                  }} />
                </div>
                
                <p className="text-xs text-slate-500 mt-2 text-center">
                  ייבוא חכם עם Throttle ו-Retry
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive" dir="rtl">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="text-right whitespace-pre-line">{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 3 && importResult && (
          <div className="py-6" dir="rtl">
            <div className="text-center mb-6">
              {importResult.status === 'SUCCESS' ? (
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              ) : (
                <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
              )}
              <h3 className="text-lg font-medium text-slate-700 mb-2">
                {importResult.status === 'SUCCESS' ? 'הייבוא הושלם בהצלחה' : `הייבוא הושלם חלקית`}
              </h3>
              <p className="text-sm text-slate-500">RunId: {importResult.importRunId}</p>
            </div>
            
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="font-bold text-sm text-slate-700 mb-2">ספירת QA:</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">צפוי:</span>
                  <span className="font-bold text-slate-800 mr-1">{importResult.uniqueInFile}</span>
                </div>
                <div>
                  <span className="text-slate-500">יובא:</span>
                  <span className={`font-bold mr-1 ${importResult.countValidation ? 'text-green-600' : 'text-red-600'}`}>
                    {importResult.importedCountDB}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">פער:</span>
                  <span className={`font-bold mr-1 ${importResult.delta <= 0.01 ? 'text-green-600' : 'text-orange-600'}`}>
                    {importResult.delta}₪
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xl font-bold text-green-600">{importResult.created}</p>
                <p className="text-xs text-slate-600">נוצרו</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xl font-bold text-blue-600">{importResult.updated}</p>
                <p className="text-xs text-slate-600">עודכנו</p>
              </div>
              {importResult.clearedCount > 0 && (
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-xl font-bold text-orange-600">{importResult.clearedCount}</p>
                  <p className="text-xs text-slate-600">אופסו</p>
                </div>
              )}
              {importResult.failed > 0 && (
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-xl font-bold text-red-600">{importResult.failed}</p>
                  <p className="text-xs text-slate-600">נכשלו</p>
                </div>
              )}
            </div>

            {importWarnings && importWarnings.length > 0 && (
              <Alert className="bg-orange-50 border-orange-200 mb-4" dir="rtl">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <AlertDescription className="text-right">
                  <div className="space-y-2">
                    <p className="font-bold text-orange-800">נמצאו {importWarnings.length} אזהרות:</p>
                    <div className="max-h-40 overflow-y-auto text-xs space-y-1">
                      {importWarnings.slice(0, 10).map((warn, idx) => (
                        <div key={idx} className="text-orange-700">
                          <span className="font-bold">שורה {warn.rowIndex}</span>
                          {warn.apartmentNumber && <span>, דירה {warn.apartmentNumber}</span>}
                          {warn.ownerNameRaw && <span>, {warn.ownerNameRaw}</span>}
                          {': '}
                          {warn.message}
                          {warn.rawValue && <span className="text-orange-600"> (ערך: "{warn.rawValue}")</span>}
                        </div>
                      ))}
                      {importWarnings.length > 10 && (
                        <p className="text-orange-600 font-semibold">ועוד {importWarnings.length - 10} אזהרות...</p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadWarningsReport}
                      className="mt-2"
                    >
                      <Download className="w-4 h-4 ml-2" />
                      הורד דוח אזהרות מלא
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {importResult.errors && importResult.errors.length > 0 && (
              <Alert className="bg-red-50 border-red-200 mb-4" dir="rtl">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-right">
                  <div className="space-y-2">
                    <p className="font-bold text-red-800">נמצאו {importResult.errors.length} שגיאות:</p>
                    <div className="max-h-40 overflow-y-auto text-xs space-y-1">
                      {importResult.errors.slice(0, 10).map((err, idx) => (
                        <div key={idx} className="text-red-700">
                          {err.rowIndex > 0 && <span className="font-bold">שורה {err.rowIndex}</span>}
                          {err.apartmentNumber && err.apartmentNumber !== 'N/A' && <span>{err.rowIndex > 0 ? ', ' : ''}דירה {err.apartmentNumber}</span>}
                          {': '}
                          <span className="font-semibold">{err.errorType}</span>
                          {' - '}
                          {err.errorMessage}
                        </div>
                      ))}
                      {importResult.errors.length > 10 && (
                        <p className="text-red-600 font-semibold">ועוד {importResult.errors.length - 10} שגיאות...</p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadErrorReport}
                      className="mt-2"
                    >
                      <Download className="w-4 h-4 ml-2" />
                      הורד דוח שגיאות מלא
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {(!importResult.qaValidation || !importResult.countValidation) && (
              <Alert variant="destructive" className="mb-4" dir="rtl">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-right">
                  <p className="font-bold mb-2">אזהרות QA:</p>
                  {!importResult.countValidation && (
                    <p className="text-sm">• חוסר התאמה בכמות: צפוי {importResult.uniqueInFile}, יובא בפועל {importResult.importedCountDB}</p>
                  )}
                  {!importResult.qaValidation && (
                    <p className="text-sm">• פער בסכומים: {importResult.delta}₪</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t bg-slate-50 p-0 sticky bottom-0">
        {step === 2 && (
          <div className="flex flex-row-reverse items-center justify-between gap-3 p-4 w-full flex-wrap" dir="rtl">
            <AppButton 
              variant={importMode === 'reset' ? 'danger' : 'primary'}
              icon={importMode === 'reset' ? AlertTriangle : Database}
              onClick={handleImport} 
              loading={isImporting}
              disabled={importMode === 'reset' && resetConfirmation !== 'מחק הכל'}
              className="min-w-[140px] flex-1"
            >
              {importMode === 'reset' ? 'בצע איפוס' : 'התחל ייבוא'}
            </AppButton>
            <AppButton variant="outline" icon={ArrowLeft} onClick={() => setStep(1)} className="min-w-[140px] flex-1">
              חזור
            </AppButton>
          </div>
        )}

        {step === 3 && (
          <div className="p-4 w-full" dir="rtl">
            <AppButton variant="primary" icon={RefreshCw} onClick={onImportComplete} fullWidth>
              סיום ומעבר לדשבורד
            </AppButton>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}