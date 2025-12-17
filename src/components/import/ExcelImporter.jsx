import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppButton from "@/components/ui/app-button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, 
  ArrowLeft, Loader2, RefreshCw, Database, AlertCircle
} from "lucide-react";
import { base44 } from '@/api/base44Client';
import * as XLSX from 'xlsx';
import { useImport } from './ImportContext';
import { toast } from 'sonner';

// מיפוי קבוע לעמודות Excel - אינדקסים מתחילים מ-0
const FIXED_COLUMN_MAPPING = {
  apartmentNumber: 0,  // Column A
  ownerName: 1,         // Column B
  phoneOwner: 2,        // Column C
  specialDebt: 6,       // Column G - מים חמים
  detailsMonthly: 7,    // Column H - פרטים
  monthlyDebt: 8        // Column I - דמי ניהול
};

const ALLOWED_FILE_EXTENSIONS = ['.xlsx', '.xls'];

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
          
          // השורה הראשונה = כותרות, יתר השורות = נתונים
          const dataRows = jsonData.slice(1);
          
          console.log(`[Excel Import] Total rows parsed (excluding header): ${dataRows.length}`);
          
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
        throw new Error(`נמצאו דירות כפולות בקובץ: ${uniqueDuplicates.join(', ')}. תקן את הקובץ והעלה מחדש.`);
      }

      console.log(`[Excel Import - PRE-FLIGHT] Total rows: ${totalRowsParsed}, Unique apartments: ${apartmentNumbers.length}, Missing apartment number: ${missingApartmentCount}`);

      setExcelData({ rows, totalRowsParsed, uniqueApartments: apartmentNumbers.length });
      setStep(2);
    } catch (err) {
      if (err.message === 'no_sheets') {
        setError('הקובץ אינו מכיל גיליון נתונים.');
      } else if (err.message === 'empty_sheet' || err.message === 'empty_file') {
        setError('הקובץ ריק או אינו מכיל נתונים. אנא בדוק את תוכן הקובץ.');
      } else if (err.message === 'file_read_error') {
        setError('לא ניתן לקרוא את קובץ האקסל. ייתכן שהוא פגום או מוגן.');
      } else if (err.message.includes('דירות כפולות')) {
        setError(err.message);
      } else {
        setError('אירעה שגיאה בעיבוד הקובץ. נסה שוב.');
      }
      
      if (e.target) {
        e.target.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    startImport();
    setProgress(0);
    setError(null);

    const importRunId = `import_${Date.now()}`;
    const importTimestamp = new Date().toISOString();

    console.log(`[Excel Import] ========== START IMPORT RUN ${importRunId} ==========`);

    try {
      const settingsList = await base44.entities.Settings.list();
      const settings = settingsList[0] || { 
        threshold_ok_max: 1000, 
        threshold_collect_from: 1500, 
        threshold_legal_from: 5000 
      };

      // RESET MODE: מחיקת כל הרשומות
      if (importMode === 'reset') {
        console.log(`[Excel Import] RESET MODE: Deleting all existing records`);
        const existingRecords = await base44.entities.DebtorRecord.list();
        for (const record of existingRecords) {
          await base44.entities.DebtorRecord.delete(record.id);
        }
      }

      // שלב 2: START IMPORT RUN - איפוס דגלים
      const allExistingRecords = await base44.entities.DebtorRecord.list();
      console.log(`[Excel Import] Resetting importedThisRun flag for ${allExistingRecords.length} existing records`);
      
      for (const record of allExistingRecords) {
        await base44.entities.DebtorRecord.update(record.id, {
          importedThisRun: false
        });
      }

      // שלב 3: UPSERT לכל שורה
      const { rows, uniqueApartments } = excelData;
      let created = 0;
      let updated = 0;
      let skipped = 0;
      let invalidMonthly = 0;
      let invalidSpecial = 0;
      const errorDetails = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        try {
          const apartmentNumber = (row[FIXED_COLUMN_MAPPING.apartmentNumber] || '').toString().trim();
          
          if (!apartmentNumber) {
            skipped++;
            continue;
          }

          const ownerNameRaw = (row[FIXED_COLUMN_MAPPING.ownerName] || '').toString().trim();
          const phoneRaw = (row[FIXED_COLUMN_MAPPING.phoneOwner] || '').toString().trim();
          const detailsMonthlyRaw = (row[FIXED_COLUMN_MAPPING.detailsMonthly] || '').toString().trim();
          
          const monthlyDebtClean = cleanNumber(row[FIXED_COLUMN_MAPPING.monthlyDebt]);
          const specialDebtClean = cleanNumber(row[FIXED_COLUMN_MAPPING.specialDebt]);

          if (!monthlyDebtClean.valid) {
            invalidMonthly++;
            console.warn(`[Excel Import] Row ${i + 1}: Invalid monthlyDebt: "${monthlyDebtClean.original}"`);
          }

          if (!specialDebtClean.valid) {
            invalidSpecial++;
            console.warn(`[Excel Import] Row ${i + 1}: Invalid specialDebt: "${specialDebtClean.original}"`);
          }

          const { phoneOwner, phoneTenant, phonePrimary } = extractPhoneNumbers(phoneRaw);

          const monthlyDebt = monthlyDebtClean.value;
          const specialDebt = specialDebtClean.value;
          
          // CALC חובה: totalDebt
          const totalDebt = Math.round(((monthlyDebt || 0) + (specialDebt || 0)) * 100) / 100;

          // STATUS חובה
          let debt_status_auto = 'תקין';
          if (totalDebt === 0) {
            debt_status_auto = 'תקין';
          } else if (totalDebt > settings.threshold_legal_from) {
            debt_status_auto = 'חריגה מופרזת';
          } else if (totalDebt > settings.threshold_collect_from) {
            debt_status_auto = 'לגבייה מיידית';
          }

          // FIND existing
          const existingRecords = await base44.entities.DebtorRecord.list();
          const existing = existingRecords.find(r => r.apartmentNumber === apartmentNumber);

          const allStatuses = await base44.entities.Status.list();
          const defaultLegalStatus = allStatuses.find(s => s.type === 'LEGAL' && s.is_default === true);

          if (existing) {
            // UPDATE
            const updateData = {
              monthlyDebt,
              specialDebt,
              totalDebt,
              debt_status_auto,
              detailsMonthly: detailsMonthlyRaw,
              phonesRaw: phoneRaw,
              importedThisRun: true,
              lastImportRunId: importRunId,
              lastImportAt: importTimestamp,
              flaggedAsCleared: false,
              clearedAt: null
            };
            
            // ownerName: עדכן אם לא ריק
            if (ownerNameRaw && ownerNameRaw.trim() !== '') {
              updateData.ownerName = ownerNameRaw.split(/[\/,]/)[0]?.trim() || '';
            }
            
            // טלפונים: עדכן רק אם ריק במערכת
            const isEmpty = (val) => {
              if (val === null || val === undefined || val === '') return true;
              const str = String(val).trim();
              return str === '' || str === 'אין מספר' || str === '-' || str === 'לא ידוע' || /^0+$/.test(str);
            };
            
            if (isEmpty(existing.phoneOwner) && !isEmpty(phoneOwner)) {
              updateData.phoneOwner = phoneOwner;
            }
            if (isEmpty(existing.phoneTenant) && !isEmpty(phoneTenant)) {
              updateData.phoneTenant = phoneTenant;
            }
            if (isEmpty(existing.phonePrimary) && !isEmpty(phonePrimary)) {
              updateData.phonePrimary = phonePrimary;
            }

            // PRESERVE: notes, dates, legal_status
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
            updated++;
          } else {
            // CREATE
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
              lastImportRunId: importRunId,
              lastImportAt: importTimestamp,
              flaggedAsCleared: false
            };

            if (defaultLegalStatus) {
              newRecord.legal_status_id = defaultLegalStatus.id;
              newRecord.legal_status_overridden = false;
            }
            
            await base44.entities.DebtorRecord.create(newRecord);
            created++;
          }
        } catch (rowError) {
          console.error(`[Excel Import] Error importing row ${i + 1}:`, rowError);
          errorDetails.push(`שורה ${i + 1}: ${rowError.message || 'שגיאה לא ידועה'}`);
        }

        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }

      // שלב 4: HANDLE MISSING APARTMENTS
      console.log(`[Excel Import] Checking for apartments not in current file...`);
      const finalRecords = await base44.entities.DebtorRecord.list();
      let clearedCount = 0;

      for (const record of finalRecords) {
        if (!record.importedThisRun && record.totalDebt !== 0) {
          console.log(`[Excel Import] Clearing apartment ${record.apartmentNumber} (not in file)`);
          await base44.entities.DebtorRecord.update(record.id, {
            monthlyDebt: 0,
            specialDebt: 0,
            totalDebt: 0,
            debt_status_auto: 'תקין',
            flaggedAsCleared: true,
            clearedAt: importTimestamp
          });
          clearedCount++;
        }
      }

      console.log(`[Excel Import] Cleared ${clearedCount} apartments not in file`);

      // שלב 5: QA
      console.log(`[Excel Import] ========== QA VALIDATION ==========`);
      const allRecords = await base44.entities.DebtorRecord.list();
      const importedCount = allRecords.filter(r => r.importedThisRun).length;

      console.log(`[Excel Import - QA] Unique apartments in file: ${uniqueApartments}`);
      console.log(`[Excel Import - QA] Imported count: ${importedCount}`);
      console.log(`[Excel Import - QA] Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Cleared: ${clearedCount}`);

      const sumMonthly = allRecords.reduce((sum, r) => sum + (r.monthlyDebt || 0), 0);
      const sumSpecial = allRecords.reduce((sum, r) => sum + (r.specialDebt || 0), 0);
      const sumTotal = allRecords.reduce((sum, r) => sum + (r.totalDebt || 0), 0);
      const delta = Math.abs(sumTotal - (sumMonthly + sumSpecial));
      
      console.log(`[Excel Import - QA] Σ(monthlyDebt) = ${sumMonthly.toFixed(2)}`);
      console.log(`[Excel Import - QA] Σ(specialDebt) = ${sumSpecial.toFixed(2)}`);
      console.log(`[Excel Import - QA] Σ(totalDebt) = ${sumTotal.toFixed(2)}`);
      console.log(`[Excel Import - QA] Delta = ${delta.toFixed(2)}`);
      
      const qaValidation = delta <= 0.01;
      const countValidation = importedCount === uniqueApartments;

      if (!qaValidation) {
        console.error('[Excel Import - QA] ❌ SUM VALIDATION FAILED');
        toast.error(`אזהרה: נמצאו פערים בסכומים (${delta.toFixed(2)})`);
      } else {
        console.log('[Excel Import - QA] ✅ Sum validation passed');
      }

      if (!countValidation) {
        console.error(`[Excel Import - QA] ❌ COUNT VALIDATION FAILED: Expected ${uniqueApartments}, got ${importedCount}`);
        toast.error(`אזהרה: לא כל הדירות יובאו. צפוי: ${uniqueApartments}, יובא: ${importedCount}`);
      } else {
        console.log('[Excel Import - QA] ✅ Count validation passed');
      }

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

      setImportResult({ 
        created, 
        updated, 
        skipped, 
        clearedCount,
        invalidMonthly,
        invalidSpecial,
        total: rows.length,
        uniqueApartments,
        importedCount,
        qaValidation,
        countValidation,
        delta: delta.toFixed(2)
      });
      
      setStep(3);
      toast.success('הייבוא הושלם בהצלחה');
      
      console.log(`[Excel Import] ========== END IMPORT RUN ${importRunId} ==========`);
    } catch (err) {
      console.error('[Excel Import] Fatal error during import:', err);
      setError('אירעה שגיאה בעת ייבוא הנתונים. אנא נסה שוב או פנה לתמיכה טכנית.');
      toast.error('שגיאה בייבוא הנתונים');
    } finally {
      setIsImporting(false);
      finishImport();
    }
  };

  return (
    <Card className="border-0 shadow-lg max-w-3xl mx-auto overflow-hidden rounded-2xl">
      <CardHeader className="border-b bg-slate-50">
        <CardTitle className="flex items-center gap-2 text-lg" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          ייבוא דוח חייבים מאקסל
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6" dir="rtl" style={{ textAlign: 'right', unicodeBidi: 'plaintext' }}>
        {step === 1 && (
          <div className="py-10" style={{ direction: 'rtl', textAlign: 'right' }}>
            <div className="mb-6 text-center">
              <Upload className="w-16 h-16 text-slate-300 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2 text-center">העלאת קובץ אקסל</h3>
            <p className="text-sm text-slate-500 mb-6 text-center">
              בחר קובץ XLS או XLSX עם דוח החייבים
            </p>
            
            <div className="text-center">
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
                מיפוי קבוע: A→דירה, B→שם, C→טלפון, G→מים חמים, H→פרטים, I→דמי ניהול
              </AlertDescription>
            </Alert>

            <div>
              <h4 className="font-medium text-slate-700 mb-3 text-right">מצב ייבוא</h4>
              <RadioGroup value={importMode} onValueChange={(v) => { setImportMode(v); setResetConfirmation(''); }} className="space-y-3" dir="rtl">
                <div className="flex flex-row-reverse items-start gap-3 p-3 md:p-4 rounded-lg border-2 border-blue-200 bg-blue-50" style={{ wordBreak: 'break-word' }}>
                  <RadioGroupItem value="fill_missing" id="fill_missing" className="flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="fill_missing" className="cursor-pointer font-semibold text-blue-900 block text-base">
                      השלמה בלבד (מומלץ)
                    </Label>
                    <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc pr-5">
                      <li>טלפונים וחודשי פיגור: עדכון רק אם ריקים</li>
                      <li>סכומים (דמי ניהול + מים חמים): עדכון תמיד</li>
                      <li>סה״כ חוב מחושב אוטומטית: דמי ניהול + מים חמים</li>
                      <li>הערות, תאריכים וסטטוס משפטי: נשמרים</li>
                      <li>דירות שלא בקובץ: מתאפסות לחוב 0</li>
                    </ul>
                  </div>
                </div>
                <div className="flex flex-row-reverse items-start gap-3 p-3 md:p-4 rounded-lg border-2 border-red-200 bg-red-50" style={{ wordBreak: 'break-word' }}>
                  <RadioGroupItem value="reset" id="reset" className="flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="reset" className="cursor-pointer font-bold text-red-700 block text-base">
                      איפוס מלא – מחק הכל וטען מחדש
                    </Label>
                    <p className="text-xs text-red-700 mt-2 font-semibold">
                      ⚠️ פעולה בלתי הפיכה! כל הנתונים הקיימים יימחקו לחלוטין.
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {importMode === 'reset' && (
                <Alert variant="destructive" className="mt-4" dir="rtl">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription className="text-right">
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

            {isImporting && (
              <div className="mt-6 p-4 bg-blue-50 rounded-xl" dir="rtl">
                <div className="flex items-center justify-between text-sm text-slate-700 mb-3 font-semibold">
                  <span>טוען...</span>
                  <span className="text-blue-600 font-bold">{progress}%</span>
                </div>
                <div className="w-full h-[5px] bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
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
          <div className="py-10" dir="rtl">
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">הייבוא הושלם בהצלחה</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{importResult.created}</p>
                <p className="text-sm text-slate-600">נוצרו</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{importResult.updated}</p>
                <p className="text-sm text-slate-600">עודכנו</p>
              </div>
              {importResult.clearedCount > 0 && (
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{importResult.clearedCount}</p>
                  <p className="text-sm text-slate-600">אופסו (לא בקובץ)</p>
                </div>
              )}
              {importResult.skipped > 0 && (
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">{importResult.skipped}</p>
                  <p className="text-sm text-slate-600">דולגו (שורות ריקות)</p>
                </div>
              )}
            </div>
            
            {(!importResult.qaValidation || !importResult.countValidation) && (
              <Alert variant="destructive" className="mt-6" dir="rtl">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-right">
                  <p className="font-bold mb-2">אזהרות QA:</p>
                  {!importResult.countValidation && (
                    <p className="text-sm">• לא כל הדירות יובאו: צפוי {importResult.uniqueApartments}, יובא {importResult.importedCount}</p>
                  )}
                  {!importResult.qaValidation && (
                    <p className="text-sm">• פער בסכומים: {importResult.delta}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {(importResult.invalidMonthly > 0 || importResult.invalidSpecial > 0) && (
              <Alert className="mt-4 bg-yellow-50 border-yellow-200" dir="rtl">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 text-right">
                  <p className="font-semibold mb-1">ערכים לא תקינים שהומרו ל-0:</p>
                  {importResult.invalidMonthly > 0 && <p className="text-sm">• דמי ניהול: {importResult.invalidMonthly} שורות</p>}
                  {importResult.invalidSpecial > 0 && <p className="text-sm">• מים חמים: {importResult.invalidSpecial} שורות</p>}
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
              {importMode === 'reset' ? 'בצע איפוס מלא' : 'התחל ייבוא'}
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