import html2pdf from 'html2pdf.js';
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
    <Interior ss:Color="#334155" ss:Pattern="Solid"/>
    <Font ss:Bold="1" ss:Size="12" ss:FontName="Arial" ss:Color="#FFFFFF"/>
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

export const handleExportPDF = async (filteredRecords, getLegalStatusForRecord) => {
  try {
    const exportDate = new Date().toLocaleDateString('he-IL', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const htmlContent = `
      <div id="pdf-root" dir="rtl" lang="he" style="direction: rtl; text-align: right; unicode-bidi: plaintext; font-family: Arial, sans-serif;">
        <style>
          #pdf-root, #pdf-root * {
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
          #pdf-root th, #pdf-root td {
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
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 24px; font-weight: bold; margin: 0 0 10px 0; }
          .header p { font-size: 12px; margin: 5px 0; }
        </style>
        <div class="header">
          <h1>דו״ח חייבים</h1>
          <p>תאריך הפקה: ${exportDate}</p>
          <p style="font-weight: bold;">סה״כ ${filteredRecords.length} רשומות</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>מס׳ דירה</th>
              <th>שם בעל הדירה</th>
              <th>סה״כ חוב</th>
              <th>דמי ניהול</th>
              <th>מים חמים</th>
              <th>מצב משפטי</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRecords.map((r) => {
              const legalName = getLegalStatusForRecord(r)?.name || '-';
              return `<tr>
                <td><span class="num">${r.apartmentNumber || ''}</span></td>
                <td>${r.ownerName?.split(/[\/,]/)[0]?.trim() || '-'}</td>
                <td><span class="num">${formatCurrency(r.totalDebt)}</span></td>
                <td><span class="num">${formatCurrency(r.monthlyDebt)}</span></td>
                <td><span class="num">${formatCurrency(r.specialDebt)}</span></td>
                <td>${legalName}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    await document.fonts.ready;

    await html2pdf()
      .set({
        margin: 10,
        filename: `חייבים_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 1, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      })
      .from(tempDiv.querySelector('#pdf-root'))
      .save();

    document.body.removeChild(tempDiv);
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
        body { font-family: Arial, sans-serif; direction: rtl; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
        th { background-color: #334155; color: white; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        h1 { text-align: center; color: #333; }
      </style>
    </head>
    <body>
      <h1>דוח חייבים</h1>
      <p style="text-align:center">תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
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
  printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
};
