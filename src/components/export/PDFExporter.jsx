import React, { useState } from 'react';
import AppButton from "@/components/ui/app-button";
import { FileText } from "lucide-react";
import jsPDF from 'jspdf';
import { toast } from 'sonner';

// Load Hebrew font for jsPDF
const loadHebrewFont = (pdf) => {
  // Using Arial Unicode MS font that supports Hebrew
  pdf.setFont('helvetica');
};

export default function PDFExporter({ records, legalStatuses, settings }) {
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async () => {
    if (!records || records.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }
    
    setIsExporting(true);
    
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      loadHebrewFont(pdf);
      
      const exportDate = new Date().toLocaleDateString('he-IL', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Page settings
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - (margin * 2);
      const usableHeight = pageHeight - (margin * 2);
      
      // Table settings
      const rowHeight = 8;
      const headerHeight = 10;
      const startY = 35;
      let currentY = startY;
      let pageNumber = 1;
      
      // Column widths (total should be ~usableWidth)
      const colWidths = {
        apt: 20,
        owner: 45,
        phone: 28,
        totalDebt: 25,
        monthlyDebt: 25,
        specialDebt: 25,
        status: 30,
        legalStatus: 40
      };
      
      const drawHeader = (pdf, y) => {
        // Title
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('דו״ח חייבים', pageWidth / 2, 15, { align: 'center' });
        
        // Date
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`תאריך הפקה: ${exportDate}`, pageWidth / 2, 22, { align: 'center' });
        
        // Table header
        pdf.setFillColor(51, 65, 85);
        pdf.rect(margin, y, usableWidth, headerHeight, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        
        let x = margin + usableWidth;
        
        // Headers right to left
        x -= colWidths.legalStatus;
        pdf.text('מצב משפטי', x + colWidths.legalStatus / 2, y + 6.5, { align: 'center' });
        
        x -= colWidths.status;
        pdf.text('סטטוס', x + colWidths.status / 2, y + 6.5, { align: 'center' });
        
        x -= colWidths.specialDebt;
        pdf.text('חוב מיוחד', x + colWidths.specialDebt / 2, y + 6.5, { align: 'center' });
        
        x -= colWidths.monthlyDebt;
        pdf.text('חוב חודשי', x + colWidths.monthlyDebt / 2, y + 6.5, { align: 'center' });
        
        x -= colWidths.totalDebt;
        pdf.text('סה״כ חוב', x + colWidths.totalDebt / 2, y + 6.5, { align: 'center' });
        
        x -= colWidths.phone;
        pdf.text('טלפון', x + colWidths.phone / 2, y + 6.5, { align: 'center' });
        
        x -= colWidths.owner;
        pdf.text('שם בעל הדירה', x + colWidths.owner / 2, y + 6.5, { align: 'center' });
        
        x -= colWidths.apt;
        pdf.text('מספר דירה', x + colWidths.apt / 2, y + 6.5, { align: 'center' });
        
        pdf.setTextColor(0, 0, 0);
      };
      
      const drawFooter = (pdf, pageNum, totalPages) => {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`עמוד ${pageNum} מתוך ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      };
      
      // First page header
      drawHeader(pdf, startY - headerHeight);
      
      // Draw rows
      records.forEach((record, idx) => {
        // Check if we need a new page
        if (currentY + rowHeight > usableHeight + margin) {
          pageNumber++;
          pdf.addPage();
          currentY = startY;
          drawHeader(pdf, startY - headerHeight);
        }
        
        // Alternate row colors
        if (idx % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, currentY, usableWidth, rowHeight, 'F');
        }
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        
        const legalStatus = legalStatuses?.find(s => s.id === record.legal_status_id);
        const legalStatusName = legalStatus?.name || 'לא הוגדר';
        
        let x = margin + usableWidth;
        const textY = currentY + 5.5;
        
        // Data right to left
        x -= colWidths.legalStatus;
        pdf.setFont('helvetica', 'bold');
        pdf.text(legalStatusName, x + colWidths.legalStatus / 2, textY, { align: 'center', maxWidth: colWidths.legalStatus - 2 });
        
        x -= colWidths.status;
        pdf.setFont('helvetica', 'normal');
        pdf.text(record.debt_status_auto || 'תקין', x + colWidths.status / 2, textY, { align: 'center', maxWidth: colWidths.status - 2 });
        
        x -= colWidths.specialDebt;
        pdf.setFont('helvetica', 'bold');
        pdf.text(new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.specialDebt || 0), x + colWidths.specialDebt / 2, textY, { align: 'center' });
        
        x -= colWidths.monthlyDebt;
        pdf.text(new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.monthlyDebt || 0), x + colWidths.monthlyDebt / 2, textY, { align: 'center' });
        
        x -= colWidths.totalDebt;
        pdf.text(new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.totalDebt || 0), x + colWidths.totalDebt / 2, textY, { align: 'center' });
        
        x -= colWidths.phone;
        pdf.setFont('helvetica', 'normal');
        pdf.text(record.phonePrimary || '', x + colWidths.phone / 2, textY, { align: 'center' });
        
        x -= colWidths.owner;
        pdf.text(record.ownerName || '', x + colWidths.owner / 2, textY, { align: 'center', maxWidth: colWidths.owner - 2 });
        
        x -= colWidths.apt;
        pdf.text(record.apartmentNumber || '', x + colWidths.apt / 2, textY, { align: 'center' });
        
        currentY += rowHeight;
      });
      
      // Add footers to all pages
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        drawFooter(pdf, i, totalPages);
      }
      
      pdf.save(`חייבים_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(`הקובץ יוצא בהצלחה (${records.length} רשומות, ${totalPages} עמודים)`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
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