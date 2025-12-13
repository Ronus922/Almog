import React, { useState } from 'react';
import AppButton from "@/components/ui/app-button";
import { FileText } from "lucide-react";
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Pure function to build PDF document definition
export function buildDebtorsPdfDoc({ year, rows, statuses }) {
  // Build table data with ALL rows
  const tableData = rows.map(record => {
    const legalStatus = statuses?.find(s => s.id === record.legal_status_id && s.type === 'LEGAL');
    const legalStatusName = legalStatus?.name || 'לא הוגדר';
    
    return [
      record.apartmentNumber || '',
      record.ownerName || '',
      record.phonePrimary || '',
      new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.totalDebt || 0),
      new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.monthlyDebt || 0),
      new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.specialDebt || 0),
      record.debt_status_auto || 'תקין',
      legalStatusName
    ];
  });

  return {
    headers: ['מספר דירה', 'שם בעל הדירה', 'טלפון', 'סה״כ חוב', 'חוב חודשי', 'חוב מיוחד', 'סטטוס', 'מצב משפטי'],
    data: tableData,
    totalRows: rows.length
  };
}

export default function PDFExporter({ records, statuses, settings }) {
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async () => {
    if (!records || records.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }
    
    console.log(`[PDF Export] Starting export of ${records.length} records`);
    console.log(`[PDF Export] fetchedRows=${records.length}`);
    setIsExporting(true);
    
    try {
      const year = new Date().getFullYear();
      const totalRecords = records.length;
      const exportDate = new Date().toLocaleDateString('he-IL', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      console.log(`[PDF Export] Preparing to export ${totalRecords} records`);
      
      // Build table data with ALL records
      const { headers, data, totalRows } = buildDebtorsPdfDoc({
        year,
        rows: records,
        statuses
      });
      
      console.log(`[PDF Export] renderedRows=${totalRows}`);
      console.log(`[PDF Export] totalCount=${totalRows}`);
      
      // Create PDF with jsPDF
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Set RTL support
      doc.setR2L(true);
      doc.setLanguage('he');
      
      // Title and metadata
      let yPos = 15;
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('דו״ח חייבים', doc.internal.pageSize.width / 2, yPos, { align: 'center' });
      
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`תאריך הפקה: ${exportDate}`, doc.internal.pageSize.width / 2, yPos, { align: 'center' });
      
      yPos += 5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`סה״כ רשומות שיוצאו: ${totalRows}`, doc.internal.pageSize.width / 2, yPos, { align: 'center' });
      
      // Generate table with autotable
      doc.autoTable({
        startY: yPos + 5,
        head: [headers],
        body: data,
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 2,
          halign: 'right',
          valign: 'middle',
          lineColor: [226, 232, 240],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [51, 65, 85],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'right',
          fontSize: 9
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 25 },  // מספר דירה
          1: { cellWidth: 'auto' },  // שם בעל הדירה
          2: { cellWidth: 30 },  // טלפון
          3: { cellWidth: 28, fontStyle: 'bold' },  // סה״כ חוב
          4: { cellWidth: 28, fontStyle: 'bold' },  // חוב חודשי
          5: { cellWidth: 28, fontStyle: 'bold' },  // חוב מיוחד
          6: { cellWidth: 30 },  // סטטוס
          7: { cellWidth: 35, fontStyle: 'bold' }   // מצב משפטי
        },
        margin: { right: 10, left: 10 },
        didDrawPage: (data) => {
          // Footer on each page
          const pageCount = doc.internal.getNumberOfPages();
          const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(
            `עמוד ${currentPage} מתוך ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
          );
        }
      });
      
      const filename = `חייבים_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
      console.log(`[PDF Export] Successfully exported ${totalRows} records`);
      toast.success(`הקובץ יוצא בהצלחה (${totalRows} רשומות)`);
    } catch (error) {
      console.error('[PDF Export] Error:', error);
      toast.error('שגיאה בייצוא ל-PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AppButton 
      variant="secondary" 
      size="md"
      icon={FileText}
      onClick={handleExport}
      loading={isExporting}
      disabled={!records || records.length === 0}
    >
      ייצוא ל-PDF
    </AppButton>
  );
}