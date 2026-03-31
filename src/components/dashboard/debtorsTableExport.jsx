import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

const formatCurrency = (num) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);

export const handleExportExcel = (filteredRecords, getLegalStatusForRecord, getPhonePrimaryForTable) => {
  const rows = filteredRecords.map((r) => `
    <tr>
      <td>${r.apartmentNumber}</td>
      <td>${r.ownerName?.split(/[\/,]/)[0]?.trim() || '-'}</td>
      <td>${getPhonePrimaryForTable(r) || '-'}</td>
      <td>${r.totalDebt || 0}</td>
      <td>${r.monthlyDebt || 0}</td>
      <td>${r.specialDebt || 0}</td>
      <td>${getLegalStatusForRecord(r)?.name || '-'}</td>
    </tr>`).join('');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<!--[if gte mso 9]><xml>
<x:ExcelWorkbook>
<x:ExcelWorksheets>
<x:ExcelWorksheet>
<x:Name>חייבים</x:Name>
<x:WorksheetOptions>
<x:DisplayRightToLeft/>
</x:WorksheetOptions>
</x:ExcelWorksheet>
</x:ExcelWorksheets>
</x:ExcelWorkbook>
</xml><![endif]-->
<style>
  table { direction: rtl; }
  th { background-color: #f0f0f0; font-weight: bold; font-size: 14px; }
  th, td { text-align: right; padding: 8px; border: 1px solid #ccc; font-family: Arial, sans-serif; }
</style>
</head>
<body>
<table dir="rtl">
  <thead>
    <tr>
      <th>מספר דירה</th>
      <th>שם בעלים</th>
      <th>טלפון</th>
      <th>סה״כ חוב</th>
      <th>דמי ניהול</th>
      <th>מים חמים</th>
      <th>מצב משפטי</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
</body>
</html>`;

  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `חייבים_${new Date().toISOString().split('T')[0]}.xls`;
  link.click();
  URL.revokeObjectURL(url);
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
