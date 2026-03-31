import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

const formatCurrency = (num) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);

export const handleExportExcel = (filteredRecords, getLegalStatusForRecord, getPhonePrimaryForTable) => {
  const data = filteredRecords.map((r) => ({
    'מספר דירה': r.apartmentNumber,
    'שם בעלים': r.ownerName?.split(/[\/,]/)[0]?.trim() || '-',
    'טלפון': getPhonePrimaryForTable(r),
    'סה״כ חוב': r.totalDebt || 0,
    'דמי ניהול': r.monthlyDebt || 0,
    'מים חמים': r.specialDebt || 0,
    'מצב משפטי': getLegalStatusForRecord(r)?.name || '-'
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  // Set RTL for the sheet
  if (!ws['!sheetViews']) ws['!sheetViews'] = [{}];
  ws['!sheetViews'][0].rightToLeft = true;

  // Set column widths for Hebrew readability
  ws['!cols'] = [
    { wch: 12 },  // מספר דירה
    { wch: 25 },  // שם בעלים
    { wch: 15 },  // טלפון
    { wch: 14 },  // סה״כ חוב
    { wch: 14 },  // דמי ניהול
    { wch: 14 },  // מים חמים
    { wch: 16 },  // מצב משפטי
  ];

  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, 'חייבים');

  // Write with bookType xlsx which supports UTF-8 natively
  XLSX.writeFile(wb, `חייבים_${new Date().toISOString().split('T')[0]}.xlsx`, {
    bookType: 'xlsx',
    type: 'binary',
    bookSST: true,
    codepage: 65001
  });
  toast.success('קובץ אקסל הורד בהצלחה');
};

export const handleExportPDF = (filteredRecords, getLegalStatusForRecord) => {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    doc.setFontSize(16);
    doc.text('דוח חייבים', pageWidth / 2, margin + 10, { align: 'center' });

    doc.setFontSize(10);
    const headers = ['מספר דירה', 'שם בעלים', 'סה״כ חוב', 'דמי ניהול', 'מים חמים', 'מצב משפטי'];
    const rows = filteredRecords.map((r) => [
      r.apartmentNumber,
      r.ownerName?.split(/[\/,]/)[0]?.trim() || '-',
      formatCurrency(r.totalDebt),
      formatCurrency(r.monthlyDebt),
      formatCurrency(r.specialDebt),
      getLegalStatusForRecord(r)?.name || '-'
    ]);

    const startY = margin + 20;
    let currentY = startY;
    const rowHeight = 8;

    doc.setFillColor(240, 240, 240);
    headers.forEach((header, idx) => {
      const x = margin + (idx * (pageWidth - 2 * margin) / headers.length);
      doc.text(header, x, currentY, { maxWidth: (pageWidth - 2 * margin) / headers.length - 2 });
    });
    currentY += rowHeight;

    rows.forEach((row) => {
      if (currentY + rowHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }
      row.forEach((cell, idx) => {
        const x = margin + (idx * (pageWidth - 2 * margin) / headers.length);
        doc.text(String(cell), x, currentY, { maxWidth: (pageWidth - 2 * margin) / headers.length - 2 });
      });
      currentY += rowHeight;
    });

    doc.save(`חייבים_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('קובץ PDF הורד בהצלחה');
  } catch (error) {
    toast.error('שגיאה בייצוא PDF');
  }
};

export const handlePrint = (filteredRecords, getLegalStatusForRecord) => {
  const printWindow = window.open('', '_blank');
  const html = `
    <html dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>דוח חייבים</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; direction: rtl; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
        th { background-color: #f0f0f0; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        h1 { text-align: center; color: #333; }
      </style>
    </head>
    <body>
      <h1>דוח חייבים</h1>
      <p>תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
      <table>
        <thead>
          <tr>
            <th>מספר דירה</th>
            <th>שם בעלים</th>
            <th>סה״כ חוב</th>
            <th>דמי ניהול</th>
            <th>מים חמים</th>
            <th>מצב משפטי</th>
          </tr>
        </thead>
        <tbody>
          ${filteredRecords.map((r) => `
            <tr>
              <td>${r.apartmentNumber}</td>
              <td>${r.ownerName?.split(/[\/,]/)[0]?.trim() || '-'}</td>
              <td>${formatCurrency(r.totalDebt)}</td>
              <td>${formatCurrency(r.monthlyDebt)}</td>
              <td>${formatCurrency(r.specialDebt)}</td>
              <td>${getLegalStatusForRecord(r)?.name || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};
