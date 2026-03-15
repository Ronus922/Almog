import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

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

  // קביעת severity
  let severity = 'ok';
  if (noDate) {
    severity = 'noDate';
  } else if (hoursSince >= 96) {
    severity = 'warn3';
  } else if (hoursSince >= 72) {
    severity = 'warn2';
  } else if (hoursSince >= 48) {
    severity = 'warn1';
  }

  // צבעי רקע לפי severity
  const bgColors = {
    ok: 'bg-white',
    warn1: 'bg-[#fef9c3]',
    warn2: 'bg-[#ffedd5]',
    warn3: 'bg-[#fee2e2]',
    noDate: 'bg-[#fee2e2]'
  };

  const borderColors = {
    ok: 'border-slate-200',
    warn1: 'border-yellow-300',
    warn2: 'border-orange-300',
    warn3: 'border-red-300',
    noDate: 'border-red-300'
  };

  // פורמט תאריך - ללא שעה
  const formattedDate = noDate ? '—' : new Date(lastImportAt).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const showWarning = (hoursSince !== null && hoursSince >= 48) || noDate;

  return (
    <div 
      className={`mb-6 p-4 rounded-xl border ${bgColors[severity]} ${borderColors[severity]}`}
      dir="rtl"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1">
          {/* שורה ראשית - 20px */}
          <div className="text-slate-800" style={{ fontSize: '20px', fontWeight: 800, lineHeight: 1.2 }}>
            העדכון האחרון בוצע: {formattedDate}
          </div>

          {/* טקסט אזהרה - רק אם >48 שעות */}
          {hoursSince > 48 && !noDate && (
            <div className="mt-2 text-sm text-slate-700 font-medium">
              הנתונים לא עודכנו ב־48 השעות האחרונות – מומלץ לבצע ייבוא
            </div>
          )}

          {/* טקסט למצב noDate */}
          {noDate && isAdmin && (
            <div className="mt-2 text-sm text-red-700 font-semibold">
              נדרש לייבא נתונים מעדכניים
            </div>
          )}
        </div>

        {/* כפתור - רק למנהלים במצבי אזהרה */}
        {isAdmin && showWarning && (
          <Button 
            onClick={handleNavigateToImport}
            className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-lg font-bold text-sm flex-shrink-0"
          >
            <Upload className="w-4 h-4 ml-2" />
            ייבוא נתונים
          </Button>
        )}
      </div>
    </div>
  );
}