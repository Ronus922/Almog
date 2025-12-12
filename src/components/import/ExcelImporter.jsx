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

const FIELD_MAPPINGS = {
  apartmentNumber: { label: 'מספר דירה', patterns: ['דירה', 'apartment', 'מס דירה'] },
  rawTenantField: { label: 'דייר/ת', patterns: ['דייר', 'tenant', 'שוכר', 'בעלים'] },
  phones: { label: 'טלפון', patterns: ['טלפון', 'phone', 'נייד'] },
  totalDebt: { label: 'סה״כ חוב', patterns: ['סה"כ חוב', 'סה״כ חוב', 'total debt', 'חוב כולל'] },
  monthlyDebt: { label: 'חוב חודשי', patterns: ['חוב לתשלום חודשי', 'monthly', 'תשלום חודשי'] },
  specialDebt: { label: 'חוב מיוחד', patterns: ['חוב מיוחד', 'special'] },
  detailsMonthly: { label: 'פרטים חודשיים', patterns: ['פרטים'] },
  detailsSpecial: { label: 'פרטים מיוחדים', patterns: ['פרטים.1'] },
  monthlyPayment: { label: 'תשלום חודשי', patterns: ['תשלום חודשי', 'payment'] }
};

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

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // בדיקת סוג הקובץ
    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setError('סוג הקובץ אינו נתמך. ניתן להעלות רק קבצי Excel בפורמט .xlsx או .xls');
      return;
    }

    setFile(selectedFile);
    setIsUploading(true);
    setError(null);

    try {
      // העלאת הקובץ
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      setFileUrl(file_url);

      // חילוץ נתונים מהאקסל
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            headers: { type: 'array', items: { type: 'string' } },
            rows: { 
              type: 'array', 
              items: { 
                type: 'object',
                additionalProperties: true
              } 
            }
          }
        }
      });

      if (extractResult.status === 'error') {
        throw new Error('העלאת הקובץ נכשלה. ייתכן שהקובץ פגום או בפורמט לא תקין.');
      }

      const data = extractResult.output;
      // ניקוי רווחים משמות העמודות (trim)
      const rawHeaders = data.headers || Object.keys(data.rows?.[0] || {});
      const extractedHeaders = rawHeaders.map(h => (h || '').trim());
      
      setHeaders(extractedHeaders);
      setExcelData(data.rows || []);

      // ניסיון מיפוי אוטומטי (אחרי trim)
      const autoMappings = {};
      Object.entries(FIELD_MAPPINGS).forEach(([field, config]) => {
        const matchedHeader = extractedHeaders.find(h => 
          config.patterns.some(p => h.toLowerCase().includes(p.toLowerCase().trim()))
        );
        if (matchedHeader) {
          autoMappings[field] = matchedHeader;
        }
      });
      setMappings(autoMappings);

      setStep(2);
    } catch (err) {
      // הודעת שגיאה ברורה למשתמש
      if (err.message.includes('Unsupported file type')) {
        setError('סוג הקובץ אינו נתמך. ניתן להעלות רק קבצי Excel בפורמט .xlsx או .xls');
      } else if (err.message.includes('פגום') || err.message.includes('תקין')) {
        setError(err.message);
      } else {
        setError('העלאת הקובץ נכשלה. אנא נסה שוב או בדוק את תקינות הקובץ.');
      }
      console.error('Error uploading file:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const calculateMonthsInArrears = (detailsText) => {
    if (!detailsText) return 0;
    
    // חיפוש טווח תאריכים בפורמט MM/YY - MM/YY
    const rangeMatch = detailsText.match(/(\d{1,2})\/(\d{2})\s*-\s*(\d{1,2})\/(\d{2})/);
    if (rangeMatch) {
      const [, startMonth, startYear, endMonth, endYear] = rangeMatch;
      const start = parseInt(startYear) * 12 + parseInt(startMonth);
      const end = parseInt(endYear) * 12 + parseInt(endMonth);
      return Math.abs(end - start) + 1;
    }
    
    return 0;
  };

  const parseNumber = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    // הסרת סימני מטבע, פסיקים וכל תו שאינו מספר
    const cleaned = String(val).replace(/[^\d.-]/g, '');
    return parseFloat(cleaned) || 0;
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
    setIsImporting(true);
    setProgress(0);
    setError(null);

    try {
      // קבלת הגדרות
      const settingsList = await base44.entities.Settings.list();
      const settings = settingsList[0] || { highDebtThreshold: 1000, monthsBeforeLawsuit: 3 };

      // אם נבחר איפוס מלא - מחיקת כל הרשומות
      if (importMode === 'reset') {
        const existingRecords = await base44.entities.DebtorRecord.list();
        for (const record of existingRecords) {
          await base44.entities.DebtorRecord.delete(record.id);
        }
      }

      // קבלת רשומות קיימות למצב עדכון
      let existingRecords = [];
      if (importMode === 'update') {
        existingRecords = await base44.entities.DebtorRecord.list();
      }

      const totalRows = excelData.length;
      let created = 0;
      let updated = 0;
      let errors = 0;

      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        
        try {
          // המרת שורה לרשומה (עם trim לכל הערכים)
          const record = {
            apartmentNumber: (getColumnValue(row, mappings.apartmentNumber) || '').toString().trim(),
            rawTenantField: (getColumnValue(row, mappings.rawTenantField) || '').toString().trim(),
            phones: (getColumnValue(row, mappings.phones) || '').toString().trim(),
            totalDebt: parseNumber(getColumnValue(row, mappings.totalDebt)),
            monthlyDebt: parseNumber(getColumnValue(row, mappings.monthlyDebt)),
            specialDebt: parseNumber(getColumnValue(row, mappings.specialDebt)),
            detailsMonthly: (getColumnValue(row, mappings.detailsMonthly) || '').toString().trim(),
            detailsSpecial: (getColumnValue(row, mappings.detailsSpecial) || '').toString().trim(),
            monthlyPayment: parseNumber(getColumnValue(row, mappings.monthlyPayment))
          };

          // פיצול שם דייר לבעלים ושוכר (אם יש)
          if (record.rawTenantField) {
            const parts = record.rawTenantField.split(/[\/,]/);
            record.ownerName = parts[0]?.trim() || '';
            record.tenantName = parts[1]?.trim() || '';
          }

          // חישוב חודשי פיגור
          record.monthsInArrears = calculateMonthsInArrears(record.detailsMonthly);

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
          } else {
            await base44.entities.DebtorRecord.create(record);
            created++;
          }
        } catch (rowError) {
          console.error('Error importing row:', rowError);
          errors++;
        }

        setProgress(Math.round(((i + 1) / totalRows) * 100));
      }

      setImportResult({ created, updated, errors, total: totalRows });
      setStep(3);
    } catch (err) {
      setError(err.message || 'שגיאה בייבוא הנתונים');
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
            <h3 className="text-lg font-medium text-slate-700 mb-2">הייבוא הושלם בהצלחה!</h3>
            
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
                  <p className="text-2xl font-bold text-red-600">{importResult.errors}</p>
                  <p className="text-slate-500">שגיאות</p>
                </div>
              )}
            </div>
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