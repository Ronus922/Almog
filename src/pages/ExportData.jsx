import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Database, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ExportData() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  const handleExport = async () => {
    setLoading(true);
    setDone(false);
    setError(null);
    setSummary(null);

    try {
      const response = await base44.functions.invoke('exportAllDataToSQL', {});
      
      // response.data is the SQL string
      const sqlContent = response.data;
      
      // Parse summary from headers if available
      try {
        const sum = response.headers?.['x-summary'];
        if (sum) setSummary(JSON.parse(sum));
      } catch {}

      // Download file
      const blob = new Blob([sqlContent], { type: 'application/sql;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDone(true);
    } catch (e) {
      setError(e.message || 'שגיאה בייצוא הנתונים');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-8" dir="rtl">
      <div className="max-w-2xl mx-auto">

        {/* כותרת */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900">ייצוא נתונים</h1>
          </div>
          <p className="text-slate-500 text-sm">ייצוא מלא של כל הנתונים במסד הנתונים לקובץ SQL</p>
        </div>

        {/* כרטיס ראשי */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          
          <div className="flex flex-col items-center text-center gap-6">
            
            <div className="w-20 h-20 rounded-2xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center">
              <Database className="w-10 h-10 text-blue-500" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">ייצוא מלא של מסד הנתונים</h2>
              <p className="text-slate-500 text-sm leading-relaxed max-w-md">
                הייצוא יכלול את כל הטבלאות והרשומות במערכת בפורמט SQL סטנדרטי.
                הקובץ יורד ישירות למחשב שלך.
              </p>
            </div>

            {/* מצב */}
            {!loading && !done && !error && (
              <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800 text-right">
                <strong>שים לב:</strong> פעולה זו זמינה למנהלים בלבד. הייצוא עשוי לקחת מספר שניות בהתאם לכמות הנתונים.
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-slate-600 font-medium">מייצא נתונים... אנא המתן</p>
              </div>
            )}

            {done && (
              <div className="w-full bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-green-800 font-semibold text-sm">הייצוא הושלם בהצלחה! הקובץ הורד למחשב שלך.</p>
              </div>
            )}

            {error && (
              <div className="w-full bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-800 font-semibold text-sm">{error}</p>
              </div>
            )}

            {/* כפתור */}
            <Button
              onClick={handleExport}
              disabled={loading}
              className="h-12 px-8 text-base font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  מייצא...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  ייצוא לקובץ SQL
                </>
              )}
            </Button>
          </div>

          {/* סיכום טבלאות */}
          {summary && summary.length > 0 && (
            <div className="mt-8 border-t border-slate-100 pt-6">
              <h3 className="text-sm font-bold text-slate-700 mb-3">סיכום ייצוא:</h3>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {summary.map((item) => (
                  <div
                    key={item.entity}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                      item.status === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}
                  >
                    <span className="font-medium">{item.entity}</span>
                    <span className="font-bold">{item.count} רשומות</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}