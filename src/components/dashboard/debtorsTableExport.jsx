import { toast } from 'sonner';

const formatCurrency = (num) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);

function buildXlsxBlob(headers, rows, sheetName) {
  // Build XML-based SpreadsheetML (native Excel XML format with full UTF-8)
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:x="urn:schemas-microsoft-com:office:excel">
<ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
  <WindowHeight>12000</WindowHeight>
  <WindowWidth>20000</WindowWidth>
  <ActiveSheet>0</ActiveSheet>
</ExcelWorkbook>
<Styles>
  <Style ss:ID="header">
    <Font ss:Bold="1" ss:Size="12" ss:FontName="Arial"/>
    <Interior ss:Color="#E8E8E8" ss:Pattern="Solid"/>
    <Alignment ss:Horizontal="Right" ss:ReadingOrder="RightToLeft"/>
  </Style>
  <Style ss:ID="cell">
    <Font ss:Size="11" ss:FontName="Arial"/>
    <Alignment ss:Horizontal="Right" ss:ReadingOrder="RightToLeft"/>
  </Style>
  <Style ss:ID="number">
    <Font ss:Size="11" ss:FontName="Arial"/>
    <NumberFormat ss:Format="#,##0"/>
    <Alignment ss:Horizontal="Right" ss:ReadingOrder="RightToLeft"/>
  </Style>
</Styles>
<Worksheet ss:Name="${sheetName}" ss:RightToLeft="1">
<Table>`;

  const escapeXml = (str) => String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  let xml = xmlHeader;

  // Column widths
  const colWidths = [80, 150, 120, 100, 100, 100, 120];
  colWidths.forEach(w => { xml += `<Column ss:Width="${w}"/>`; });

  // Header row
  xml += '<Row ss:Height="25">';
  headers.forEach(h => {
    xml += `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`;
  });
  xml += '</Row>';

  // Data rows
  rows.forEach(row => {
    xml += '<Row>';
    row.forEach((cell, idx) => {
      const isNum = typeof cell === 'number';
      const style = isNum ? 'number' : 'cell';
      const type = isNum ? 'Number' : 'String';
      xml += `<Cell ss:StyleID="${style}"><Data ss:Type="${type}">${escapeXml(cell)}</Data></Cell>`;
    });
    xml += '</Row>';
  });

  xml += '</Table></Worksheet></Workbook>';

  return new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
}

export const handleExportExcel = (filteredRecords, getLegalStatusForRecord, getPhonePrimaryForTable) => {
  const headers = ['מספר דירה', 'שם בעלים', 'טלפון', 'סה״כ חוב', 'דמי ניהול', 'מים חמים', 'מצב משפטי'];

  const rows = filteredRecords.map((r) => [
    String(r.apartmentNumber || ''),
    r.ownerName?.split(/[\/,]/)[0]?.trim() || '-',
    getPhonePrimaryForTable(r) || '-',
    r.totalDebt || 0,
    r.monthlyDebt || 0,
    r.specialDebt || 0,
    getLegalStatusForRecord(r)?.name || '-'
  ]);

  const blob = buildXlsxBlob(headers, rows, 'חייבים');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `חייבים_${new Date().toISOString().split('T')[0]}.xls`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success('קובץ אקסל הורד בהצלחה');
};

export const handleExportPDF = (filteredRecords, getLegalStatusForRecord) => {
  // PDF via print-ready HTML (proven to work with Hebrew)
  const printWindow = window.open('', '_blank');
  const html = `
    <html dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>דוח חייבים</title>
      <style>
        @media print { @page { size: landscape; margin: 10mm; } }
        body { font-family: Arial, sans-serif; direction: rtl; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #999; padding: 10px; text-align: right; font-size: 12px; }
        th { background-color: #e8e8e8; font-weight: bold; font-size: 13px; }
        tr:nth-child(even) { background-color: #f5f5f5; }
        h1 { text-align: center; color: #333; font-size: 22px; }
        .meta { text-align: center; color: #666; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <h1>דוח חייבים</h1>
      <p class="meta">תאריך הפקה: ${new Date().toLocaleDateString('he-IL')} | סה״כ ${filteredRecords.length} רשומות</p>
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
  toast.success('חלון הדפסה/PDF נפתח');
};

export const handlePrint = (filteredRecords, getLegalStatusForRecord) => {
  // Same as PDF - opens print dialog
  handleExportPDF(filteredRecords, getLegalStatusForRecord);
};
