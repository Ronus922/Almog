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
  phoneOwner: 2,        // Column C
  specialDebt: 6,       // Column G
  detailsMonthly: 7,    // Column H
  monthlyDebt: 8        // Column I
};

const ALLOWED_FILE_EXTENSIONS = ['.xlsx', '.xls'];
const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES = 6000; // 6 seconds
const DELAY_BETWEEN_WRITES = 300; // ms between individual writes in batch
const MAX_429_PAUSES = 5;
const PAUSE_ON_429 = 60000; // 60 seconds

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isRateLimitError = (error) => {
  const message = error?.message || '';
  return message.includes('429') || 
         message.includes('rate limit') || 
         message.includes('too many requests') ||
         message.includes('Rate limit exceeded');
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
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.2,
};

const progressPercentStyle = {
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.2,
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
      .replace(/₪/g, '')
      .replace(/,/g, '')
      .replace(/\s/g, '')
      .trim();

    if (cleaned === '' || cleaned === '-') return { value: 0, valid: true };

    const num = parseFloat(cleaned);
    if (isNaN(num)) {
      return { value: 0, valid: false, original: val };
    }

    return { value: num, valid: true };
  };

  const extractPhoneNumbers = (phoneText) => {
    if (!phoneText) return { phoneOwner: '', phoneTenant: '', phonePrimary: '' };

    const raw = String(phoneText).trim();
    let normalized = raw.replace(/\+972[\s-]*/g, '0');
    const potentialNumbers = normalized.split(/[\/,;|\n]+/);

    const validNumbers = [];

    for (let part of potentialNumbers) {
      const digitsOnly = part.replace(/\D/g, '');

      if (digitsOnly.length >= 9 && digitsOnly.length <= 13) {
        let cleanNumber = digitsOnly;

        if (cleanNumber.startsWith('972')) {
          cleanNumber = '0' + cleanNumber.substring(3);
        }

        if (cleanNumber.startsWith('0') && cleanNumber.length >= 9 && cleanNumber.length <= 10) {
          validNumbers.push(cleanNumber);
        } else if (cleanNumber.length === 9 && !cleanNumber.startsWith('0')) {
          validNumbers.push('0' + cleanNumber);
        }
      }
    }

    const phoneOwner = validNumbers[0] || '';
    const phoneTenant = validNumbers[1] || '';
    const phonePrimary = phoneOwner || phoneTenant || '';

    return { phoneOwner, phoneTenant, phonePrimary };
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
      
      // PRE-FLIGHT: בדיקת כפילויות
      const apartmentNumbers = [];
      const duplicates = [];
      let missingApartmentCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const apartmentNumber = (row[FIXED_COLUMN_MAPPING.apartmentNumber] || '').toString().trim();
        
        if (!apartmentNumber) {
          missingApartmentCount++;
          continue;
        }

        if (apartmentNumbers.includes(apartmentNumber)) {
          duplicates.push(apartmentNumber);
        } else {
          apartmentNumbers.push(apartmentNumber);
        }
      }

      if (duplicates.length > 0) {
        const uniqueDuplicates = [...new Set(duplicates)];
        throw new Error(`DUPLICATE_APARTMENTS: ${uniqueDuplicates.join(', ')}`);
      }

      console.log(`[Excel Import - PRE-FLIGHT] Total: ${totalRowsParsed}, Unique: ${apartmentNumbers.length}, Missing: ${missingApartmentCount}`);

      setExcelData({ rows, totalRowsParsed, uniqueApartments: apartmentNumbers.length, fileName: selectedFile.name });
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

  const processBatch = async (rows, startIdx, endIdx, context) => {
    const batchResults = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      invalidMonthly: 0,
      invalidSpecial: 0,
      errors: []
    };

    for (let i = startIdx; i < endIdx && i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const apartmentNumber = (row[FIXED_COLUMN_MAPPING.apartmentNumber] || '').toString().trim();
        
        if (!apartmentNumber) {
          batchResults.skipped++;
          continue;
        }

        const ownerNameRaw = (row[FIXED_COLUMN_MAPPING.ownerName] || '').toString().trim();
        const phoneRaw = (row[FIXED_COLUMN_MAPPING.phoneOwner] || '').toString().trim();
        const detailsMonthlyRaw = (row[FIXED_COLUMN_MAPPING.detailsMonthly] || '').toString().trim();
        
        const monthlyDebtClean = cleanNumber(row[FIXED_COLUMN_MAPPING.monthlyDebt]);
        const specialDebtClean = cleanNumber(row[FIXED_COLUMN_MAPPING.specialDebt]);

        if (!monthlyDebtClean.valid) {
          batchResults.invalidMonthly++;
          batchResults.errors.push({
            rowIndex: i + 2,
            apartmentNumber,
            errorType: 'INVALID_MONTHLY_DEBT',
            errorMessage: `ערך לא תקין בדמי ניהול: "${monthlyDebtClean.original}"`
          });
        }

        if (!specialDebtClean.valid) {
          batchResults.invalidSpecial++;
          batchResults.errors.push({
            rowIndex: i + 2,
            apartmentNumber,
            errorType: 'INVALID_SPECIAL_DEBT',
            errorMessage: `ערך לא תקין במים חמים: "${specialDebtClean.original}"`
          });
        }

        const { phoneOwner, phoneTenant, phonePrimary } = extractPhoneNumbers(phoneRaw);

        const monthlyDebt = monthlyDebtClean.value;
        const specialDebt = specialDebtClean.value;
        const totalDebt = Math.round(((monthlyDebt || 0) + (specialDebt || 0)) * 100) / 100;

        let debt_status_auto = 'תקין';
        if (totalDebt === 0) {
          debt_status_auto = 'תקין';
        } else if (totalDebt > context.settings.threshold_legal_from) {
          debt_status_auto = 'חריגה מופרזת';
        } else if (totalDebt > context.settings.threshold_collect_from) {
          debt_status_auto = 'לגבייה מיידית';
        }

        // Use existingMap instead of DB lookup
        const existing = context.existingMap[apartmentNumber];

        const isEmpty = (val) => {
          if (val === null || val === undefined || val === '') return true;
          const str = String(val).trim();
          return str === '' || str === 'אין מספר' || str === '-' || str === 'לא ידוע' || /^0+$/.test(str);
        };

        if (existing) {
          const updateData = {
            monthlyDebt,
            specialDebt,
            totalDebt,
            debt_status_auto,
            detailsMonthly: detailsMonthlyRaw,
            phonesRaw: phoneRaw,
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
          
          if (isEmpty(existing.monthsInArrears) && detailsMonthlyRaw) {
            // Calculate from details if needed
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
          
          await base44.entities.DebtorRecord.update(existing.id, updateData);
          batchResults.updated++;
        } else {
          const newRecord = {
            apartmentNumber,
            ownerName: ownerNameRaw.split(/[\/,]/)[0]?.trim() || '',
            phoneOwner,
            phoneTenant,
            phonePrimary,
            phonesRaw: phoneRaw,
            monthlyDebt,
            specialDebt,
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
          
          await base44.entities.DebtorRecord.create(newRecord);
          batchResults.created++;
        }
        
        // Delay between writes
        await sleep(DELAY_BETWEEN_WRITES);
      } catch (rowError) {
        batchResults.failed++;
        const apartmentNumber = (row[FIXED_COLUMN_MAPPING.apartmentNumber] || '').toString().trim();
        
        let errorType = 'UNKNOWN_ERROR';
        let errorMessage = rowError.message || 'שגיאה לא ידועה';

        if (errorMessage.includes('Permission denied') || errorMessage.includes('Unauthorized')) {
          errorType = 'PERMISSION_DENIED';
          errorMessage = 'אין הרשאה לעדכן רשומה';
        } else if (errorMessage.includes('Duplicate') || errorMessage.includes('unique')) {
          errorType = 'DUPLICATE_KEY';
          errorMessage = 'מספר דירה כבר קיים במערכת';
        } else if (errorMessage.includes('Network') || errorMessage.includes('timeout')) {
          errorType = 'NETWORK_ERROR';
          errorMessage = 'שגיאת רשת או timeout';
        }

        batchResults.errors.push({
          rowIndex: i + 2,
          apartmentNumber: apartmentNumber || 'לא ידוע',
          errorType,
          errorMessage
        });

        console.error(`[Excel Import] Row ${i + 2} failed:`, {
          apartmentNumber,
          errorType,
          error: rowError
        });
      }
    }

    return batchResults;
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
      
      // בניית Map בזיכרון
      const existingMap = {};
      for (const record of allExistingRecords) {
        existingMap[record.apartmentNumber] = {
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

      // UPSERT בבאצ'ים עם delays
      await base44.entities.ImportRun.update(importRun.id, { stage: 'WRITE_BATCHES' });
      
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

      let totalCreated = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let totalFailed = 0;
      let totalInvalidMonthly = 0;
      let totalInvalidSpecial = 0;
      const allErrors = [];

      const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
      let pauseCount = 0;

      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        const startIdx = batchIdx * BATCH_SIZE;
        const endIdx = Math.min((batchIdx + 1) * BATCH_SIZE, rows.length);

        console.log(`[Excel Import] Processing batch ${batchIdx + 1}/${totalBatches} (rows ${startIdx + 1}-${endIdx})`);

        let batchSuccess = false;
        let batchRetries = 0;

        while (!batchSuccess && batchRetries < 3) {
          try {
            const batchResults = await processBatch(rows, startIdx, endIdx, context);

            totalCreated += batchResults.created;
            totalUpdated += batchResults.updated;
            totalSkipped += batchResults.skipped;
            totalFailed += batchResults.failed;
            totalInvalidMonthly += batchResults.invalidMonthly;
            totalInvalidSpecial += batchResults.invalidSpecial;
            allErrors.push(...batchResults.errors);

            batchSuccess = true;
          } catch (batchError) {
            if (isRateLimitError(batchError) && pauseCount < MAX_429_PAUSES) {
              pauseCount++;
              console.warn(`[Excel Import] Rate limit on batch ${batchIdx + 1}, pausing for ${PAUSE_ON_429 / 1000}s (pause ${pauseCount}/${MAX_429_PAUSES})`);
              toast.warning(`המערכת מאטה את קצב הייבוא... ממשיכים אוטומטית`);
              await sleep(PAUSE_ON_429);
              batchRetries++;
            } else {
              throw batchError;
            }
          }
        }

        if (!batchSuccess) {
          throw new Error(`Failed to process batch ${batchIdx + 1} after ${MAX_429_PAUSES} pauses`);
        }

        // Update progress
        const currentProgress = Math.round(((endIdx) / rows.length) * 100);
        setProgress(currentProgress);

        // Update ImportRun with current counts (less frequently)
        if (batchIdx % 5 === 0 || batchIdx === totalBatches - 1) {
          try {
            await base44.entities.ImportRun.update(importRun.id, {
              createdCount: totalCreated,
              updatedCount: totalUpdated,
              failedRowsCount: totalFailed,
              skippedRowsCount: totalSkipped,
              successRowsCount: totalCreated + totalUpdated,
              lastProcessedRowIndex: endIdx
            });
          } catch (err) {
            console.warn('[Excel Import] Failed to update ImportRun progress');
          }
        }

        // Fixed delay between batches
        if (batchIdx < totalBatches - 1) {
          console.log(`[Excel Import] Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch`);
          await sleep(DELAY_BETWEEN_BATCHES);
        }
      }

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

      // QA
      await base44.entities.ImportRun.update(importRun.id, { stage: 'QA_VALIDATION' });
      console.log(`[Excel Import] ========== QA VALIDATION ==========`);
      const allRecords = await base44.entities.DebtorRecord.list();
      const importedCount = allRecords.filter(r => r.importedThisRun).length;

      const sumMonthly = allRecords.reduce((sum, r) => sum + (r.monthlyDebt || 0), 0);
      const sumSpecial = allRecords.reduce((sum, r) => sum + (r.specialDebt || 0), 0);
      const sumTotal = allRecords.reduce((sum, r) => sum + (r.totalDebt || 0), 0);
      const delta = Math.abs(sumTotal - (sumMonthly + sumSpecial));
      
      const qaValidation = delta <= 0.01;
      const countValidation = importedCount === excelData.uniqueApartments;

      console.log(`[Excel Import - QA] Expected: ${excelData.uniqueApartments}, Imported: ${importedCount}`);
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
        errorSummary += (errorSummary ? ', ' : '') + `חסרות ${excelData.uniqueApartments - importedCount} דירות`;
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
      setImportResult({ 
        created: totalCreated, 
        updated: totalUpdated, 
        skipped: totalSkipped, 
        failed: totalFailed,
        clearedCount,
        invalidMonthly: totalInvalidMonthly,
        invalidSpecial: totalInvalidSpecial,
        total: rows.length,
        uniqueApartments: excelData.uniqueApartments,
        importedCount,
        qaValidation,
        countValidation,
        delta: delta.toFixed(2),
        errors: allErrors,
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

  return (
    <Card className="border-0 shadow-lg max-w-3xl mx-auto overflow-hidden rounded-2xl">
      <style>{`
        @media (max-width: 480px) {
          .${uploadBtnClass} { width: 100%; }
        }
        @media (max-width: 480px) {
          .import-mapping-grid { grid-template-columns: 1fr !important; }
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
                  <div style={mappingItemStyle}>A → דירה</div>
                  <div style={mappingItemStyle}>G → מים חמים</div>
                  <div style={mappingItemStyle}>B → שם</div>
                  <div style={mappingItemStyle}>H → פרטים</div>
                  <div style={mappingItemStyle}>C → טלפון</div>
                  <div style={mappingItemStyle}>I → דמי ניהול</div>
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
                      <li>סה״כ חוב מחושב: דמי ניהול + מים חמים</li>
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
                  height: 5,
                  minHeight: 5,
                  maxHeight: 5,
                  backgroundColor: "#e5e7eb",
                  borderRadius: 999,
                  overflow: "hidden",
                }}>
                  <div style={{
                    width: `${progress}%`,
                    height: 5,
                    minHeight: 5,
                    maxHeight: 5,
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

            {importResult.errors && importResult.errors.length > 0 && (
              <Alert className="bg-red-50 border-red-200 mb-4" dir="rtl">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-right">
                  <div className="space-y-2">
                    <p className="font-bold text-red-800">נמצאו {importResult.errors.length} שגיאות:</p>
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
                    <p className="text-sm">• חוסר התאמה בכמות: צפוי {importResult.uniqueApartments}, יובא {importResult.importedCount}</p>
                  )}
                  {!importResult.qaValidation && (
                    <p className="text-sm">• פער בסכומים: {importResult.delta}</p>
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