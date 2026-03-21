import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock, Download, Watch } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

function statusLabel(s) {
  const m = { SUCCESS: 'הצלחה', PARTIAL: 'חלקי', FAILED: 'נכשל', RUNNING: 'מתבצע...' };
  return m[s] || s;
}
function statusColor(s) {
  if (s === 'SUCCESS') return 'text-green-600 bg-green-50 border-green-200';
  if (s === 'PARTIAL') return 'text-amber-600 bg-amber-50 border-amber-200';
  if (s === 'FAILED') return 'text-red-600 bg-red-50 border-red-200';
  if (s === 'RUNNING') return 'text-blue-600 bg-blue-50 border-blue-200';
  return 'text-slate-600 bg-slate-50 border-slate-200';
}
function StatusIcon({ s }) {
  if (s === 'SUCCESS') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (s === 'PARTIAL') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  if (s === 'FAILED') return <XCircle className="w-4 h-4 text-red-500" />;
  if (s === 'RUNNING') return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
  return <Clock className="w-4 h-4 text-slate-400" />;
}

export default function BllinkImportPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const all = await base44.entities.ImportRun.list('-startedAt', 10);
      // סינון רק ריצות bllink
      const bllinkLogs = all.filter(l => l.fileName?.startsWith('bllink-'));
      setLogs(bllinkLogs);
    } catch (e) {
      console.error(e);
    }
    setLogsLoading(false);
  };

  useEffect(() => { loadLogs(); }, []);

  const runImport = async () => {
    setLoading(true);
    setResult(null);
    try {
      const resp = await base44.functions.invoke('importBuildingDebtReport', {
        run_type: 'manual',
        triggered_by: 'admin_ui',
      });
      setResult(resp.data);
      await loadLogs();
    } catch (e) {
      setResult({ ok: false, error: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* כותרת + כפתור ייבוא */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">ייבוא אוטומטי מ-Bllink</h2>
            <p className="text-sm text-slate-500 mt-1">
              שולף נתוני חייבים עדכניים מ-API של Bllink ומעדכן את בסיס הנתונים אוטומטית כל יום בחצות
            </p>
          </div>

          {/* Last Update Info */}
          {logs.length > 0 && logs[0].finishedAt && (
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
              <Watch className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1 text-right">
                <p className="text-xs font-semibold text-green-700">עדכון אחרון</p>
                <p className="text-sm font-medium text-green-900">{format(new Date(logs[0].finishedAt), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
              </div>
            </div>
          )}

          <Button
            onClick={runImport}
            disabled={loading}
            className="w-full bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold gap-2 shadow-sm"
          >
            {loading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> סרוק בתהליך...</>
            ) : (
              <><Download className="w-4 h-4" /> סרוק עכשיו</>
            )}
          </Button>
        </div>

        {/* תוצאת ריצה אחרונה */}
        {result && (
          <div className={`mt-5 rounded-xl border p-4 ${result.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {result.ok ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-700">ייבוא הושלם בהצלחה</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'סה"כ שורות', val: result.summary?.totalRows },
                    { label: 'נוצרו', val: result.summary?.created, color: 'text-green-700' },
                    { label: 'עודכנו', val: result.summary?.updated, color: 'text-blue-700' },
                    { label: 'שגיאות', val: result.summary?.failed, color: result.summary?.failed > 0 ? 'text-red-600' : 'text-slate-500' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                      <div className={`text-2xl font-bold ${color || 'text-slate-800'}`}>{val ?? 0}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
                {result.errors?.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <strong>שגיאות חלקיות:</strong>
                    {result.errors.map((e, i) => (
                      <div key={i} className="text-xs mt-1">דירה {e.apartmentNumber}: {e.errorMessage}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-700">ייבוא נכשל</p>
                  <p className="text-sm text-red-600 mt-1">{result.error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* היסטוריית ייבואים */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-800 mb-4">היסטוריית ייבואים אוטומטיים</h3>

        {logsLoading ? (
          <div className="text-center py-8 text-slate-400 text-sm">טוען...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">לא בוצעו ייבואים עדיין</div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${statusColor(log.status)}`}>
                <StatusIcon s={log.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{statusLabel(log.status)}</span>
                    <span className="text-xs opacity-70">
                      {log.startedAt ? format(new Date(log.startedAt), 'dd/MM/yyyy HH:mm') : ''}
                    </span>
                  </div>
                  <div className="text-xs opacity-80 mt-0.5">
                    {log.createdCount ?? 0} נוצרו · {log.updatedCount ?? 0} עודכנו · {log.failedRowsCount ?? 0} שגיאות
                    {log.errorSummary ? ` · ${log.errorSummary}` : ''}
                  </div>
                </div>
                <div className="text-xs font-mono opacity-60 flex-shrink-0">
                  {log.totalRowsRead ?? 0} שורות
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}