import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppButton from "@/components/ui/app-button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, 
  ArrowLeft, Loader2, RefreshCw, Database
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { base44 } from '@/api/base44Client';
import * as XLSX from 'xlsx';
import { useImport } from './ImportContext';
import { toast } from 'sonner';

// מיפוי קבוע לעמודות Excel - אינדקסים מתחילים מ-0
const FIXED_COLUMN_MAPPING = {
  apartmentNumber: 0,  // Column A
  ownerName: 1,         // Column B
  phoneOwner: 2,        // Column C
  specialDebt: 6,       // Column G
  detailsMonthly: 7,    // Column H
  monthlyDebt: 8        // Column I
};

const REQUIRED_COLUMNS = [0, 1, 2, 6, 7, 8]; // A, B, C, G, H, I

const ALLOWED_FILE_EXTENSIONS = ['.xlsx', '.xls'];

export default function ExcelImporter({ onImportComplete }) {
  const { startImport, finishImport, importInProgress } = useImport();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [excelData, setExcelData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mappings, setMappings] = useState({});
  const [importMode, setImportMode] = useState('fill_missing');
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const validateFileType = (file) => {
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    
    // בדיקת סיומת בלבד - לא לסמוך על MIME
    // XLSX יכול להגיע כ-zip, octet-stream, וכו'
    if (!ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
      return {
        valid: false,
        error: 'סוג הקובץ אינו נתמך. ניתן להעלות רק קבצי Excel בפורמט ‎.xlsx‎ או ‎.xls‎'
      };
    }

    return { valid: true };
  };

  const validateRequiredColumns = (firstRow) => {
    // בדיקת מספר עמודות - חייב להיות לפחות 9 עמודות (עד I)
    if (!firstRow || firstRow.length < 9) {
      return {
        valid: false,
        error: `מבנה הקובץ אינו תואם. הקובץ חייב להכיל לפחות 9 עמודות (A-I)`
      };
    }

    // בדיקה שכל העמודות הנדרשות אינן ריקות בשורה הראשונה
    const missingColumns = [];
    REQUIRED_COLUMNS.forEach(colIndex => {
      const colLetter = String.fromCharCode(65 + colIndex); // A=65, B=66, etc.
      if (!firstRow[colIndex] || String(firstRow[colIndex]).trim() === '') {
        missingColumns.push(`עמודה ${colLetter}`);
      }
    });

    if (missingColumns.length > 0) {
      return {
        valid: false,
        error: `עמודות חובה ריקות: ${missingColumns.join(', ')}`
      };
    }

    return { valid: true };
  };

  const normalizeHeaders = (headers) => {
    return headers.map(h => {
      if (!h) return '';
      // ניקוי רווחים, תווים מיוחדים
      return h.toString().trim().replace(/\s+/g, ' ');
    });
  };

  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          console.log(`[Excel Import - readWorkbook] Reading file: ${file.name}`);
          console.log(`[Excel Import - readWorkbook] File size: ${file.size} bytes, Type: ${file.type || 'unknown'}`);
          
          const data = new Uint8Array(e.target.result);
          console.log(`[Excel Import - readWorkbook] Read ${data.length} bytes from file`);
          
          // קריאת הקובץ
          const workbook = XLSX.read(data, { type: 'array' });
          console.log(`[Excel Import - readWorkbook] Workbook loaded successfully`);
          console.log(`[Excel Import - readWorkbook] Available sheets: ${workbook.SheetNames.join(', ')}`);
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            console.error(`[Excel Import - readWorkbook] No sheets found in workbook`);
            throw new Error('no_sheets');
          }
          
          // קריאת הגיליון הראשון
          const firstSheetName = workbook.SheetNames[0];
          console.log(`[Excel Import - readSheet] Reading first sheet: "${firstSheetName}"`);
          const worksheet = workbook.Sheets[firstSheetName];
          
          // המרה ל-JSON עם כותרות
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          console.log(`[Excel Import - parseRows] Parsed ${jsonData.length} rows (including header)`);
          
          if (jsonData.length === 0) {
            console.error(`[Excel Import - parseRows] Sheet is empty`);
            throw new Error('empty_sheet');
          }
          
          // השורה הראשונה היא כותרות
          const rawHeaders = jsonData[0];
          console.log(`[Excel Import - mapColumns] Raw headers:`, rawHeaders);
          
          // ניקוי כותרות
          const headers = normalizeHeaders(rawHeaders);
          console.log(`[Excel Import - mapColumns] Normalized headers:`, headers);
          
          // המרת שורות לאובייקטים
          const rows = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const rowObj = {};
            headers.forEach((header, idx) => {
              rowObj[header] = row[idx] !== undefined ? row[idx] : '';
            });
            rows.push(rowObj);
          }
          
          console.log(`[Excel Import - parseRows] Created ${rows.length} data objects`);
          console.log(`[Excel Import - parseRows] Sample row:`, rows[0]);
          
          resolve({ headers, rows });
        } catch (err) {
          console.error(`[Excel Import - ERROR] Exception during Excel parsing:`, {
            stage: 'readWorkbook/parseRows',
            error: err.message,
            stack: err.stack,
            fileName: file.name
          });
          reject(err);
        }
      };
      
      reader.onerror = (err) => {
        console.error(`[Excel Import - ERROR] FileReader error:`, {
          stage: 'readFile',
          error: err,
          fileName: file.name
        });
        reject(new Error('file_read_error'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // בדיקת סוג הקובץ
    const fileValidation = validateFileType(selectedFile);
    if (!fileValidation.valid) {
      setError(fileValidation.error);
      e.target.value = '';
      return;
    }

    setFile(selectedFile);
    setIsUploading(true);
    setError(null);

    console.log(`[Excel Import] ========== Starting Excel Import ==========`);
    console.log(`[Excel Import] File: ${selectedFile.name}`);
    console.log(`[Excel Import] Extension: ${selectedFile.name.substring(selectedFile.name.lastIndexOf('.'))}`);
    console.log(`[Excel Import] MIME: ${selectedFile.type || 'unknown'}`);
    console.log(`[Excel Import] Size: ${selectedFile.size} bytes`);

    try {
      // קריאת הקובץ בצד הקליינט
      console.log(`[Excel Import] Stage: Reading Excel file in client`);
      const { headers: extractedHeaders, rows: extractedRows } = await readExcelFile(selectedFile);
      
      if (extractedRows.length === 0) {
        console.error(`[Excel Import] No data rows found`);
        throw new Error('empty_file');
      }
      
      setHeaders(extractedHeaders);
      setExcelData(extractedRows);

      // בדיקת מבנה קבוע - עמודות A,B,C,G,H,I
      console.log(`[Excel Import] Stage: Validating fixed column structure`);
      const validation = validateRequiredColumns(extractedHeaders);
      if (!validation.valid) {
        console.error(`[Excel Import - validation] ${validation.error}`);
        throw new Error(validation.error);
      }

      console.log(`[Excel Import] Fixed column mapping: A→דירה, B→שם, C→טלפון, G→מים חמים, H→פרטים, I→דמי ניהול`);

      console.log(`[Excel Import] ========== Success: Proceeding to step 2 ==========`);
      setStep(2);
    } catch (err) {
      console.error('[Excel Import - ERROR] ========== Import Failed ==========');
      console.error('[Excel Import - ERROR] Details:', {
        message: err.message,
        stack: err.stack,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      });
      
      // הודעות שגיאה ברורות למשתמש לפי סוג השגיאה
      if (err.message === 'no_sheets') {
        setError('הקובץ אינו מכיל גיליון נתונים.');
      } else if (err.message === 'empty_sheet' || err.message === 'empty_file') {
        setError('הקובץ ריק או אינו מכיל נתונים. אנא בדוק את תוכן הקובץ.');
      } else if (err.message === 'file_read_error') {
        setError('לא ניתן לקרוא את קובץ האקסל. ייתכן שהוא פגום או מוגן.');
      } else if (err.message.includes('חסרות עמודות חובה')) {
        setError(err.message);
      } else if (err.name === 'TypeError' || err.message.includes('read')) {
        setError('לא ניתן לקרוא את קובץ האקסל. ייתכן שהוא פגום או מוגן.');
      } else {
        setError('אירעה שגיאה בעיבוד הקובץ. נסה שוב. אם הבעיה חוזרת פנה למנהל מערכת.');
      }
      
      // איפוס שדה הקובץ
      if (e.target) {
        e.target.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };

  const calculateMonthsInArrears = (detailsText) => {
    if (!detailsText || typeof detailsText !== 'string') return 0;

    console.log(`[Excel Import - calculateMonthsInArrears] Processing: "${detailsText}"`);

    // חיפוש טווח תאריכים בפורמט MM/YY - MM/YY
    const rangeMatch = detailsText.match(/(\d{1,2})\/(\d{2})\s*-\s*(\d{1,2})\/(\d{2})/);
    if (rangeMatch) {
      const [, startMonth, startYear, endMonth, endYear] = rangeMatch;
      // המרת YY ל-20YY
      const fullStartYear = 2000 + parseInt(startYear);
      const fullEndYear = 2000 + parseInt(endYear);

      const start = fullStartYear * 12 + parseInt(startMonth);
      const end = fullEndYear * 12 + parseInt(endMonth);
      const months = Math.abs(end - start) + 1;

      console.log(`[Excel Import - calculateMonthsInArrears] Range found: ${startMonth}/${startYear} - ${endMonth}/${endYear} = ${months} months`);
      return months;
    }

    // חיפוש חודש בודד בפורמט MM/YY
    const singleMatch = detailsText.match(/(\d{1,2})\/(\d{2})/);
    if (singleMatch) {
      console.log(`[Excel Import - calculateMonthsInArrears] Single month found: ${singleMatch[1]}/${singleMatch[2]} = 1 month`);
      return 1;
    }

    console.log(`[Excel Import - calculateMonthsInArrears] No valid date pattern found`);
    return 0;
  };

  const parseNumber = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;

    // הסרת תווים מיוחדים (₪, פסיקים, רווחים)
    const cleaned = String(val)
      .replace(/₪/g, '')
      .replace(/,/g, '')
      .replace(/\s/g, '')
      .trim();

    if (cleaned === '' || cleaned === '-') return 0;

    const num = parseFloat(cleaned);
    if (isNaN(num)) {
      console.warn(`[Excel Import - parseNumber] Failed to parse: "${val}" → "${cleaned}"`);
      return 0;
    }

    return num;
  };

  const extractPhoneNumbers = (phoneText) => {
    if (!phoneText) return { phoneOwner: '', phoneTenant: '', phonePrimary: '' };

    const raw = String(phoneText).trim();

    // המרת +972 ל-0
    let normalized = raw.replace(/\+972[\s-]*/g, '0');

    // פיצול לפי מפרידים נפוצים
    const potentialNumbers = normalized.split(/[\/,;|\n]+/);

    const validNumbers = [];

    for (let part of potentialNumbers) {
      // ניקוי - השארת ספרות בלבד
      const digitsOnly = part.replace(/\D/g, '');

      // בדיקת אורך תקין (9-10 ספרות אחרי ניקוי, או 12-13 עם קידומת)
      if (digitsOnly.length >= 9 && digitsOnly.length <= 13) {
        let cleanNumber = digitsOnly;

        // טיפול בקידומת 972
        if (cleanNumber.startsWith('972')) {
          cleanNumber = '0' + cleanNumber.substring(3);
        }

        // וידוא שמתחיל ב-0 ואורך 9-10
        if (cleanNumber.startsWith('0') && cleanNumber.length >= 9 && cleanNumber.length <= 10) {
          validNumbers.push(cleanNumber);
        } else if (cleanNumber.length === 9 && !cleanNumber.startsWith('0')) {
          // מספר ללא 0 בהתחלה - נוסיף
          validNumbers.push('0' + cleanNumber);
        }
      }
    }

    console.log(`[Excel Import - extractPhones] Raw: "${raw}" → Valid: ${validNumbers.join(', ')}`);

    const phoneOwner = validNumbers[0] || '';
    const phoneTenant = validNumbers[1] || '';
    const phonePrimary = phoneOwner || phoneTenant || '';

    return { phoneOwner, phoneTenant, phonePrimary };
  };

  const getColumnValue = (row, columnName) => {
    // קבלת ערך עמודה עם trim
    if (!columnName) return '';
    // חיפוש לפי שם העמודה המדויק או עם/בלי רווחים
    const value = row[columnName] || row[columnName.trim()] || '';
    return value;
  };

  const handleImport = async () => {
    setIsImporting(true);
    startImport(); // Mark import as in progress
    setProgress(0);
    setError(null);

    console.log(`[Excel Import] Starting import of ${excelData.length} rows with fixed column mapping`);

    try {

      // Fetch settings for threshold calculation
      const settingsList = await base44.entities.Settings.list();
      const settings = settingsList[0] || { 
        threshold_ok_max: 1000, 
        threshold_collect_from: 1500, 
        threshold_legal_from: 5000 
      };

      // Helper function to calculate debt status
      const calculateDebtStatus = (totalDebt) => {
        if (!totalDebt || totalDebt <= settings.threshold_ok_max) return 'תקין';
        if (totalDebt > settings.threshold_ok_max && totalDebt < settings.threshold_legal_from) return 'לגבייה מיידית';
        return 'חריגה מופרזת';
      };

      // אם נבחר איפוס מלא - מחיקת כל הרשומות
      if (importMode === 'reset') {
        console.log(`[Excel Import] Reset mode: deleting all existing records`);
        const existingRecords = await base44.entities.DebtorRecord.list();
        for (const record of existingRecords) {
          await base44.entities.DebtorRecord.delete(record.id);
        }
      }

      // קבלת רשומות קיימות למצב עדכון
      let existingRecords = [];
      if (importMode !== 'reset') {
        existingRecords = await base44.entities.DebtorRecord.list();
        console.log(`[Excel Import] Mode ${importMode}: found ${existingRecords.length} existing records`);
      }

      const totalRows = excelData.length;
      let created = 0;
      let updated = 0;
      let errors = 0;
      const errorDetails = [];

      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        
        try {
          // קריאת ערכים לפי אינדקס קבוע
          const rowArray = Object.values(row);
          
          const apartmentNumber = (rowArray[FIXED_COLUMN_MAPPING.apartmentNumber] || '').toString().trim();
          
          // דילוג על שורות ריקות
          if (!apartmentNumber) {
            console.log(`[Excel Import - dbInsert] Row ${i + 1}: Empty apartment number, skipping`);
            errors++;
            continue;
          }

          const ownerNameRaw = (rowArray[FIXED_COLUMN_MAPPING.ownerName] || '').toString().trim();
          const phoneRaw = (rowArray[FIXED_COLUMN_MAPPING.phoneOwner] || '').toString().trim();
          const specialDebtRaw = rowArray[FIXED_COLUMN_MAPPING.specialDebt];
          const detailsMonthlyRaw = (rowArray[FIXED_COLUMN_MAPPING.detailsMonthly] || '').toString().trim();
          const monthlyDebtRaw = rowArray[FIXED_COLUMN_MAPPING.monthlyDebt];

          const { phoneOwner, phoneTenant, phonePrimary } = extractPhoneNumbers(phoneRaw);

          // ניקוי מספרים
          const monthlyDebt = parseNumber(monthlyDebtRaw);
          const specialDebt = parseNumber(specialDebtRaw);
          
          const record = {
            apartmentNumber,
            ownerName: ownerNameRaw.split(/[\/,]/)[0]?.trim() || '',
            phoneOwner,
            phoneTenant,
            phonePrimary,
            phonesRaw: phoneRaw,
            monthlyDebt,
            specialDebt,
            detailsMonthly: detailsMonthlyRaw,
            detailsSpecial: '',
            monthlyPayment: 0
          };

          // חישוב totalDebt = monthlyDebt + specialDebt (חובה!)
          record.totalDebt = Math.round(((record.monthlyDebt || 0) + (record.specialDebt || 0)) * 100) / 100;

          // חישוב חודשי פיגור
          record.monthsInArrears = calculateMonthsInArrears(record.detailsMonthly);

          if (record.monthsInArrears === 0 && record.detailsMonthly) {
            console.warn(`[Excel Import - dbInsert] Row ${i + 1}: Could not calculate months in arrears from: "${record.detailsMonthly}"`);
          }

          // Calculate automatic debt status - לפי דמי ניהול בלבד (לא מים חמים)
          let debt_status_auto = 'תקין';
          if (record.monthlyDebt === 0 || record.monthlyDebt === null) {
            debt_status_auto = 'תקין';
          } else if (record.monthlyDebt > settings.threshold_legal_from) {
            debt_status_auto = 'חריגה מופרזת';
          } else if (record.monthlyDebt > settings.threshold_collect_from) {
            debt_status_auto = 'לגבייה מיידית';
          }
          record.debt_status_auto = debt_status_auto;

          // בדיקה אם דירה קיימת
          const existing = existingRecords.find(r => r.apartmentNumber === record.apartmentNumber);

          // Fetch all legal statuses once
          const allStatuses = await base44.entities.Status.list();
          const legalStatuses = allStatuses.filter(s => s.type === 'LEGAL' && s.is_active);
          const defaultLegalStatus = allStatuses.find(s => s.type === 'LEGAL' && s.is_default === true);

          if (existing) {
            // Apply update rules
            const updateData = {
              // עדכן תמיד - סכומים
              totalDebt: record.totalDebt,
              monthlyDebt: record.monthlyDebt,
              specialDebt: record.specialDebt,
              monthlyPayment: record.monthlyPayment,
              monthsInArrears: record.monthsInArrears,
              debt_status_auto: record.debt_status_auto,
              detailsMonthly: record.detailsMonthly,
              detailsSpecial: record.detailsSpecial,
              phonesRaw: record.phonesRaw
            };
            
            // owner_name: עדכן תמיד אם לא ריק
            if (record.ownerName && record.ownerName.trim() !== '') {
              updateData.ownerName = record.ownerName;
            }
            
            // טלפונים: עדכן רק אם השדה במערכת ריק
            const isEmpty = (val) => {
              if (val === null || val === undefined || val === '') return true;
              const str = String(val).trim();
              return str === '' || str === 'אין מספר' || str === '-' || str === 'לא ידוע' || /^0+$/.test(str);
            };
            
            if (isEmpty(existing.phoneOwner) && !isEmpty(record.phoneOwner)) {
              updateData.phoneOwner = record.phoneOwner;
            }
            if (isEmpty(existing.phoneTenant) && !isEmpty(record.phoneTenant)) {
              updateData.phoneTenant = record.phoneTenant;
            }
            if (isEmpty(existing.phonePrimary) && !isEmpty(record.phonePrimary)) {
              updateData.phonePrimary = record.phonePrimary;
            }

            // CRITICAL: Always preserve manually edited fields (NEVER overwrite from import)
            updateData.notes = existing.notes;
            updateData.lastContactDate = existing.lastContactDate;
            updateData.nextActionDate = existing.nextActionDate;
            updateData.legal_status_manual = existing.legal_status_manual;
            
            // CRITICAL: Protect existing valid legal status - never overwrite from import
            const existingHasValidStatus = existing.legal_status_id && 
              legalStatuses.some(s => s.id === existing.legal_status_id);
            
            if (existingHasValidStatus) {
              // Existing record has valid legal status - preserve it
              updateData.legal_status_id = existing.legal_status_id;
              updateData.legal_status_overridden = existing.legal_status_overridden;
              updateData.legal_status_lock = existing.legal_status_lock;
              updateData.legal_status_updated_at = existing.legal_status_updated_at;
              updateData.legal_status_updated_by = existing.legal_status_updated_by;
              updateData.legal_status_source = existing.legal_status_source;
              console.log(`[Excel Import - dbInsert] Protected existing status for apartment ${record.apartmentNumber}`);
            } else {
              // Invalid or missing status - fix it with default
              if (defaultLegalStatus) {
                updateData.legal_status_id = defaultLegalStatus.id;
                updateData.legal_status_overridden = false;
                console.log(`[Excel Import - dbInsert] Fixed invalid status for apartment ${record.apartmentNumber}`);
              }
            }
            
            await base44.entities.DebtorRecord.update(existing.id, updateData);
            updated++;
            console.log(`[Excel Import - dbInsert] Updated apartment ${record.apartmentNumber} (mode: ${importMode})`);
          } else {
            // New record - debt_status_auto already calculated above
            // Assign default legal status
            if (defaultLegalStatus) {
              record.legal_status_id = defaultLegalStatus.id;
              record.legal_status_overridden = false;
            }
            
            await base44.entities.DebtorRecord.create(record);
            created++;
            console.log(`[Excel Import - dbInsert] Created apartment ${record.apartmentNumber} with default status`);
          }
        } catch (rowError) {
          console.error(`[Excel Import - dbInsert] Error importing row ${i + 1}:`, {
            error: rowError.message,
            stack: rowError.stack,
            rowData: row
          });
          errors++;
          errorDetails.push(`שורה ${i + 1}: ${rowError.message || 'שגיאה לא ידועה'}`);
        }

        setProgress(Math.round(((i + 1) / totalRows) * 100));
      }

      console.log(`[Excel Import] Import completed: ${created} created, ${updated} updated, ${errors} errors`);
      
      if (errorDetails.length > 0) {
        console.warn(`[Excel Import] Error details:`, errorDetails);
      }

      // QA Validation - בדיקת עקביות
      console.log('[Excel Import] Running QA validation...');
      const allRecords = await base44.entities.DebtorRecord.list();
      const sumMonthly = allRecords.reduce((sum, r) => sum + (r.monthlyDebt || 0), 0);
      const sumSpecial = allRecords.reduce((sum, r) => sum + (r.specialDebt || 0), 0);
      const sumTotal = allRecords.reduce((sum, r) => sum + (r.totalDebt || 0), 0);
      const delta = Math.abs(sumTotal - (sumMonthly + sumSpecial));
      
      console.log(`[Excel Import - QA] Σ(monthlyDebt) = ${sumMonthly}`);
      console.log(`[Excel Import - QA] Σ(specialDebt) = ${sumSpecial}`);
      console.log(`[Excel Import - QA] Σ(totalDebt) = ${sumTotal}`);
      console.log(`[Excel Import - QA] Delta = ${delta}`);
      
      if (delta > 0.01) {
        console.error('[Excel Import - QA] ❌ VALIDATION FAILED: Sum inconsistency detected!');
        toast.error(`אזהרה: נמצאו פערים בסכומים (${delta.toFixed(2)})`);
      } else {
        console.log('[Excel Import - QA] ✅ Validation passed');
      }

      // עדכון תאריך ייבוא אחרון ב-Settings
      try {
        const settingsList = await base44.entities.Settings.list();
        if (settingsList.length > 0) {
          await base44.entities.Settings.update(settingsList[0].id, {
            last_import_at: new Date().toISOString()
          });
          console.log('[Excel Import] Updated last_import_at in Settings');
        } else {
          await base44.entities.Settings.create({
            last_import_at: new Date().toISOString()
          });
          console.log('[Excel Import] Created Settings with last_import_at');
        }
      } catch (settingsErr) {
        console.warn('[Excel Import] Failed to update last_import_at (non-critical):', settingsErr);
      }

      setImportResult({ created, updated, errors, total: totalRows, qaValidation: delta <= 0.01 });
      setStep(3);
      toast.success('הייבוא הושלם בהצלחה');
    } catch (err) {
      console.error('[Excel Import] Fatal error during import:', err);
      setError('אירעה שגיאה בעת ייבוא הנתונים. אנא נסה שוב או פנה לתמיכה טכנית.');
      toast.error('שגיאה בייבוא הנתונים');
    } finally {
      setIsImporting(false);
      finishImport(); // Mark import as complete
    }
  };

  return (
    <Card className="border-0 shadow-lg max-w-3xl mx-auto">
      <CardHeader className="border-b bg-slate-50">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          ייבוא דוח חייבים מאקסל
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        {/* שלב 1: העלאת קובץ */}
        {step === 1 && (
          <div className="text-center py-10">
            <div className="mb-6">
              <Upload className="w-16 h-16 text-slate-300 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">העלאת קובץ אקסל</h3>
            <p className="text-sm text-slate-500 mb-6">
              בחר קובץ XLS או XLSX עם דוח החייבים
            </p>
            
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button disabled={isUploading} asChild>
                <span>
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      מעלה קובץ...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 ml-2" />
                      בחר קובץ Excel
                    </>
                  )}
                </span>
              </Button>
            </label>
            <p className="text-xs text-slate-400 mt-2">
              קבצים נתמכים: .xlsx, .xls
            </p>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* שלב 2: מיפוי עמודות */}
        {step === 2 && (
          <div className="space-y-6">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-700">
                קובץ האקסל נטען בהצלחה. נמצאו {excelData.length} שורות לייבוא.
              </AlertDescription>
            </Alert>

            <Alert className="bg-blue-50 border-blue-300">
              <AlertDescription className="text-blue-800 font-semibold">
                מיפוי קבוע של עמודות:
                <div className="mt-2 text-sm grid grid-cols-2 gap-2">
                  <div>A → מספר דירה</div>
                  <div>B → שם בעלים</div>
                  <div>C → טלפון</div>
                  <div>G → מים חמים</div>
                  <div>H → פרטים</div>
                  <div>I → דמי ניהול</div>
                </div>
              </AlertDescription>
            </Alert>

            <div>
              <h4 className="font-medium text-slate-700 mb-3">מצב ייבוא</h4>
              <RadioGroup value={importMode} onValueChange={(v) => { setImportMode(v); setResetConfirmation(''); }} className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
                  <RadioGroupItem value="fill_missing" id="fill_missing" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="fill_missing" className="cursor-pointer font-semibold text-blue-900">
                      השלמה בלבד (מומלץ)
                    </Label>
                    <p className="text-xs text-blue-700 mt-1">
                      • טלפונים וחודשי פיגור יתעדכנו רק אם ריקים<br />
                      • סכומים (חוב כולל, חודשי, מיוחד) יתעדכנו תמיד<br />
                      • סטטוס יחושב מחדש אוטומטית לפי הסכומים<br />
                      • הערות ותאריכים יישמרו
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-red-200 bg-red-50">
                  <RadioGroupItem value="reset" id="reset" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="reset" className="cursor-pointer font-bold text-red-700">
                      איפוס מלא – מחק הכל וטען מחדש
                    </Label>
                    <p className="text-xs text-red-700 mt-1 font-semibold">
                      ⚠️ פעולה בלתי הפיכה! כל הנתונים הקיימים יימחקו לחלוטין והמערכת תטען מחדש מהקובץ.
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {importMode === 'reset' && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-bold">אישור נדרש למחיקה מלאה</p>
                      <p className="text-sm">הקלד "מחק הכל" בשדה למטה כדי לאשר:</p>
                      <input
                        type="text"
                        value={resetConfirmation}
                        onChange={(e) => setResetConfirmation(e.target.value)}
                        placeholder="הקלד: מחק הכל"
                        className="w-full px-3 py-2 border border-red-300 rounded-lg text-right bg-white"
                        dir="rtl"
                      />
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* שלב 3: סיום */}
        {step === 3 && importResult && (
          <div className="text-center py-10">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">קובץ האקסל נטען בהצלחה. הנתונים עודכנו במערכת.</h3>
            
            <div className="flex justify-center gap-8 mt-6 text-sm">
              <div>
                <p className="text-2xl font-bold text-green-600">{importResult.created}</p>
                <p className="text-slate-500">נוצרו</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{importResult.updated}</p>
                <p className="text-slate-500">עודכנו</p>
              </div>
              {importResult.errors > 0 && (
                <div>
                  <p className="text-2xl font-bold text-amber-600">{importResult.errors}</p>
                  <p className="text-slate-500">דילגו (שורות ריקות)</p>
                </div>
              )}
            </div>
            
            {importResult.qaValidation === false && (
              <Alert variant="destructive" className="mt-6">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  נמצאו פערים בסכומים. בדוק את הקונסול לפרטים.
                </AlertDescription>
              </Alert>
            )}
            
            {importResult.errors > 0 && (
              <p className="text-xs text-slate-500 mt-4">
                חלק מהשורות דולגו (שורות ריקות או עם שגיאות). בדוק את הקונסול לפרטים.
              </p>
            )}
          </div>
        )}

        {/* פס התקדמות */}
        {isImporting && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
              <span>מייבא נתונים...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t bg-slate-50 flex justify-between">
        {step === 2 && (
          <>
            <AppButton variant="outline" icon={ArrowLeft} onClick={() => setStep(1)}>
              חזור
            </AppButton>
            <AppButton 
              variant={importMode === 'reset' ? 'danger' : 'primary'}
              icon={importMode === 'reset' ? AlertTriangle : Database}
              onClick={handleImport} 
              loading={isImporting}
              disabled={importMode === 'reset' && resetConfirmation !== 'מחק הכל'}
            >
              {importMode === 'reset' ? 'בצע איפוס מלא' : 'התחל ייבוא'}
            </AppButton>
          </>
        )}

        {step === 3 && (
          <AppButton variant="primary" icon={RefreshCw} onClick={onImportComplete} fullWidth>
            סיום ומעבר לדשבורד
          </AppButton>
        )}
      </CardFooter>
    </Card>
  );
}