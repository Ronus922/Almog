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
import { toast } from 'sonner';

const FIXED_COLUMN_MAPPING = {
  apartmentNumber: 0,  // Column A
  ownerName: 1,         // Column B
  phonesRaw: 2,         // Column C
  totalDebt: 3,         // Column D
  hotWaterDebt: 6,      // Column G
  detailsMonthly: 7     // Column H
};

const ALLOWED_FILE_EXTENSIONS = ['.xlsx', '.xls'];
const BATCH_SIZE = 25;
const CONCURRENCY = 3; // Max 3 parallel operations
const MAX_RETRIES = 3;
const RETRY_DELAYS = [200, 400, 800]; // Exponential backoff

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Queue with concurrency limit
class ConcurrentQueue {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  async add(fn) {
    while (this.running >= this.concurrency) {
      await new Promise(resolve => {
        this.queue.push(resolve);
      });
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

const isRateLimitError = (error) => {
  const message = error?.message || '';
  return message.includes('429') || 
         message.includes('rate limit') || 
         message.includes('too many requests') ||
         message.includes('Rate limit exceeded');
};

// Normalize apartment number to prevent duplicates (HARDENED)
const normalizeApartmentKey = (apartmentNumber) => {
  if (!apartmentNumber) return '';
  const normalized = String(apartmentNumber)
    .replace(/\u00A0/g, ' ')  // Remove NBSP
    .trim()
    .replace(/[^\d]/g, '');    // Keep digits only
  
  // Remove leading zeros but keep single 0
  if (normalized === '' || /^0+$/.test(normalized)) return normalized === '0' ? '0' : '';
  return normalized.replace(/^0+/, '');
};

const rtlWrapStyle = {
  direction: "rtl",
  textAlign: "right",
  unicodeBidi: "plaintext",
};

const uploadBtnClass = "import-upload-btn";
const uploadBtnStyle = {
  height: 44,
  padding: "0 16px",
  fontSize: 16,
  fontWeight: 700,
  backgroundColor: "#2563eb",
  color: "#ffffff",
  borderRadius: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  userSelect: "none",
  lineHeight: "44px",
};

const progressTextStyle = {
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1.2,
  direction: "rtl",
  textAlign: "right",
  unicodeBidi: "plaintext",
};

const progressPercentStyle = {
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1.2,
  direction: "rtl",
  textAlign: "right",
  unicodeBidi: "plaintext",
};

const mappingTitleStyle = {
  fontSize: 20,
  fontWeight: 700,
  marginBottom: 6,
  lineHeight: 1.3,
  direction: "rtl",
  textAlign: "right",
  unicodeBidi: "plaintext",
};

const mappingGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "6px 16px",
  direction: "rtl",
  textAlign: "right",
};

const mappingItemStyle = {
  fontSize: 15,
  lineHeight: 1.45,
  whiteSpace: "nowrap",
  direction: "rtl",
  textAlign: "right",
  unicodeBidi: "plaintext",
};

const importModeTitleStyle = {
  fontSize: 20,
  fontWeight: 700,
  lineHeight: 1.3,
  direction: "rtl",
  textAlign: "right",
  unicodeBidi: "plaintext",
};

const dangerIconStyle = {
  fontSize: 32,
  color: "#dc2626",
  marginLeft: 8,
  display: "inline-flex",
  alignItems: "center",
};

const importRulesTextStyle = {
  fontSize: 15,
  lineHeight: 1.45,
  direction: "rtl",
  textAlign: "right",
  unicodeBidi: "plaintext",
};

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
  const [error, setError] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importRunData, setImportRunData] = useState(null);
  const [importWarnings, setImportWarnings] = useState([]);

  const validateFileType = (file) => {
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    
    if (!ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
      return {
        valid: false,
        error: 'סוג הקובץ אינו נתמך. ניתן להעלות רק קבצי Excel בפורמט ‎.xlsx‎ או ‎.xls‎'
      };
    }
    return { valid: true };
  };

  const cleanNumber = (val) => {
    if (val === null || val === undefined || val === '') return { value: 0, valid: true };
    if (typeof val === 'number') return { value: val, valid: true };

    const cleaned = String(val)
      .replace(/\u00A0/g, '')  // NBSP
      .replace(/₪/g, '')
      .replace(/,/g, '')
      .replace(/\s+/g, '')
      .trim();

    if (cleaned === '' || cleaned === '-') return { value: 0, valid: true };

    const num = parseFloat(cleaned);
    if (isNaN(num)) {
      return { value: 0, valid: false, original: val };
    }

    return { value: Math.round(num * 100) / 100, valid: true };
  };

