import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, 
  ArrowLeft, Loader2, RefreshCw, Database
} from "lucide-react";
import { base44 } from '@/api/base44Client';
import * as XLSX from 'xlsx';

const FIELD_MAPPINGS = {
  apartmentNumber: { label: 'מספר דירה', patterns: ['דירה', 'apartment', 'מס דירה'], required: true },
  ownerName: { label: 'בעל דירה', patterns: ['דייר', 'tenant', 'שוכר', 'בעלים'], required: false },
  phones: { label: 'טלפון', patterns: ['טלפון', 'phone', 'נייד'], required: false },
  totalDebt: { label: 'סה״כ חוב', patterns: ['סה"כ חוב', 'סה״כ חוב', 'total debt', 'חוב כולל'], required: true },
  monthlyDebt: { label: 'חוב חודשי', patterns: ['חוב לתשלום חודשי', 'סה״כ חוב לתשלום חודשי', 'monthly'], required: false },
  specialDebt: { label: 'חוב מיוחד', patterns: ['חוב מיוחד', 'special'], required: false },
  detailsMonthly: { label: 'פרטים חודשיים', patterns: ['פרטים'], required: false },
  detailsSpecial: { label: 'פרטים מיוחדים', patterns: ['פרטים.1'], required: false },
  monthlyPayment: { label: 'תשלום חודשי', patterns: ['תשלום חודשי', 'payment'], required: false }
};

const ALLOWED_FILE_EXTENSIONS = ['.xlsx', '.xls'];

