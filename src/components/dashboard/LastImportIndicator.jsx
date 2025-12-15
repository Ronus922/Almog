import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Upload } from "lucide-react";

export default function LastImportIndicator({ lastImportAt, isAdmin = false }) {
  const navigate = useNavigate();

  const handleNavigateToImport = () => {
    navigate(createPageUrl('Import'));
  };

  // חישוב זמן מאז העדכון האחרון
  const nowMs = Date.now();
  const lastMs = lastImportAt ? new Date(lastImportAt).getTime() : null;
  const noDate = !lastImportAt || isNaN(lastMs);
  const hoursSince = noDate ? null : (nowMs - lastMs) / (1000 * 60 * 60);
  const showWarning48 = !noDate && hoursSince > 48;

  const formattedDate = noDate ? '—' : new Date(lastImportAt).toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // מצב A: בתוך 48 שעות - תצוגה ניטרלית ללא רקע
  if (!showWarning48 && !noDate) {
    return (
      <div className="mb-6 p-3 rounded-lg bg-slate-50 border border-slate-200" dir="rtl">
        <div className="text-sm text-slate-700">
          <span className="font-semibold">העדכון האחרון בוצע:</span>
          <div className="mt-1 text-slate-600">{formattedDate}</div>
        </div>
      </div>
    );
  }

  // מצב B: עברו יותר מ-48 שעות - אזהרה עדינה
  if (showWarning48) {
    return (
      <Alert className="bg-gradient-to-l from-amber-50 to-orange-50 border-amber-300 rounded-xl mb-6" dir="rtl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <AlertDescription className="text-amber-900 font-semibold text-sm">
                העדכון האחרון בוצע:
              </AlertDescription>
              <AlertDescription className="text-amber-800 text-sm mt-1">
                {formattedDate}
              </AlertDescription>
              <AlertDescription className="text-amber-700 text-xs mt-2 font-medium">
                הנתונים לא עודכנו ב־48 השעות האחרונות – מומלץ לבצע ייבוא
              </AlertDescription>
            </div>
          </div>
          {isAdmin && (
            <Button 
              onClick={handleNavigateToImport}
              className="bg-amber-600 hover:bg-amber-700 text-white h-9 px-4 rounded-lg font-bold text-sm flex-shrink-0"
            >
              <Upload className="w-4 h-4 ml-2" />
              ייבוא נתונים
            </Button>
          )}
        </div>
      </Alert>
    );
  }

  // מצב C: אין תאריך
  return (
    <div className="mb-6 p-3 rounded-lg bg-slate-50 border border-slate-200" dir="rtl">
      <div className="text-sm text-slate-700">
        <span className="font-semibold">העדכון האחרון בוצע:</span>
        <div className="mt-1 text-slate-600">{formattedDate}</div>
        {isAdmin && (
          <div className="mt-2 text-xs text-amber-700 font-medium">
            נדרש לייבא נתונים מעדכניים
          </div>
        )}
      </div>
      {isAdmin && (
        <Button 
          onClick={handleNavigateToImport}
          size="sm"
          className="mt-3 bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 rounded-lg font-bold text-xs"
        >
          <Upload className="w-3 h-3 ml-2" />
          ייבוא נתונים
        </Button>
      )}
    </div>
  );
}