  const extractPhoneNumbers = (phoneText) => {
    if (!phoneText) return { phoneOwner: '', phoneTenant: '', phonePrimary: '', phonesRaw: '' };

    const raw = String(phoneText).trim();
    let normalized = raw.replace(/\+972[\s-]*/g, '0');
    
    const digitsOnly = normalized.replace(/\D/g, '');
    const validNumbers = [];

    // סריקה של רצפים של 9-10 ספרות
    let i = 0;
    while (i < digitsOnly.length) {
      // נסה למצוא רצף של 10 ספרות (סלולרי)
      if (i + 10 <= digitsOnly.length) {
        const candidate = digitsOnly.substring(i, i + 10);
        if (candidate.startsWith('05') && !/^0+$/.test(candidate)) {
          validNumbers.push(candidate);
          i += 10;
          continue;
        }
      }
      
      // נסה למצוא רצף של 9 ספרות (קווי)
      if (i + 9 <= digitsOnly.length) {
        const candidate = digitsOnly.substring(i, i + 9);
        if (candidate.startsWith('0') && !candidate.startsWith('05') && !/^0+$/.test(candidate)) {
          validNumbers.push(candidate);
          i += 9;
          continue;
        }
      }
      
      i++;
    }

    const phoneOwner = validNumbers[0] || '';
    const phoneTenant = validNumbers[1] || '';
    const phonePrimary = phoneOwner || phoneTenant || '';

    return { phoneOwner, phoneTenant, phonePrimary, phonesRaw: raw };
  };

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
      
