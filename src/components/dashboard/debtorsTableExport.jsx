import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

const formatCurrency = (num) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);

export const handleExportExcel = (filteredRecords, getLegalStatusForRecord, getPhonePrimaryForTable) => {
  // Build CSV with BOM for Hebrew support
  const headers = ['מספר דירה', 'שם בעלים', 'טלפון', 'סה״כ חוב', 'דמי ניהול', 'מים חמים', 'מצב משפטי'];
  const rows = filteredRecords.map((r) => [
    r.apartmentNumber,
    r.ownerName?.split(/[\/,]/)[0]?.trim() || '-',
    getPhonePrimaryForTable(r),
    r.totalDebt || 0,
    r.monthlyDebt || 0,
    r.specialDebt || 0,
    getLegalStatusForRecord(r)?.name || '-'
  ]);

  const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `חייבים_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success('קובץ הורד בהצלחה - פתח באקסל');
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
