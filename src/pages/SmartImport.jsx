import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/auth/AuthContext';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, 
  Download, PlayCircle, Loader2, FileText, AlertCircle,
  Table as TableIcon, ArrowRight, RefreshCw
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function SmartImport() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // State
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [rawRows, setRawRows] = useState([]);
  const [cleanedRows, setCleanedRows] = useState([]);
  const [apartmentsCsvBlobUrl, setApartmentsCsvBlobUrl] = useState(null);
  const [debtsCsvBlobUrl, setDebtsCsvBlobUrl] = useState(null);
  const [metrics, setMetrics] = useState({ totalRows: 0, uniqueApartments: 0, errorCount: 0, duplicateCount: 0, emptyKeyCount: 0 });
  const [errors, setErrors] = useState([]);
  const [importStatus, setImportStatus] = useState('idle'); // idle|running|done|failed
  const [runLog, setRunLog] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lastProcessedRow, setLastProcessedRow] = useState(0);

  // ═══════════════════════════════════════════════════════════
  // NORMALIZE TEXT
  // ═══════════════════════════════════════════════════════════
  const normalize = (text) => {
    if (!text) return '';
    return String(text).trim().replace(/\s+/g, ' ');
  };

  // ═══════════════════════════════════════════════════════════
  // PARSE FILE
  // ═══════════════════════════════════════════════════════════
  const parseFile = useCallback(async (file) => {
    setIsProcessing(true);
    setErrors([]);
    setCleanedRows([]);
    setRawRows([]);
    setMetrics({ totalRows: 0, uniqueApartments: 0, errorCount: 0, duplicateCount: 0, emptyKeyCount: 0 });
    
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCSV && !isExcel) {
      toast.error('סוג קובץ לא נתמך. השתמש ב-CSV או Excel');
      setIsProcessing(false);
      return;
    }

    setFileType(isCSV ? 'csv' : 'excel');

    try {
      let rows = [];
      let headers = [];

      if (isCSV) {
        // Parse CSV
        await new Promise((resolve, reject) => {
          Papa.parse(file, {
            complete: (results) => {
              if (results.data && results.data.length > 0) {
                headers = results.data[0];
                rows = results.data.slice(1);
              }
              resolve();
            },
            error: reject
          });
        });
      } else {
        // Parse Excel
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (jsonData.length > 0) {
          headers = jsonData[0];
          rows = jsonData.slice(1);
        }
      }

      // Normalize headers
      let normalizedHeaders = headers.map(h => normalize(h));
      
      // Handle duplicate headers
      const seen = {};
      normalizedHeaders = normalizedHeaders.map(h => {
        if (!h) return 'unnamed';
        if (!seen[h]) {
          seen[h] = 0;
          return h;
        }
        seen[h]++;
        return `${h}_${seen[h]}`;
      });

      // Convert rows to objects
      const rowObjects = rows.map((row, idx) => {
        const obj = { _rowIndex: idx + 2 }; // +2 for Excel row number
        normalizedHeaders.forEach((header, i) => {
          obj[header] = row[i] !== undefined ? row[i] : '';
        });
        return obj;
      });

      setRawRows(rowObjects);
      analyzeAndClean(rowObjects, normalizedHeaders);
    } catch (err) {
      console.error('Parse error:', err);
      toast.error('שגיאה בקריאת הקובץ');
      setIsProcessing(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // ANALYZE & CLEAN
  // ═══════════════════════════════════════════════════════════
  const analyzeAndClean = (rows, headers) => {
    const errorsFound = [];
    
    // Find apartmentKey column
    let apartmentKeyCol = headers.find(h => h === 'apartmentKey' || h.includes('דירה'));
    
    if (!apartmentKeyCol) {
      errorsFound.push({
        rowIndex: 0,
        type: 'MISSING_KEY_COLUMN',
        apartmentKey: 'N/A',
        message: 'לא נמצאה עמודת apartmentKey או דירה'
      });
      setErrors(errorsFound);
      setMetrics({ totalRows: rows.length, uniqueApartments: 0, errorCount: 1, duplicateCount: 0, emptyKeyCount: 0 });
      setIsProcessing(false);
      return;
    }

    // Remove calculated columns
    const dropKeywords = ['דמי ניהול', 'מחושב', 'סה״כ', 'סה"כ', 'סהכ', 'תשלום חודשי', 'לתשלום חודשי'];
    const cleanHeaders = headers.filter(h => !dropKeywords.some(k => h.includes(k)));

    // Derive apartmentKey
    const seenKeys = new Set();
    const duplicateKeys = {};
    let emptyKeyCount = 0;

    rows.forEach(row => {
      const keyRaw = String(row[apartmentKeyCol] || '').trim();
      
      if (!keyRaw) {
        emptyKeyCount++;
        errorsFound.push({
          rowIndex: row._rowIndex,
          type: 'EMPTY_KEY',
          apartmentKey: '',
          message: 'apartmentKey ריק'
        });
        return;
      }

      if (seenKeys.has(keyRaw)) {
        if (!duplicateKeys[keyRaw]) {
          duplicateKeys[keyRaw] = [];
        }
        duplicateKeys[keyRaw].push(row._rowIndex);
      } else {
        seenKeys.add(keyRaw);
      }

      row.apartmentKey = keyRaw;
    });

    // Add duplicate errors
    Object.entries(duplicateKeys).forEach(([key, rowIndices]) => {
      rowIndices.forEach(rowIdx => {
        errorsFound.push({
          rowIndex: rowIdx,
          type: 'DUPLICATE_KEY',
          apartmentKey: key,
          message: `apartmentKey כפול: ${key}`
        });
      });
    });

    // Find "פרטים" columns
    const detailsCols = cleanHeaders.filter(h => h.startsWith('פרטים'));
    const monthlyDetailsCol = detailsCols[0] || null;
    const specialDetailsCol = detailsCols[1] || null;

    // Find debt columns
    const specialDebtCol = cleanHeaders.find(h => h.includes('חוב מיוחד')) || null;
    const monthlyAmtCol = cleanHeaders.find(h => h.includes('חוב לתשלום חודשי')) || null;

    // Build cleaned rows
    const cleaned = rows.map(row => {
      const out = {
        _rowIndex: row._rowIndex,
        apartmentKey: row.apartmentKey || ''
      };

      if (monthlyAmtCol) {
        const val = parseFloat(row[monthlyAmtCol]);
        out.monthlyDebtAmount = isNaN(val) ? 0 : val;
      } else {
        out.monthlyDebtAmount = 0;
      }

      if (monthlyDetailsCol) {
        out.monthlyDebtDetails = String(row[monthlyDetailsCol] || '').trim();
      } else {
        out.monthlyDebtDetails = '';
      }

      if (specialDebtCol) {
        const val = parseFloat(row[specialDebtCol]);
        out.specialDebt = isNaN(val) ? 0 : val;
      } else {
        out.specialDebt = 0;
      }

      if (specialDetailsCol) {
        out.specialDebtDetails = String(row[specialDetailsCol] || '').trim();
      } else {
        out.specialDebtDetails = '';
      }

      return out;
    });

    setCleanedRows(cleaned);
    setErrors(errorsFound);
    setMetrics({
      totalRows: rows.length,
      uniqueApartments: seenKeys.size,
      errorCount: errorsFound.length,
      duplicateCount: Object.keys(duplicateKeys).length,
      emptyKeyCount
    });

    // Generate CSV blobs
    generateCsvBlobs(Array.from(seenKeys), cleaned.filter(r => r.apartmentKey));
    
    setIsProcessing(false);
  };

  // ═══════════════════════════════════════════════════════════
  // GENERATE CSV BLOBS
  // ═══════════════════════════════════════════════════════════
  const generateCsvBlobs = (uniqueKeys, debtRows) => {
    // Apartments CSV
    const aptCsv = Papa.unparse([
      ['apartmentKey'],
      ...uniqueKeys.map(k => [k])
    ]);
    const aptBlob = new Blob(['\ufeff' + aptCsv], { type: 'text/csv;charset=utf-8;' });
    setApartmentsCsvBlobUrl(URL.createObjectURL(aptBlob));

    // Debts CSV
    const debtCsv = Papa.unparse(debtRows.map(r => ({
      apartmentKey: r.apartmentKey,
      monthlyDebtAmount: r.monthlyDebtAmount,
      monthlyDebtDetails: r.monthlyDebtDetails,
      specialDebt: r.specialDebt,
      specialDebtDetails: r.specialDebtDetails
    })));
    const debtBlob = new Blob(['\ufeff' + debtCsv], { type: 'text/csv;charset=utf-8;' });
    setDebtsCsvBlobUrl(URL.createObjectURL(debtBlob));
  };

  // ═══════════════════════════════════════════════════════════
  // HANDLE FILE DROP
  // ═══════════════════════════════════════════════════════════
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      parseFile(droppedFile);
    }
  }, [parseFile]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // AUTO IMPORT
  // ═══════════════════════════════════════════════════════════
  const runAutoImport = async () => {
    if (metrics.errorCount > 0) {
      toast.error('לא ניתן לייבא עם שגיאות. תקן את הקובץ תחילה.');
      return;
    }

    setImportStatus('running');
    setRunLog([]);
    setLastProcessedRow(0);

    try {
      // Set ImportMode = true
      toast.info('מפעיל מצב ייבוא...');
      // TODO: Set backend ImportMode flag if exists

      // Step 1: Import Apartments (Upsert)
      toast.info('שלב 1: מייבא דירות...');
      const uniqueApartments = Array.from(new Set(cleanedRows.map(r => r.apartmentKey).filter(Boolean)));
      
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < uniqueApartments.length; i += batchSize) {
        batches.push(uniqueApartments.slice(i, i + batchSize));
      }

      let processedApts = 0;
      for (const batch of batches) {
        let retries = 0;
        const maxRetries = 5;
        const delays = [500, 1000, 2000, 4000, 8000];

        while (retries < maxRetries) {
          try {
            // Fetch existing apartments
            const existing = await base44.entities.DebtorRecord.list();
            const existingMap = {};
            existing.forEach(rec => {
              existingMap[rec.apartmentNumber] = rec.id;
            });

            // Upsert
            for (const aptKey of batch) {
              try {
                if (existingMap[aptKey]) {
                  // Already exists, skip or update minimal
                  setRunLog(prev => [...prev, {
                    rowIndex: 0,
                    apartmentKey: aptKey,
                    action: 'Skipped',
                    reason: 'Apartment already exists'
                  }]);
                } else {
                  // Create new
                  await base44.entities.DebtorRecord.create({
                    apartmentNumber: aptKey,
                    totalDebt: 0,
                    monthlyDebt: 0,
                    specialDebt: 0
                  });
                  setRunLog(prev => [...prev, {
                    rowIndex: 0,
                    apartmentKey: aptKey,
                    action: 'Imported',
                    reason: 'New apartment created'
                  }]);
                }
                processedApts++;
                setLastProcessedRow(processedApts);
              } catch (itemErr) {
                setRunLog(prev => [...prev, {
                  rowIndex: 0,
                  apartmentKey: aptKey,
                  action: 'Error',
                  reason: itemErr.message || 'Unknown error'
                }]);
              }
            }

            // Success, add random delay
            await sleep(300 + Math.random() * 400);
            break;
          } catch (err) {
            if (err.message?.includes('429') || err.message?.includes('rate limit')) {
              retries++;
              if (retries < maxRetries) {
                const delay = delays[retries - 1];
                toast.warning(`Rate limit - ממתין ${delay}ms...`);
                await sleep(delay);
              } else {
                throw new Error('Rate limit exceeded after retries');
              }
            } else {
              throw err;
            }
          }
        }
      }

      // Step 2: Import Debts (Upsert)
      toast.info('שלב 2: מייבא חובות...');
      const debtBatches = [];
      for (let i = 0; i < cleanedRows.length; i += batchSize) {
        debtBatches.push(cleanedRows.slice(i, i + batchSize));
      }

      for (const batch of debtBatches) {
        let retries = 0;
        const maxRetries = 5;
        const delays = [500, 1000, 2000, 4000, 8000];

        while (retries < maxRetries) {
          try {
            // Fetch existing apartments again
            const existing = await base44.entities.DebtorRecord.list();
            const existingMap = {};
            existing.forEach(rec => {
              existingMap[rec.apartmentNumber] = rec;
            });

            // Upsert debts
            for (const row of batch) {
              try {
                if (!existingMap[row.apartmentKey]) {
                  setRunLog(prev => [...prev, {
                    rowIndex: row._rowIndex,
                    apartmentKey: row.apartmentKey,
                    action: 'Skipped',
                    reason: 'NO_APARTMENT'
                  }]);
                  continue;
                }

                // Update existing apartment with debt data
                const existingRec = existingMap[row.apartmentKey];
                await base44.entities.DebtorRecord.update(existingRec.id, {
                  monthlyDebt: row.monthlyDebtAmount,
                  specialDebt: row.specialDebt,
                  totalDebt: row.monthlyDebtAmount + row.specialDebt,
                  detailsMonthly: row.monthlyDebtDetails,
                  detailsSpecial: row.specialDebtDetails
                });

                setRunLog(prev => [...prev, {
                  rowIndex: row._rowIndex,
                  apartmentKey: row.apartmentKey,
                  action: 'Updated',
                  reason: 'Debt data updated'
                }]);
              } catch (itemErr) {
                setRunLog(prev => [...prev, {
                  rowIndex: row._rowIndex,
                  apartmentKey: row.apartmentKey,
                  action: 'Error',
                  reason: itemErr.message || 'Unknown error'
                }]);
              }
            }

            // Success, add random delay
            await sleep(300 + Math.random() * 400);
            break;
          } catch (err) {
            if (err.message?.includes('429') || err.message?.includes('rate limit')) {
              retries++;
              if (retries < maxRetries) {
                const delay = delays[retries - 1];
                toast.warning(`Rate limit - ממתין ${delay}ms...`);
                await sleep(delay);
              } else {
                throw new Error('Rate limit exceeded after retries');
              }
            } else {
              throw err;
            }
          }
        }
      }

      setImportStatus('done');
      toast.success('ייבוא הושלם בהצלחה!');
    } catch (err) {
      console.error('Import error:', err);
      setImportStatus('failed');
      toast.error(`ייבוא נכשל: ${err.message}`);
    } finally {
      // Set ImportMode = false
      // TODO: Reset backend ImportMode flag
    }
  };

  // ═══════════════════════════════════════════════════════════
  // DOWNLOAD RUN LOG
  // ═══════════════════════════════════════════════════════════
  const downloadRunLog = () => {
    const csv = Papa.unparse(runLog);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `import_run_log_${Date.now()}.csv`;
    link.click();
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  const hasErrors = metrics.errorCount > 0;
  const canDownload = !hasErrors && cleanedRows.length > 0;
  const canImport = canDownload && importStatus !== 'running';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ייבוא חכם</h1>
            <p className="text-sm text-slate-600 mt-1">ניתוח אוטומטי, תיקון שגיאות וייבוא בטוח בשני שלבים</p>
          </div>
          <Button variant="outline" onClick={() => navigate(createPageUrl('Dashboard'))}>
            חזור לדשבורד
          </Button>
        </div>

        {/* 1. UPLOAD SECTION */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              העלאת קובץ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white'
              }`}
            >
              <FileSpreadsheet className="w-16 h-16 mx-auto text-slate-400 mb-4" />
              <p className="text-lg font-semibold text-slate-700 mb-2">
                גרור קובץ לכאן או לחץ לבחירה
              </p>
              <p className="text-sm text-slate-500 mb-4">
                נתמכים: Excel (.xlsx, .xls) או CSV
              </p>
              <label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>
                    <Upload className="w-4 h-4 ml-2" />
                    בחר קובץ
                  </span>
                </Button>
              </label>
              {file && (
                <div className="mt-4 text-sm text-slate-600">
                  קובץ נבחר: <span className="font-semibold">{file.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. ANALYZE RESULTS (METRICS) */}
        {(cleanedRows.length > 0 || errors.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                תוצאות ניתוח
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-800">{metrics.totalRows}</p>
                  <p className="text-xs text-slate-600">סה"כ שורות</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{metrics.uniqueApartments}</p>
                  <p className="text-xs text-slate-600">דירות ייחודיות</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{metrics.errorCount}</p>
                  <p className="text-xs text-slate-600">שגיאות</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{metrics.duplicateCount}</p>
                  <p className="text-xs text-slate-600">כפילויות</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{metrics.emptyKeyCount}</p>
                  <p className="text-xs text-slate-600">מפתחות ריקים</p>
                </div>
              </div>

              {hasErrors && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    נמצאו {metrics.errorCount} שגיאות. תקן את הקובץ לפני ייבוא.
                  </AlertDescription>
                </Alert>
              )}

              {!hasErrors && cleanedRows.length > 0 && (
                <Alert className="mt-4 bg-green-50 border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    הקובץ תקין ומוכן לייבוא! {metrics.uniqueApartments} דירות זוהו.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* 3. PREVIEW TABLE */}
        {cleanedRows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TableIcon className="w-5 h-5" />
                תצוגה מקדימה (20 שורות ראשונות)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-2 text-right">שורה</th>
                      <th className="p-2 text-right">דירה</th>
                      <th className="p-2 text-right">דמי ניהול</th>
                      <th className="p-2 text-right">פרטי ניהול</th>
                      <th className="p-2 text-right">חוב מיוחד</th>
                      <th className="p-2 text-right">פרטי מיוחד</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cleanedRows.slice(0, 20).map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-2">{row._rowIndex}</td>
                        <td className="p-2 font-semibold">{row.apartmentKey}</td>
                        <td className="p-2">{row.monthlyDebtAmount.toFixed(2)}</td>
                        <td className="p-2 text-xs text-slate-600">{row.monthlyDebtDetails}</td>
                        <td className="p-2">{row.specialDebt.toFixed(2)}</td>
                        <td className="p-2 text-xs text-slate-600">{row.specialDebtDetails}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4. ERRORS TABLE */}
        {errors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                שגיאות שנמצאו ({errors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-red-50 border-b">
                      <th className="p-2 text-right">שורה</th>
                      <th className="p-2 text-right">סוג</th>
                      <th className="p-2 text-right">דירה</th>
                      <th className="p-2 text-right">הודעה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((err, idx) => (
                      <tr key={idx} className="border-b hover:bg-red-50">
                        <td className="p-2">{err.rowIndex}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            err.type === 'MISSING_KEY_COLUMN' ? 'bg-red-100 text-red-700' :
                            err.type === 'EMPTY_KEY' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {err.type}
                          </span>
                        </td>
                        <td className="p-2">{err.apartmentKey || '-'}</td>
                        <td className="p-2 text-slate-600">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 5. ACTIONS */}
        {cleanedRows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5" />
                פעולות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  disabled={!canDownload}
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = apartmentsCsvBlobUrl;
                    link.download = 'apartments_import.csv';
                    link.click();
                  }}
                >
                  <Download className="w-4 h-4 ml-2" />
                  הורד apartments_import.csv
                </Button>
                <Button
                  variant="outline"
                  disabled={!canDownload}
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = debtsCsvBlobUrl;
                    link.download = 'debts_import.csv';
                    link.click();
                  }}
                >
                  <Download className="w-4 h-4 ml-2" />
                  הורד debts_import.csv
                </Button>
                <Button
                  disabled={!canImport}
                  onClick={runAutoImport}
                >
                  {importStatus === 'running' ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      מייבא...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4 ml-2" />
                      הרץ ייבוא אוטומטי
                    </>
                  )}
                </Button>
              </div>

              {importStatus === 'running' && (
                <Alert className="mt-4 bg-blue-50 border-blue-200">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    ייבוא מתבצע... {lastProcessedRow} / {metrics.uniqueApartments + cleanedRows.length}
                  </AlertDescription>
                </Alert>
              )}

              {importStatus === 'done' && (
                <Alert className="mt-4 bg-green-50 border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    הייבוא הושלם בהצלחה! {runLog.length} פעולות בוצעו.
                  </AlertDescription>
                </Alert>
              )}

              {importStatus === 'failed' && (
                <Alert className="mt-4" variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    הייבוא נכשל. בדוק את דו"ח הריצה למידע נוסף.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* 6. RUN LOG */}
        {runLog.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  דו"ח ריצה ({runLog.length} פעולות)
                </div>
                <Button variant="outline" size="sm" onClick={downloadRunLog}>
                  <Download className="w-4 h-4 ml-2" />
                  הורד דו"ח
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="bg-slate-50 border-b">
                      <th className="p-2 text-right">שורה</th>
                      <th className="p-2 text-right">דירה</th>
                      <th className="p-2 text-right">פעולה</th>
                      <th className="p-2 text-right">סיבה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runLog.map((log, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-2">{log.rowIndex || '-'}</td>
                        <td className="p-2 font-semibold">{log.apartmentKey}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            log.action === 'Imported' ? 'bg-green-100 text-green-700' :
                            log.action === 'Updated' ? 'bg-blue-100 text-blue-700' :
                            log.action === 'Skipped' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-2 text-slate-600 text-xs">{log.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}