      reader.onerror = () => {
        reject(new Error('file_read_error'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

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
      
      // PRE-FLIGHT: בדיקת כפילויות עם נרמול
      const apartmentKeys = new Set();
      const duplicates = [];
      let missingApartmentCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const apartmentRaw = (row[FIXED_COLUMN_MAPPING.apartmentNumber] || '').toString().trim();

        if (!apartmentRaw) {
          missingApartmentCount++;
          continue;
        }

        const apartmentKey = normalizeApartmentKey(apartmentRaw);

        if (!apartmentKey) {
          missingApartmentCount++;
          continue;
        }

        if (apartmentKeys.has(apartmentKey)) {
          duplicates.push(apartmentKey);
        } else {
          apartmentKeys.add(apartmentKey);
        }
      }

      if (duplicates.length > 0) {
        const uniqueDuplicates = [...new Set(duplicates)];
        throw new Error(`DUPLICATE_APARTMENTS: ${uniqueDuplicates.join(', ')}`);
      }

      console.log(`[Excel Import - PRE-FLIGHT] Total: ${totalRowsParsed}, Unique: ${apartmentKeys.size}, Missing: ${missingApartmentCount}`);

      setExcelData({ 
        rows, 
        totalRowsParsed, 
        uniqueApartments: apartmentKeys.size,
        expectedRows: totalRowsParsed - missingApartmentCount,
        uniqueInFile: apartmentKeys.size,
        fileName: selectedFile.name 
      });
      setStep(2);
    } catch (err) {
      if (err.message === 'no_sheets') {
        setError('שגיאת פורמט: הקובץ אינו מכיל גיליון נתונים תקין.');
      } else if (err.message === 'empty_sheet' || err.message === 'empty_file') {
        setError('שגיאת תוכן: הקובץ ריק או אינו מכיל נתונים.');
      } else if (err.message === 'file_read_error') {
        setError('שגיאת קריאה: לא ניתן לקרוא את הקובץ (פגום או מוגן).');
      } else if (err.message.startsWith('DUPLICATE_APARTMENTS:')) {
        const duplicateList = err.message.replace('DUPLICATE_APARTMENTS: ', '');
        setError(`שגיאת כפילויות: נמצאו דירות כפולות בקובץ: ${duplicateList}. תקן את הקובץ והעלה מחדש.`);
      } else {
        setError(`שגיאה לא צפויה: ${err.message}`);
      }
      
      if (e.target) {
        e.target.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };

  const processRowWithRetry = async (row, rowIndex, context, queue) => {
    const result = {
      success: false,
      created: false,
      updated: false,
      skipped: false,
      warnings: [],
      error: null
    };

    try {
      const apartmentRaw = (row[FIXED_COLUMN_MAPPING.apartmentNumber] || '').toString().trim();
      const apartmentKey = normalizeApartmentKey(apartmentRaw);

      if (!apartmentKey) {
        result.skipped = true;
        result.warnings.push({
          rowIndex: rowIndex + 2,
          apartmentRaw: apartmentRaw,
          ownerNameRaw: (row[FIXED_COLUMN_MAPPING.ownerName] || '').toString().trim(),
          reason: 'MISSING_APT',
          message: 'מספר דירה ריק או לא תקין'
        });
        result.success = true;
        return result;
      }

      const ownerNameRaw = (row[FIXED_COLUMN_MAPPING.ownerName] || '').toString().trim();
      const phoneRaw = (row[FIXED_COLUMN_MAPPING.phonesRaw] || '').toString().trim();
      const detailsMonthlyRaw = (row[FIXED_COLUMN_MAPPING.detailsMonthly] || '').toString().trim();
      
      const totalDebtClean = cleanNumber(row[FIXED_COLUMN_MAPPING.totalDebt]);
      const hotWaterDebtClean = cleanNumber(row[FIXED_COLUMN_MAPPING.hotWaterDebt]);

      if (!totalDebtClean.valid) {
        result.warnings.push({
          rowIndex: rowIndex + 2,
          apartmentNumber: apartmentKey,
          ownerNameRaw,
          reason: 'BAD_NUMBER',
          field: 'totalDebt',
          rawValue: totalDebtClean.original,
          message: `ערך לא תקין בסה"כ חוב`
        });
      }

      if (!hotWaterDebtClean.valid) {
        result.warnings.push({
          rowIndex: rowIndex + 2,
          apartmentNumber: apartmentKey,
          ownerNameRaw,
          reason: 'BAD_NUMBER',
          field: 'hotWaterDebt',
          rawValue: hotWaterDebtClean.original,
          message: 'ערך לא תקין במים חמים'
        });
      }

      const { phoneOwner, phoneTenant, phonePrimary, phonesRaw } = extractPhoneNumbers(phoneRaw);

      if (!phonePrimary && phoneRaw) {
        result.warnings.push({
          rowIndex: rowIndex + 2,
          apartmentNumber: apartmentKey,
          ownerNameRaw,
          reason: 'PHONE_PARSE_FAILED',
          field: 'phone',
          rawValue: phoneRaw,
          message: 'לא ניתן לחלץ מספר טלפון תקין'
        });
      }

      const totalDebt = totalDebtClean.value;
      const hotWaterDebt = hotWaterDebtClean.value;
      let managementDebt = Math.round((totalDebt - hotWaterDebt) * 100) / 100;

      if (managementDebt < 0) {
        result.warnings.push({
          rowIndex: rowIndex + 2,
          apartmentNumber: apartmentKey,
          ownerNameRaw,
          reason: 'NEGATIVE_MANAGEMENT_DEBT',
          message: `דמי ניהול שליליים (${managementDebt}), מאופס ל-0`,
          rawValues: { totalDebt, hotWaterDebt }
        });
        managementDebt = 0;
      }

      let debt_status_auto = 'תקין';
      if (totalDebt === 0) {
        debt_status_auto = 'תקין';
      } else if (totalDebt > context.settings.threshold_legal_from) {
        debt_status_auto = 'חריגה מופרזת';
      } else if (totalDebt > context.settings.threshold_collect_from) {
        debt_status_auto = 'לגבייה מיידית';
      }

      const existing = context.existingMap[apartmentKey];
      const isEmpty = (val) => {
        if (val === null || val === undefined || val === '') return true;
        const str = String(val).trim();
        return str === '' || str === 'אין מספר' || str === '-' || str === 'לא ידוע' || /^0+$/.test(str);
      };

      // Retry logic for API call
      let attempt = 0;
      let lastError = null;

      while (attempt < MAX_RETRIES) {
        try {
          if (existing) {
            const updateData = {
              apartmentNumber: apartmentKey,
              monthlyDebt: managementDebt,
              specialDebt: hotWaterDebt,
              totalDebt,
              debt_status_auto,
              detailsMonthly: detailsMonthlyRaw,
              phonesRaw: phonesRaw,
              importedThisRun: true,
              lastImportRunId: context.importRunId,
              lastImportAt: context.timestamp,
              flaggedAsCleared: false,
              clearedAt: null
            };
            
            if (ownerNameRaw && ownerNameRaw.trim() !== '') {
              updateData.ownerName = ownerNameRaw.split(/[\/,]/)[0]?.trim() || '';
            }
            
            if (isEmpty(existing.phoneOwner) && !isEmpty(phoneOwner)) {
              updateData.phoneOwner = phoneOwner;
            }
            if (isEmpty(existing.phoneTenant) && !isEmpty(phoneTenant)) {
              updateData.phoneTenant = phoneTenant;
            }
            if (isEmpty(existing.phonePrimary) && !isEmpty(phonePrimary)) {
              updateData.phonePrimary = phonePrimary;
            }

            updateData.notes = existing.notes;
            updateData.lastContactDate = existing.lastContactDate;
            updateData.nextActionDate = existing.nextActionDate;
            updateData.legal_status_id = existing.legal_status_id;
            updateData.legal_status_overridden = existing.legal_status_overridden;
            updateData.legal_status_lock = existing.legal_status_lock;
            updateData.legal_status_updated_at = existing.legal_status_updated_at;
            updateData.legal_status_updated_by = existing.legal_status_updated_by;
            updateData.legal_status_source = existing.legal_status_source;
            updateData.legal_status_manual = existing.legal_status_manual;
            
            await queue.add(() => base44.entities.DebtorRecord.update(existing.id, updateData));
            result.updated = true;
          } else {
            const newRecord = {
              apartmentNumber: apartmentKey,
              ownerName: ownerNameRaw.split(/[\/,]/)[0]?.trim() || '',
              phoneOwner,
              phoneTenant,
              phonePrimary,
              phonesRaw: phonesRaw,
              monthlyDebt: managementDebt,
              specialDebt: hotWaterDebt,
              totalDebt,
              debt_status_auto,
              detailsMonthly: detailsMonthlyRaw,
              detailsSpecial: '',
              monthlyPayment: 0,
              monthsInArrears: 0,
              importedThisRun: true,
              lastImportRunId: context.importRunId,
              lastImportAt: context.timestamp,
              flaggedAsCleared: false
            };

            if (context.defaultLegalStatus) {
              newRecord.legal_status_id = context.defaultLegalStatus.id;
              newRecord.legal_status_overridden = false;
            }
            
            await queue.add(() => base44.entities.DebtorRecord.create(newRecord));
            result.created = true;
          }

          result.success = true;
          break; // Success, exit retry loop
        } catch (err) {
          lastError = err;
          if (isRateLimitError(err) && attempt < MAX_RETRIES - 1) {
            await sleep(RETRY_DELAYS[attempt]);
            attempt++;
          } else {
            throw err;
          }
        }
      }

      if (!result.success && lastError) {
        throw lastError;
      }

    } catch (err) {
      result.error = {
        rowIndex: rowIndex + 2,
        apartmentNumber: apartmentKey || 'לא ידוע',
        errorType: err.message?.includes('Permission') ? 'PERMISSION_DENIED' : 
                   err.message?.includes('Duplicate') ? 'DUPLICATE_KEY' :
                   err.message?.includes('Network') ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR',
        errorMessage: err.message || 'שגיאה לא ידועה'
      };
    }

    return result;
  };

  const processBatch = async (rows, startIdx, endIdx, context) => {
    // Legacy batch processor - no longer used
  };

  const handleImport = async () => {
    setIsImporting(true);
    startImport();
    setProgress(0);
    setError(null);

    const importRunId = `import_${Date.now()}`;
    const importTimestamp = new Date().toISOString();

    let importRun = null;

    try {
      // יצירת ImportRun
      importRun = await base44.entities.ImportRun.create({
        importRunId,
        fileName: excelData.fileName,
        startedAt: importTimestamp,
        status: 'RUNNING',
        stage: 'VALIDATION',
        totalRowsRead: excelData.totalRowsParsed,
        uniqueApartments: excelData.uniqueApartments,
        importMode
      });

      console.log(`[Excel Import] ========== START IMPORT RUN ${importRunId} ==========`);

      const settingsList = await base44.entities.Settings.list();
      const settings = settingsList[0] || { 
        threshold_ok_max: 1000, 
        threshold_collect_from: 1500, 
        threshold_legal_from: 5000 
      };

      // RESET MODE
      if (importMode === 'reset') {
        await base44.entities.ImportRun.update(importRun.id, { stage: 'RESET' });
        console.log(`[Excel Import] RESET MODE: Deleting all records`);
        const existingRecords = await base44.entities.DebtorRecord.list();
        for (const record of existingRecords) {
          await base44.entities.DebtorRecord.delete(record.id);
        }
      }

      // שלב 1: קריאה אחת של כל הרשומות הקיימות
      await base44.entities.ImportRun.update(importRun.id, { stage: 'BUILD_EXISTING_MAP' });
      console.log(`[Excel Import] Loading all existing records...`);
      const allExistingRecords = await base44.entities.DebtorRecord.list();
      
      // בניית Map בזיכרון עם מפתח מנורמל
      const existingMap = {};
      for (const record of allExistingRecords) {
        const normalizedKey = normalizeApartmentKey(record.apartmentNumber);
        existingMap[normalizedKey] = {
          id: record.id,
          phoneOwner: record.phoneOwner,
          phoneTenant: record.phoneTenant,
          phonePrimary: record.phonePrimary,
          monthsInArrears: record.monthsInArrears,
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
      
      console.log(`[Excel Import] Existing map built with ${Object.keys(existingMap).length} apartments`);

      // איפוס דגלים בבאצ'ים
      await base44.entities.ImportRun.update(importRun.id, { stage: 'RESET_FLAGS' });
      console.log(`[Excel Import] Resetting importedThisRun flags...`);
      
      for (let i = 0; i < allExistingRecords.length; i++) {
        await base44.entities.DebtorRecord.update(allExistingRecords[i].id, {
          importedThisRun: false
        });
        
        if (i % 50 === 0) {
          await sleep(500); // Slow down flag updates
        }
      }

      // PROCESS with Queue + Concurrency
      await base44.entities.ImportRun.update(importRun.id, { stage: 'WRITE_WITH_QUEUE' });
      
      const { rows } = excelData;
      const allStatuses = await base44.entities.Status.list();
      const defaultLegalStatus = allStatuses.find(s => s.type === 'LEGAL' && s.is_default === true);

      const context = {
        importRunId: importRun.id,
        timestamp: importTimestamp,
        settings,
        defaultLegalStatus,
        existingMap
      };

      const queue = new ConcurrentQueue(CONCURRENCY);

      let totalCreated = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let totalFailed = 0;
      const allErrors = [];
      const allWarnings = [];

      console.log(`[Excel Import] Processing ${rows.length} rows with concurrency=${CONCURRENCY}`);

      // Process all rows with queue
      const promises = rows.map((row, idx) => 
        processRowWithRetry(row, idx, context, queue).then(result => {
          if (result.created) totalCreated++;
          if (result.updated) totalUpdated++;
          if (result.skipped) totalSkipped++;
          if (result.error) {
            totalFailed++;
            allErrors.push(result.error);
          }
          if (result.warnings) {
            allWarnings.push(...result.warnings);
          }

          // Update progress
          const processed = totalCreated + totalUpdated + totalSkipped + totalFailed;
          const currentProgress = Math.round((processed / rows.length) * 100);
          setProgress(currentProgress);

          return result;
        })
      );

      await Promise.all(promises);

      console.log(`[Excel Import] Completed: created=${totalCreated}, updated=${totalUpdated}, skipped=${totalSkipped}, failed=${totalFailed}`);

      // POST_PROCESS: דירות שלא בקובץ (רק אם SUCCESS או PARTIAL)
      let clearedCount = 0;
      
      if (totalFailed === 0 || totalCreated + totalUpdated > 0) {
        await base44.entities.ImportRun.update(importRun.id, { stage: 'POST_CLEAR_MISSING' });
        console.log(`[Excel Import] Checking for apartments not in file...`);
        const finalRecords = await base44.entities.DebtorRecord.list();

        for (const record of finalRecords) {
          if (!record.importedThisRun && record.totalDebt !== 0) {
            console.log(`[Excel Import] Clearing apartment ${record.apartmentNumber}`);
            try {
              // Retry logic for clearing as well
              let clearSuccess = false;
              for (let attempt = 1; attempt <= 3 && !clearSuccess; attempt++) {
                try {
                  await base44.entities.DebtorRecord.update(record.id, {
                    monthlyDebt: 0,
                    specialDebt: 0,
                    totalDebt: 0,
                    debt_status_auto: 'תקין',
                    flaggedAsCleared: true,
                    clearedAt: importTimestamp
                  });
                  clearedCount++;
                  clearSuccess = true;
                } catch (clearError) {
                  if (isRateLimitError(clearError) && attempt < 3) {
                    await sleep(getRetryDelay(attempt));
                  } else {
                    throw clearError;
                  }
                }
              }
            } catch (clearError) {
              allErrors.push({
                rowIndex: 0,
                apartmentNumber: record.apartmentNumber,
                errorType: 'CLEAR_FAILED',
                errorMessage: `נכשל איפוס דירה: ${clearError.message}`
              });
            }
          }
        }
      } else {
        console.log(`[Excel Import] Skipping POST_CLEAR_MISSING due to high failure rate`);
      }

      // QA - ספירה מדויקת לפי runId
      await base44.entities.ImportRun.update(importRun.id, { stage: 'QA_VALIDATION' });
      console.log(`[Excel Import] ========== QA VALIDATION ==========`);
      const allRecords = await base44.entities.DebtorRecord.list();
      const importedCount = allRecords.filter(r => 
        r.lastImportRunId === importRun.id && r.importedThisRun === true
      ).length;

      const sumMonthly = allRecords.reduce((sum, r) => sum + (r.monthlyDebt || 0), 0);
      const sumSpecial = allRecords.reduce((sum, r) => sum + (r.specialDebt || 0), 0);
      const sumTotal = allRecords.reduce((sum, r) => sum + (r.totalDebt || 0), 0);
      const delta = Math.abs(sumTotal - (sumMonthly + sumSpecial));
      
      const qaValidation = delta <= 0.01;
      const countValidation = importedCount === excelData.uniqueInFile;

      console.log(`[Excel Import - QA] Expected: ${excelData.uniqueInFile}, Imported: ${importedCount}`);
      console.log(`[Excel Import - QA] Created: ${totalCreated}, Updated: ${totalUpdated}`);
      console.log(`[Excel Import - QA] Delta: ${delta.toFixed(2)}`);

      let finalStatus = 'SUCCESS';
      let errorSummary = '';

      if (totalFailed > 0) {
        finalStatus = 'PARTIAL';
        errorSummary = `${totalFailed} שורות נכשלו`;
      }

      if (!qaValidation) {
        errorSummary += (errorSummary ? ', ' : '') + `פער סכומים: ${delta.toFixed(2)}`;
      }

      if (!countValidation) {
        const diff = importedCount - excelData.uniqueInFile;
        if (diff > 0) {
          errorSummary += (errorSummary ? ', ' : '') + `יובאו ${diff} דירות יותר מהצפוי (כפילויות?)`;
        } else {
          errorSummary += (errorSummary ? ', ' : '') + `חסרות ${-diff} דירות`;
        }
      }

      // עדכון ImportRun סופי
      await base44.entities.ImportRun.update(importRun.id, {
        finishedAt: new Date().toISOString(),
        status: finalStatus,
        stage: 'FINISH',
        successRowsCount: totalCreated + totalUpdated,
        createdCount: totalCreated,
        updatedCount: totalUpdated,
        failedRowsCount: totalFailed,
        skippedRowsCount: totalSkipped,
        clearedCount,
        invalidMonthlyCount: totalInvalidMonthly,
        invalidSpecialCount: totalInvalidSpecial,
        qaValidation,
        qaDelta: parseFloat(delta.toFixed(2)),
        errorSummary: errorSummary || 'אין שגיאות',
        errorDetails: allErrors
      });

      // עדכון Settings
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
        skipped: totalSkipped, 
        failed: totalFailed,
        clearedCount,
        invalidMonthly: totalInvalidMonthly,
        invalidSpecial: totalInvalidSpecial,
        total: rows.length,
        expectedRows: excelData.expectedRows,
        uniqueInFile: excelData.uniqueInFile,
        importedCountDB: importedCount,
        qaValidation,
        countValidation,
        delta: delta.toFixed(2),
        errors: allErrors,
        warnings: allWarnings,
        status: finalStatus,
        importRunId
      });
      
      setStep(3);
      
      if (finalStatus === 'SUCCESS') {
        toast.success('הייבוא הושלם בהצלחה');
      } else {
        toast.warning(`הייבוא הושלם חלקית - ${totalFailed} שורות נכשלו`);
      }
      
      console.log(`[Excel Import] ========== END IMPORT RUN ${importRunId} ==========`);
    } catch (err) {
      console.error('[Excel Import] FATAL ERROR:', err);
      
      let errorStage = 'FATAL_ERROR';
      let errorMessage = err.message || 'שגיאה לא ידועה';

      if (errorMessage.includes('READ_EXCEL') || errorMessage.includes('sheet')) {
        errorStage = 'READ_EXCEL_FAILED';
        errorMessage = 'שגיאה בקריאת קובץ האקסל';
      } else if (errorMessage.includes('VALIDATION') || errorMessage.includes('duplicate')) {
        errorStage = 'VALIDATION_FAILED';
      } else if (errorMessage.includes('Permission') || errorMessage.includes('Unauthorized')) {
        errorStage = 'PERMISSION_DENIED';
        errorMessage = 'אין הרשאות מספיקות לביצוע הייבוא';
      } else if (errorMessage.includes('Network') || errorMessage.includes('timeout')) {
        errorStage = 'NETWORK_ERROR';
        errorMessage = 'שגיאת רשת או timeout';
      } else if (isRateLimitError(err)) {
        errorStage = 'RATE_LIMIT_FATAL';
        errorMessage = 'חריגה ממגבלת קצב לאחר ניסיונות חוזרים';
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

      setError(`ייבוא נכשל בשלב ${errorStage}: ${errorMessage} (RunId: ${importRunId})`);
      toast.error('ייבוא נכשל');
    } finally {
      setIsImporting(false);
      finishImport();
    }
  };

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
                <AlertDescription className="text-right">{error}</AlertDescription>
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
                    <span className="import-mapping-letter">D</span>
                    <span className="import-mapping-arrow">→</span>
                    <span className="import-mapping-label">סה"כ חוב</span>
                  </div>
                  <div className="import-mapping-row">
                    <span className="import-mapping-letter">G</span>
                    <span className="import-mapping-arrow">→</span>
                    <span className="import-mapping-label">מים חמים</span>
                  </div>
                  <div className="import-mapping-row">
                    <span className="import-mapping-letter">B</span>
                    <span className="import-mapping-arrow">→</span>
                    <span className="import-mapping-label">שם</span>
                  </div>
                  <div className="import-mapping-row">
                    <span className="import-mapping-letter">H</span>
                    <span className="import-mapping-arrow">→</span>
                    <span className="import-mapping-label">פרטים</span>
                  </div>
                  <div className="import-mapping-row">
                    <span className="import-mapping-letter">C</span>
                    <span className="import-mapping-arrow">→</span>
                    <span className="import-mapping-label">טלפון</span>
                  </div>
                  <div className="import-mapping-row">
                    <span className="import-mapping-letter">-</span>
                    <span className="import-mapping-arrow">→</span>
                    <span className="import-mapping-label">דמי ניהול (מחושב)</span>
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
                      <li>סכומים: עדכון תמיד</li>
                      <li>דמי ניהול מחושב: סה״כ חוב - מים חמים</li>
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
                  <span style={progressTextStyle}>מעבד נתונים…</span>
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
                  עיבוד מהיר עם סנכרון מרוכז
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive" dir="rtl">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="text-right">{error}</AlertDescription>
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
                    <p className="font-bold text-red-800">נמצאו {importResult.errors.length} שגיאות קריטיות:</p>
                    <div className="max-h-40 overflow-y-auto text-xs space-y-1">
                      {importResult.errors.slice(0, 10).map((err, idx) => (
                        <div key={idx} className="text-red-700">
                          שורה {err.rowIndex}, דירה {err.apartmentNumber}: {err.errorMessage}
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
                  <p className="text-xs mt-2 text-slate-600">
                    ייתכן שיש כפילויות במסד הנתונים. מומלץ לבדוק ידנית.
                  </p>
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