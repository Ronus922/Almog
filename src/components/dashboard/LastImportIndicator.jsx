import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Upload, RefreshCw } from "lucide-react";

export default function LastImportIndicator({ lastImportAt, isAdmin = false }) {
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const handleNavigateToImport = () => {
    navigate(createPageUrl('Import'));
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/admin/jobs/syncBllinkDebt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok) {
        window.location.reload();
      } else {
        setSyncError(data.error || 'שגיאה בסנכרון');
      }
    } catch (err) {
      setSyncError('שגיאה בסנכרון');
    } finally {
      setSyncing(false);
    }
  };

  const nowMs = Date.now();
  const lastMs = lastImportAt ? new Date(lastImportAt).getTime() : null;
  const noDate = !lastImportAt || isNaN(lastMs);
  const hoursSince = noDate ? null : (nowMs - lastMs) / (1000 * 60 * 60);

  let severity = 'ok';
  if (noDate) {
    severity = 'red';
  } else if (hoursSince >= 48) {
    severity = 'red';
  } else if (hoursSince >= 24) {
    severity = 'yellow';
  }

  const bgColors = {
    ok: 'bg-white',
    yellow: 'bg-[#fef9c3]',
    red: 'bg-[#fee2e2]',
  };

  const borderColors = {
    ok: 'border-slate-200',
    yellow: 'border-yellow-300',
    red: 'border-red-300',
  };

  const formattedDate = noDate ? '—' : new Date(lastImportAt).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) + ' ' + new Date(lastImportAt).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const showWarning = (hoursSince !== null && hoursSince >= 24) || noDate;

  return (
    <div
      className={`mb-6 px-5 py-3 rounded-xl border ${bgColors[severity]} ${borderColors[severity]}`}
      dir="rtl"
    >
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex-1 text-right">
          <div className="text-slate-900 font-black" style={{ fontSize: '16px' }}>
            העדכון האחרון בוצע: {formattedDate}
          </div>
          {hoursSince !== null && hoursSince >= 48 && !noDate && (
            <div className="mt-0.5 text-sm text-red-700 font-medium">
              הנתונים לא עודכנו ב־48 השעות האחרונות – מומלץ לבצע ייבוא
            </div>
          )}
          {hoursSince !== null && hoursSince >= 24 && hoursSince < 48 && !noDate && (
            <div className="mt-0.5 text-sm text-yellow-800 font-medium">
              הנתונים לא עודכנו ב־24 השעות האחרונות – מומלץ לבצע ייבוא
            </div>
          )}
          {noDate && (
            <div className="mt-0.5 text-sm text-red-700 font-semibold">
              נדרש לייבא נתונים מעדכניים
            </div>
          )}
          {syncError && (
            <div className="mt-0.5 text-sm text-red-600 font-medium">{syncError}</div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isAdmin && (
            <Button
              onClick={handleSync}
              disabled={syncing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 rounded-lg font-bold text-sm gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'מסנכרן...' : 'סנכרן עכשיו'}
            </Button>
          )}
          {isAdmin && showWarning && (
            <Button
              onClick={handleNavigateToImport}
              className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-lg font-bold text-sm gap-2"
            >
              <Upload className="w-4 h-4" />
              ייבוא נתונים
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
