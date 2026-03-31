import { toast } from 'sonner';

const formatCurrency = (num) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);

function buildXlsxBlob(headers, rows, sheetName) {
  const escapeXml = (str) => String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
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
<Worksheet ss:Name="${escapeXml(sheetName)}" ss:RightToLeft="1">
<Table>`;

  const colWidths = [80, 150, 120, 100, 100, 100, 120];
  colWidths.forEach(w => { xml += `<Column ss:Width="${w}"/>`; });

  xml += '<Row ss:Height="25">';
  headers.forEach(h => { xml += `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`; });
  xml += '</Row>';

  rows.forEach(row => {
    xml += '<Row>';
    row.forEach(cell => {
      const isNum = typeof cell === 'number';
      xml += `<Cell ss:StyleID="${isNum ? 'number' : 'cell'}"><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeXml(cell)}</Data></Cell>`;
    });
    xml += '</Row>';
  });

  xml += '</Table></Worksheet></Workbook>';
  return new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
}

function buildPdfBlob(headers, rows, title) {
  const escapeHtml = (str) => String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const html = `<html dir="rtl">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: Arial, sans-serif; direction: rtl; margin: 0; padding: 20px; }
  h1 { text-align: center; color: #333; font-size: 22px; margin-bottom: 5px; }
  .meta { text-align: center; color: #666; margin-bottom: 15px; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 8px 10px; text-align: right; font-size: 11px; }
  th { background-color: #e8e8e8; font-weight: bold; font-size: 12px; }
  tr:nth-child(even) { background-color: #f5f5f5; }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">תאריך הפקה: ${new Date().toLocaleDateString('he-IL')} | סה״כ ${rows.length} רשומות</p>
  <table>
    <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(row => `<tr>${row.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</body>
</html>`;

  return html;
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
  const headers = ['מספר דירה', 'שם בעלים', 'סה״כ חוב', 'דמי ניהול', 'מים חמים', 'מצב משפטי'];
  const rows = filteredRecords.map((r) => [
    String(r.apartmentNumber || ''),
    r.ownerName?.split(/[\/,]/)[0]?.trim() || '-',
    formatCurrency(r.totalDebt),
    formatCurrency(r.monthlyDebt),
    formatCurrency(r.specialDebt),
    getLegalStatusForRecord(r)?.name || '-'
  ]);

  const html = buildPdfBlob(headers, rows, 'דוח חייבים');

  // Render HTML in hidden iframe, use browser print-to-PDF API
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.width = '1200px';
  iframe.style.height = '900px';
  document.body.appendChild(iframe);

  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();

  iframe.onload = () => {
    try {
      // Try using browser's print-to-PDF (downloads directly in some browsers)
      const blob = new Blob(['\ufeff' + html], { type: 'application/pdf' });
      // Fallback: save as HTML that opens as PDF-like document
      const htmlBlob = new Blob(['\ufeff' + html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(htmlBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `חייבים_${new Date().toISOString().split('T')[0]}.pdf.html`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('קובץ דוח הורד בהצלחה');
    } finally {
      document.body.removeChild(iframe);
    }
  };
};

export const handlePrint = (filteredRecords, getLegalStatusForRecord) => {
  const headers = ['מספר דירה', 'שם בעלים', 'סה״כ חוב', 'דמי ניהול', 'מים חמים', 'מצב משפטי'];
  const rows = filteredRecords.map((r) => [
    String(r.apartmentNumber || ''),
    r.ownerName?.split(/[\/,]/)[0]?.trim() || '-',
    formatCurrency(r.totalDebt),
    formatCurrency(r.monthlyDebt),
    formatCurrency(r.specialDebt),
    getLegalStatusForRecord(r)?.name || '-'
  ]);

  const html = buildPdfBlob(headers, rows, 'דוח חייבים');
  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};