export default function ExcelImporter({ onImportComplete }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [excelData, setExcelData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mappings, setMappings] = useState({});
  const [importMode, setImportMode] = useState('update');
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

  const validateRequiredColumns = (headers, mappings) => {
    const missingColumns = [];
    
    Object.entries(FIELD_MAPPINGS).forEach(([field, config]) => {
      if (config.required && !mappings[field]) {
        missingColumns.push(config.label);
      }
    });

    if (missingColumns.length > 0) {
      return {
        valid: false,
        error: `מבנה הקובץ אינו תואם למערכת. חסרות עמודות חובה: ${missingColumns.join(', ')}`
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

      // מיפוי אוטומטי
      console.log(`[Excel Import] Stage: Auto-mapping columns`);
      const autoMappings = {};
      Object.entries(FIELD_MAPPINGS).forEach(([field, config]) => {
        const matchedHeader = extractedHeaders.find(h => 
          config.patterns.some(p => h.toLowerCase().includes(p.toLowerCase()))
        );
        if (matchedHeader) {
          autoMappings[field] = matchedHeader;
          console.log(`[Excel Import - mapColumns] Mapped "${field}" → "${matchedHeader}"`);
        }
      });
      setMappings(autoMappings);

      // בדיקת עמודות חובה
      console.log(`[Excel Import] Stage: Validating required columns`);
      const validation = validateRequiredColumns(extractedHeaders, autoMappings);
      if (!validation.valid) {
        console.error(`[Excel Import - validation] ${validation.error}`);
        throw new Error(validation.error);
      }

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

  const getColumnValue = (row, columnName) => {
    // קבלת ערך עמודה עם trim
    if (!columnName) return '';
    // חיפוש לפי שם העמודה המדויק או עם/בלי רווחים
    const value = row[columnName] || row[columnName.trim()] || '';
    return value;
  };

  const calculateStatus = (record, settings) => {
    const totalDebt = record.totalDebt || 0;
    const monthsInArrears = record.monthsInArrears || 0;
    const legalStage = record.legalStage || 'אין';
    const highThreshold = settings?.highDebtThreshold || 1000;
    const monthsThreshold = settings?.monthsBeforeLawsuit || 3;

    if (legalStage === 'בתביעה') return 'בתביעה';
    if (legalStage === 'הסדר תשלומים') return 'בהסדר';
    if (totalDebt === 0) return 'סדיר';
    if (totalDebt >= highThreshold && monthsInArrears >= monthsThreshold) return 'מועמד לתביעה';
    if (totalDebt >= highThreshold) return 'חייב משמעותי';
    return 'חייב';
  };

  const handleImport = async () => {
    // בדיקה אחרונה של עמודות חובה לפני הייבוא
    const validation = validateRequiredColumns(headers, mappings);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setError(null);

    console.log(`[Excel Import] Starting import of ${excelData.length} rows in mode: ${importMode}`);

    try {
      // קבלת הגדרות
      const settingsList = await base44.entities.Settings.list();
      const settings = settingsList[0] || { highDebtThreshold: 1000, monthsBeforeLawsuit: 3 };

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
      if (importMode === 'update') {
        existingRecords = await base44.entities.DebtorRecord.list();
        console.log(`[Excel Import] Update mode: found ${existingRecords.length} existing records`);
      }

      const totalRows = excelData.length;
      let created = 0;
      let updated = 0;
      let errors = 0;
      const errorDetails = [];

      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        
        try {
          // המרת שורה לרשומה (עם trim לכל הערכים)
          const apartmentNumber = (getColumnValue(row, mappings.apartmentNumber) || '').toString().trim();
          
          // דילוג על שורות ריקות
          if (!apartmentNumber) {
            console.log(`[Excel Import - dbInsert] Row ${i + 1}: Empty apartment number, skipping`);
            errors++;
            continue;
          }

          const ownerNameRaw = (getColumnValue(row, mappings.ownerName) || '').toString().trim();

          const record = {
            apartmentNumber,
            ownerName: ownerNameRaw.split(/[\/,]/)[0]?.trim() || '', // רק בעל הדירה, ללא שוכר
            phones: (getColumnValue(row, mappings.phones) || '').toString().trim(),
            totalDebt: parseNumber(getColumnValue(row, mappings.totalDebt)),
            monthlyDebt: parseNumber(getColumnValue(row, mappings.monthlyDebt)),
            specialDebt: parseNumber(getColumnValue(row, mappings.specialDebt)),
            detailsMonthly: (getColumnValue(row, mappings.detailsMonthly) || '').toString().trim(),
            detailsSpecial: (getColumnValue(row, mappings.detailsSpecial) || '').toString().trim(),
            monthlyPayment: parseNumber(getColumnValue(row, mappings.monthlyPayment))
          };

          // חישוב חודשי פיגור - רק מהעמודה "פרטים" (חוב חודשי)
          record.monthsInArrears = calculateMonthsInArrears(record.detailsMonthly);

          if (record.monthsInArrears === 0 && record.detailsMonthly) {
            console.warn(`[Excel Import - dbInsert] Row ${i + 1}: Could not calculate months in arrears from: "${record.detailsMonthly}"`);
          }

          // חישוב סטטוס
          record.status = calculateStatus(record, settings);
          record.legalStage = 'אין';

          // בדיקה אם דירה קיימת
          const existing = existingRecords.find(r => r.apartmentNumber === record.apartmentNumber);

          if (existing) {
            // שמירה על שדות קיימים שלא באים מהאקסל
            record.legalStage = existing.legalStage || 'אין';
            record.notes = existing.notes;
            record.lastContactDate = existing.lastContactDate;
            record.nextActionDate = existing.nextActionDate;
            record.status = calculateStatus({ ...record, legalStage: existing.legalStage }, settings);
            
            await base44.entities.DebtorRecord.update(existing.id, record);
            updated++;
            console.log(`[Excel Import - dbInsert] Updated apartment ${record.apartmentNumber}`);
          } else {
            await base44.entities.DebtorRecord.create(record);
            created++;
            console.log(`[Excel Import - dbInsert] Created apartment ${record.apartmentNumber}`);
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

      setImportResult({ created, updated, errors, total: totalRows });
      setStep(3);
    } catch (err) {
      console.error('[Excel Import] Fatal error during import:', err);
      setError('אירעה שגיאה בעת ייבוא הנתונים. אנא נסה שוב או פנה לתמיכה טכנית.');
    } finally {
      setIsImporting(false);
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

            <div>
              <h4 className="font-medium text-slate-700 mb-3">מיפוי עמודות</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(FIELD_MAPPINGS).map(([field, config]) => (
                  <div key={field}>
                    <Label className="text-sm">{config.label}</Label>
                    <Select
                      value={mappings[field] || ''}
                      onValueChange={(v) => setMappings({...mappings, [field]: v})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="בחר עמודה" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>לא למפות</SelectItem>
                        {headers.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 mb-3">מצב ייבוא</h4>
              <RadioGroup value={importMode} onValueChange={setImportMode} className="space-y-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="update" id="update" />
                  <Label htmlFor="update" className="cursor-pointer">
                    עדכון לפי דירה - עדכן קיימות, צור חדשות
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="reset" id="reset" />
                  <Label htmlFor="reset" className="cursor-pointer text-red-600">
                    איפוס מלא - מחק הכל וטען מחדש
                  </Label>
                </div>
              </RadioGroup>
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
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 ml-2" />
              חזור
            </Button>
            <Button onClick={handleImport} disabled={isImporting || !mappings.apartmentNumber}>
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מייבא...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 ml-2" />
                  התחל ייבוא
                </>
              )}
            </Button>
          </>
        )}

        {step === 3 && (
          <Button onClick={onImportComplete} className="w-full">
            <RefreshCw className="w-4 h-4 ml-2" />
            סיום ומעבר לדשבורד
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}