import React, { useState } from 'react';
import AppButton from "@/components/ui/app-button";
import { FileSpreadsheet } from "lucide-react";
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export default function ExcelExporter({ records, statuses }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!records || records.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }

    console.log(`[Excel Export] Starting export of ${records.length} records`);
    setIsExporting(true);

    try {
      // Prepare data for export - ALL records
      const exportData = records.map((record) => {
        // Find legal status name from Status entity (type=LEGAL)
        const legalStatus = statuses?.find((s) => s.id === record.legal_status_id && s.type === 'LEGAL');
        const legalStatusName = legalStatus?.name || 'לא הוגדר';

        return {
          'מספר דירה': record.apartmentNumber || '',
          'שם בעל הדירה': record.ownerName || '',
          'טלפון': record.phonePrimary || '',
          'סה״כ חוב': record.totalDebt || 0,
          'חוב חודשי': record.monthlyDebt || 0,
          'חוב מיוחד': record.specialDebt || 0,
          'סטטוס': record.debt_status_auto || 'תקין',
          'מצב משפטי': legalStatusName,
          'תאריך ייצוא': new Date().toLocaleDateString('he-IL')
        };
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "חייבים");

      // Set column widths
      ws['!cols'] = [
      { wch: 12 }, // מספר דירה
      { wch: 25 }, // שם בעל הדירה
      { wch: 15 }, // טלפון
      { wch: 12 }, // סה״כ חוב
      { wch: 12 }, // חוב חודשי
      { wch: 12 }, // חוב מיוחד
      { wch: 18 }, // סטטוס
      { wch: 20 }, // מצב משפטי
      { wch: 15 } // תאריך ייצוא
      ];

      // Export file
      XLSX.writeFile(wb, `חייבים_${new Date().toISOString().split('T')[0]}.xlsx`);
      console.log(`[Excel Export] Successfully exported ${exportData.length} records`);
      toast.success(`הקובץ יוצא בהצלחה (${exportData.length} רשומות)`);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('שגיאה בייצוא לאקסל');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AppButton
      variant="secondary"
      size="md"
      icon={FileSpreadsheet}
      onClick={handleExport}
      loading={isExporting}
      disabled={!records || records.length === 0}
      className="hover:text-slate-900"
    >
      ייצוא לאקסל
    </AppButton>);

}