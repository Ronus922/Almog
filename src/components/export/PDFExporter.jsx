import React, { useState } from 'react';
import AppButton from "@/components/ui/app-button";
import { FileText } from "lucide-react";
import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';

export default function PDFExporter({ records, statuses, settings }) {
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async () => {
    if (!records || records.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }
    
    console.log(`[PDF Export] Starting export of ${records.length} records`);
    setIsExporting(true);
    
    try {
      const exportDate = new Date().toLocaleDateString('he-IL', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Build HTML content with proper Hebrew support
      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700&display=swap" rel="stylesheet">
          <style>
            * {
              font-family: 'Heebo', Arial, sans-serif;
              direction: rtl;
            }
            body {
              margin: 0;
              padding: 20px;
              direction: rtl;
            }
            h1 {
              text-align: center;
              margin-bottom: 5px;
              font-size: 24px;
              font-weight: 700;
            }
            .subtitle {
              text-align: center;
              color: #666;
              margin-bottom: 20px;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
              direction: rtl;
            }
            thead {
              background: #334155;
              color: white;
            }
            th {
              padding: 8px 4px;
              border: 1px solid #ddd;
              text-align: right;
              font-weight: 700;
            }
            td {
              padding: 6px 4px;
              border: 1px solid #ddd;
              text-align: right;
            }
            tbody tr:nth-child(even) {
              background: #f8fafc;
            }
            .bold {
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <h1>דו״ח חייבים</h1>
          <div class="subtitle">תאריך הפקה: ${exportDate}</div>
          <table>
            <thead>
              <tr>
                <th style="width: 60px;">מספר דירה</th>
                <th style="width: 120px;">שם בעל הדירה</th>
                <th style="width: 80px;">טלפון</th>
                <th style="width: 70px;">סה״כ חוב</th>
                <th style="width: 70px;">חוב חודשי</th>
                <th style="width: 70px;">חוב מיוחד</th>
                <th style="width: 80px;">סטטוס</th>
                <th style="width: 100px;">מצב משפטי</th>
              </tr>
            </thead>
            <tbody>
              ${records.map(record => {
                const legalStatus = statuses?.find(s => s.id === record.legal_status_id && s.type === 'LEGAL');
                const legalStatusName = legalStatus?.name || 'לא הוגדר';
                
                return `
                  <tr>
                    <td>${record.apartmentNumber || ''}</td>
                    <td>${record.ownerName || ''}</td>
                    <td>${record.phonePrimary || ''}</td>
                    <td class="bold">${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.totalDebt || 0)}</td>
                    <td class="bold">${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.monthlyDebt || 0)}</td>
                    <td class="bold">${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.specialDebt || 0)}</td>
                    <td>${record.debt_status_auto || 'תקין'}</td>
                    <td class="bold">${legalStatusName}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;
      
      // Create temporary element
      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      document.body.appendChild(element);
      
      const opt = {
        margin: [10, 10, 15, 10],
        filename: `חייבים_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'landscape'
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      
      await html2pdf().set(opt).from(element).save();
      
      document.body.removeChild(element);
      
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