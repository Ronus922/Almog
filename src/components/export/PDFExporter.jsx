import React, { useState } from 'react';
import AppButton from "@/components/ui/app-button";
import { FileText } from "lucide-react";
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';



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
      const totalRecords = records.length;
      const exportDate = new Date().toLocaleDateString('he-IL', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      console.log(`[PDF Export] Exporting ${totalRecords} records`);
      
      // Create HTML content for PDF
      const htmlContent = `
        <div id="pdf-root" dir="rtl" lang="he" style="direction: rtl; text-align: right; unicode-bidi: plaintext; font-family: Arial, sans-serif;">
          <style>
            #pdf-root,
            #pdf-root * {
              direction: rtl !important;
              text-align: right !important;
              unicode-bidi: plaintext !important;
            }

            #pdf-root table {
              direction: rtl !important;
              border-collapse: collapse;
              width: 100%;
              font-size: 9px;
            }

            #pdf-root th,
            #pdf-root td {
              text-align: right !important;
              padding: 6px 8px;
              border: 1px solid #e2e8f0;
              white-space: nowrap;
            }

            #pdf-root th {
              background-color: #334155;
              color: white;
              font-weight: bold;
              font-size: 10px;
            }

            #pdf-root tr:nth-child(even) {
              background-color: #f8fafc;
            }

            #pdf-root .num {
              direction: ltr !important;
              unicode-bidi: isolate !important;
              display: inline-block;
              font-weight: bold;
            }
            
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            
            .header h1 {
              font-size: 24px;
              font-weight: bold;
              margin: 0 0 10px 0;
            }
            
            .header p {
              font-size: 12px;
              margin: 5px 0;
            }
          </style>
          
          <div class="header">
            <h1>דו״ח חייבים</h1>
            <p>תאריך הפקה: ${exportDate}</p>
            <p style="font-weight: bold;">סה״כ רשומות שיוצאו: ${totalRecords}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>מס׳ דירה</th>
                <th>שם בעל הדירה</th>
                <th>טלפון</th>
                <th>סה״כ חוב</th>
                <th>חוב חודשי</th>
                <th>חוב מיוחד</th>
                <th>סטטוס</th>
                <th>מצב משפטי</th>
              </tr>
            </thead>
            <tbody>
              ${records.map(record => {
                const legalStatus = statuses?.find(s => s.id === record.legal_status_id && s.type === 'LEGAL');
                const legalStatusName = legalStatus?.name || 'לא הוגדר';

                return `
                  <tr>
                    <td><span class="num">${record.apartmentNumber || ''}</span></td>
                    <td>${record.ownerName || ''}</td>
                    <td><span class="num">${record.phonePrimary || ''}</span></td>
                    <td><span class="num">${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.totalDebt || 0)}</span></td>
                    <td><span class="num">${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.monthlyDebt || 0)}</span></td>
                    <td><span class="num">${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.specialDebt || 0)}</span></td>
                    <td>${record.debt_status_auto || 'תקין'}</td>
                    <td>${legalStatusName}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
      
      // Create temporary element
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);
      
      // Wait for fonts
      await document.fonts.ready;
      
      // Generate PDF
      await html2pdf()
        .set({
          margin: 10,
          filename: `חייבים_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 1,
            useCORS: true,
            backgroundColor: '#ffffff'
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
          }
        })
        .from(tempDiv.querySelector('#pdf-root'))
        .save();
      
      // Cleanup
      document.body.removeChild(tempDiv);
      
      console.log(`[PDF Export] Successfully exported ${totalRecords} records`);
      toast.success(`הקובץ יוצא בהצלחה (${totalRecords} רשומות)`);
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