import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, Upload } from "lucide-react";

export default function LastImportIndicator({ lastImportAt, isAdmin = false }) {
  const navigate = useNavigate();

  const handleNavigateToImport = () => {
    navigate(createPageUrl('Import'));
  };

  // VIEWER/GUEST - תצוגה ניטרלית בלבד
  if (!isAdmin) {
    if (!lastImportAt) {
      return (
        <Alert className="bg-gradient-to-l from-slate-50 to-slate-100 border-slate-200 rounded-xl mb-6" dir="rtl">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <AlertDescription className="text-slate-700 font-medium text-sm">
              אין מידע עדכני על תאריך הייבוא
            </AlertDescription>
          </div>
        </Alert>
      );
    }

    const lastImportDate = new Date(lastImportAt);
    const formattedDate = lastImportDate.toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <Alert className="bg-gradient-to-l from-blue-50 to-blue-100 border-blue-200 rounded-xl mb-6" dir="rtl">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <AlertDescription className="text-blue-800 font-medium text-sm">
            הנתונים מעודכנים נכון לתאריך: {formattedDate}
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  // ADMIN - לוגיקה מלאה עם אזהרות וכפתורים
  if (!lastImportAt) {
    return (
      <Alert className="bg-gradient-to-l from-red-50 to-red-100 border-red-300 rounded-xl mb-6" dir="rtl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <AlertDescription className="text-red-800 font-bold text-sm">
              ⚠️ נדרש לייבא נתונים מעדכניים
            </AlertDescription>
          </div>
          <Button 
            onClick={handleNavigateToImport}
            className="bg-red-600 hover:bg-red-700 text-white h-9 px-4 rounded-lg font-bold text-sm flex-shrink-0"
          >
            <Upload className="w-4 h-4 ml-2" />
            ייבוא נתונים
          </Button>
        </div>
      </Alert>
    );
  }

  const lastImportDate = new Date(lastImportAt);
  const now = new Date();
  const hoursSince = (now - lastImportDate) / (1000 * 60 * 60);
  const isStale = hoursSince > 48;

  const formattedDate = lastImportDate.toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (isStale) {
    return (
      <Alert className="bg-gradient-to-l from-red-50 to-red-100 border-red-400 rounded-xl mb-6" dir="rtl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <AlertDescription className="text-red-800 font-bold text-sm">
                ⚠️ הנתונים לא עודכנו ב־48 השעות האחרונות – מומלץ לבצע ייבוא
              </AlertDescription>
              <AlertDescription className="text-red-700 text-xs mt-1">
                עודכן לאחרונה: {formattedDate}
              </AlertDescription>
            </div>
          </div>
          <Button 
            onClick={handleNavigateToImport}
            className="bg-red-600 hover:bg-red-700 text-white h-9 px-4 rounded-lg font-bold text-sm flex-shrink-0"
          >
            <Upload className="w-4 h-4 ml-2" />
            ייבוא נתונים
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <Alert className="bg-gradient-to-l from-blue-50 to-blue-100 border-blue-200 rounded-xl mb-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <AlertDescription className="text-blue-800 font-bold text-sm">
          ⟳ תאריך ייבוא: {formattedDate}
        </AlertDescription>
      </div>
    </Alert>
  );
}