import React, { useState } from 'react';
import AppButton from "@/components/ui/app-button";
import { FileText } from "lucide-react";
import { toast } from 'sonner';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Initialize pdfMake with fonts
pdfMake.vfs = pdfFonts.pdfMake.vfs;

// Pure function to build PDF document definition
export function buildDebtorsPdfDoc({ year, rows, statuses }) {
  const exportDate = new Date().toLocaleDateString('he-IL', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Build table body: header + all rows
  const tableBody = [
    // Header row
    [
      { text: 'מספר דירה', style: 'tableHeader', alignment: 'right' },
      { text: 'שם בעל הדירה', style: 'tableHeader', alignment: 'right' },
      { text: 'טלפון', style: 'tableHeader', alignment: 'right' },
      { text: 'סה״כ חוב', style: 'tableHeader', alignment: 'right' },
      { text: 'חוב חודשי', style: 'tableHeader', alignment: 'right' },
      { text: 'חוב מיוחד', style: 'tableHeader', alignment: 'right' },
      { text: 'סטטוס', style: 'tableHeader', alignment: 'right' },
      { text: 'מצב משפטי', style: 'tableHeader', alignment: 'right' }
    ]
  ];

  // Add all data rows
  rows.forEach(record => {
    const legalStatus = statuses?.find(s => s.id === record.legal_status_id && s.type === 'LEGAL');
    const legalStatusName = legalStatus?.name || 'לא הוגדר';
    
    tableBody.push([
      { text: record.apartmentNumber || '', alignment: 'right' },
      { text: record.ownerName || '', alignment: 'right' },
      { text: record.phonePrimary || '', alignment: 'right' },
      { text: new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.totalDebt || 0), style: 'bold', alignment: 'right' },
      { text: new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.monthlyDebt || 0), style: 'bold', alignment: 'right' },
      { text: new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.specialDebt || 0), style: 'bold', alignment: 'right' },
      { text: record.debt_status_auto || 'תקין', alignment: 'right' },
      { text: legalStatusName, style: 'bold', alignment: 'right' }
    ]);
  });

  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [20, 60, 20, 40],
    
    header: (currentPage, pageCount) => {
      return {
        margin: [20, 15, 20, 0],
        columns: [
          { 
            text: `עמוד ${currentPage} מתוך ${pageCount}`,
            alignment: 'left',
            fontSize: 8,
            color: '#666'
          },
          { 
            text: 'דו״ח חייבים',
            alignment: 'center',
            fontSize: 16,
            bold: true
          },
          { 
            text: exportDate,
            alignment: 'right',
            fontSize: 8,
            color: '#666'
          }
        ]
      };
    },

    footer: (currentPage, pageCount) => {
      return {
        margin: [20, 10],
        text: `סה״כ רשומות: ${rows.length}`,
        alignment: 'center',
        fontSize: 8,
        color: '#666'
      };
    },

    content: [
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: tableBody
        },
        layout: {
          fillColor: (rowIndex) => {
            if (rowIndex === 0) return '#334155';
            return (rowIndex % 2 === 0) ? '#f8fafc' : null;
          },
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#e2e8f0',
          vLineColor: () => '#e2e8f0'
        }
      }
    ],

    defaultStyle: {
      font: 'Roboto',
      fontSize: 9,
      alignment: 'right'
    },

    styles: {
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: 'white',
        fillColor: '#334155'
      },
      bold: {
        bold: true
      }
    }
  };

  return docDefinition;
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
      
      // Build document definition with ALL records
      const docDefinition = buildDebtorsPdfDoc({
        year,
        rows: records,
        statuses
      });
      
      console.log(`[PDF Export] renderedRows=${records.length}`);
      console.log(`[PDF Export] tableBody length=${docDefinition.content[0].table.body.length} (includes header)`);
      
      const filename = `חייבים_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Generate and download PDF
      pdfMake.createPdf(docDefinition).download(filename);
      
      console.log(`[PDF Export] Successfully exported ${records.length} records`);
      toast.success(`הקובץ יוצא בהצלחה (${records.length} רשומות)`);
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