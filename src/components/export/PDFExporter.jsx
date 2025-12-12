import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PDFExporter({ records, legalStatuses, settings }) {
  const handleExport = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add Hebrew font support (using default font with RTL)
    doc.setLanguage("he");
    
    // Title
    doc.setFontSize(18);
    doc.text('דו״ח חייבים', 148.5, 15, { align: 'center' });
    
    // Date
    doc.setFontSize(10);
    const exportDate = new Date().toLocaleDateString('he-IL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`תאריך הפקה: ${exportDate}`, 148.5, 22, { align: 'center' });

    // Prepare table data
    const tableData = records.map(record => {
      const legalStatus = legalStatuses.find(s => s.id === record.legal_status_manual_id);
      
      return [
        record.apartmentNumber || '',
        record.ownerName || '',
        record.phonePrimary || '',
        new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.totalDebt || 0),
        record.debt_status_auto || 'סך חוב תקין',
        legalStatus ? legalStatus.name : '—'
      ];
    });

    // Add table
    autoTable(doc, {
      startY: 30,
      head: [['מספר דירה', 'שם בעל הדירה', 'טלפון', 'סה״כ חוב', 'סטטוס חוב', 'מצב משפטי']],
      body: tableData,
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 3,
        halign: 'right'
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'right'
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: 30, fontStyle: 'bold' },
        4: { cellWidth: 40 },
        5: { cellWidth: 40 }
      },
      margin: { top: 30, right: 10, left: 10 },
      tableWidth: 'auto'
    });

    // Save PDF
    doc.save(`חייבים_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm" className="h-11 rounded-xl">
      <FileText className="w-4 h-4 ml-2" />
      ייצוא ל-PDF
    </Button>
  );
}