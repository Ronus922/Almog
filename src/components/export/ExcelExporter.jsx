import React from 'react';
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import * as XLSX from 'xlsx';

export default function ExcelExporter({ records, legalStatuses }) {
  const handleExport = () => {
    // Prepare data for export
    const exportData = records.map(record => {
      const legalStatus = legalStatuses.find(s => s.id === record.legal_status_manual_id);
      
      return {
        'מספר דירה': record.apartmentNumber || '',
        'שם בעל הדירה': record.ownerName || '',
        'טלפון': record.phonePrimary || '',
        'סה״כ חוב': record.totalDebt || 0,
        'סטטוס חוב': record.debt_status_auto || 'סך חוב תקין',
        'מצב משפטי': legalStatus ? legalStatus.name : '',
        'תאריך ייצוא': new Date().toLocaleDateString('he-IL')
      };
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "חייבים");

    // Set column widths
    ws['!cols'] = [
      { wch: 12 },  // מספר דירה
      { wch: 25 },  // שם בעל הדירה
      { wch: 15 },  // טלפון
      { wch: 12 },  // סה״כ חוב
      { wch: 18 },  // סטטוס חוב
      { wch: 18 },  // מצב משפטי
      { wch: 15 }   // תאריך ייצוא
    ];

    // Export file
    XLSX.writeFile(wb, `חייבים_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm" className="h-11 rounded-xl">
      <FileSpreadsheet className="w-4 h-4 ml-2" />
      ייצוא לאקסל
    </Button>
  );
}