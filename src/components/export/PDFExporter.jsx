import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function PDFExporter({ records, legalStatuses, settings }) {
  const handleExport = async () => {
    // Create a temporary container for the table
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1200px';
    container.style.background = 'white';
    container.style.padding = '40px';
    container.style.direction = 'rtl';
    
    const exportDate = new Date().toLocaleDateString('he-IL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    container.innerHTML = `
      <div style="font-family: Arial, sans-serif;">
        <h1 style="text-align: center; margin-bottom: 10px; font-size: 24px;">דו״ח חייבים</h1>
        <p style="text-align: center; color: #666; margin-bottom: 30px; font-size: 14px;">תאריך הפקה: ${exportDate}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #334155; color: white;">
              <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">מספר דירה</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">שם בעל הדירה</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">טלפון</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">סה״כ חוב</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">סטטוס חוב</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">מצב משפטי</th>
            </tr>
          </thead>
          <tbody>
            ${records.map((record, idx) => {
              const legalStatus = legalStatuses.find(s => s.id === record.legal_status_manual_id);
              const bgColor = idx % 2 === 0 ? '#fff' : '#f8fafc';
              
              return `
                <tr style="background: ${bgColor};">
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${record.apartmentNumber || ''}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${record.ownerName || ''}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${record.phonePrimary || ''}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.totalDebt || 0)}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${record.debt_status_auto || 'סך חוב תקין'}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${legalStatus ? legalStatus.name : '—'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    document.body.appendChild(container);
    
    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 277;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`חייבים_${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      document.body.removeChild(container);
    }
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm" className="h-11 rounded-xl">
      <FileText className="w-4 h-4 ml-2" />
      ייצוא ל-PDF
    </Button>
  );
}