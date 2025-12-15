import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle } from "lucide-react";

export default function LastImportIndicator({ lastImportAt }) {
  if (!lastImportAt) {
    return (
      <Alert className="bg-gradient-to-l from-red-50 to-red-100 border-red-300 rounded-xl mb-6" dir="rtl">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <AlertDescription className="text-red-800 font-bold text-sm">
            ⚠️ טרם בוצע ייבוא נתונים
          </AlertDescription>
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
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <AlertDescription className="text-red-800 font-bold text-sm">
              ⚠️ לא בוצע ייבוא כבר יותר מיומיים
            </AlertDescription>
            <AlertDescription className="text-red-700 text-xs mt-1">
              עודכן לאחרונה: {formattedDate}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    );
  }

  return (
    <Alert className="bg-gradient-to-l from-blue-50 to-blue-100 border-blue-200 rounded-xl mb-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <AlertDescription className="text-blue-800 font-bold text-sm">
          ⟳ עודכן לאחרונה: {formattedDate}
        </AlertDescription>
      </div>
    </Alert>
  );
}