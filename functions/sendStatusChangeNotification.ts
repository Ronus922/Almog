import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { debtorRecordId, newStatusId } = await req.json();

    if (!debtorRecordId || !newStatusId) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // טעינת נתונים
    const record = await base44.asServiceRole.entities.DebtorRecord.get(debtorRecordId);
    const status = await base44.asServiceRole.entities.Status.get(newStatusId);
    const comments = await base44.asServiceRole.entities.Comment.filter(
      { debtor_record_id: debtorRecordId },
      '-created_date'
    );

    // בדיקה אם יש אימיילים להתראה
    if (!status.notification_emails || status.notification_emails.trim() === '') {
      return Response.json({ 
        success: true, 
        message: 'No notification emails configured for this status' 
      });
    }

    // יצירת PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // כותרת
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(`Apartment ${record.apartmentNumber}`, 105, 20, { align: 'center' });

    // פרטים עיקריים
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Main Details:', 20, 35);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let y = 45;
    doc.text(`Apartment: ${record.apartmentNumber}`, 20, y);
    y += 7;
    doc.text(`Owner: ${record.ownerName || 'N/A'}`, 20, y);
    y += 7;
    doc.text(`Owner Phone: ${record.phoneOwner || 'N/A'}`, 20, y);
    y += 7;
    doc.text(`Tenant Phone: ${record.phoneTenant || 'N/A'}`, 20, y);
    y += 10;

    // סטטוס משפטי
    doc.setFont('helvetica', 'bold');
    doc.text('Legal Status:', 20, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${status.name}`, 20, y);
    y += 7;
    if (record.legal_status_updated_at) {
      doc.text(`Updated: ${new Date(record.legal_status_updated_at).toLocaleString('en-US')}`, 20, y);
      y += 7;
    }
    y += 5;

    // חובות
    doc.setFont('helvetica', 'bold');
    doc.text('Debts:', 20, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Debt: ${(record.totalDebt || 0).toLocaleString('en-US', { style: 'currency', currency: 'ILS' })}`, 20, y);
    y += 7;
    doc.text(`Monthly Debt: ${(record.monthlyDebt || 0).toLocaleString('en-US', { style: 'currency', currency: 'ILS' })}`, 20, y);
    y += 7;
    doc.text(`Special Debt: ${(record.specialDebt || 0).toLocaleString('en-US', { style: 'currency', currency: 'ILS' })}`, 20, y);
    y += 10;

    // הערות
    if (comments && comments.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Comments:', 20, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      
      for (const comment of comments) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(9);
        doc.text(`${comment.author_name} - ${new Date(comment.created_date).toLocaleString('en-US')}`, 20, y);
        y += 5;
        
        const lines = doc.splitTextToSize(comment.content, 170);
        doc.text(lines, 20, y);
        y += lines.length * 5 + 5;
      }
    }

    // המרת PDF לבייטים
    const pdfBytes = doc.output('arraybuffer');
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    // העלאת הקובץ
    const fileName = `apartment_${record.apartmentNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const file = new File([blob], fileName, { type: 'application/pdf' });

    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    // תוכן המייל בעברית (RTL)
    const emailBody = `
      <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
        <p>שלום,</p>
        <p>
          היוזר <strong>${user.username || user.email}</strong> מבקש לעדכן אותך על שינוי סטטוס של דירה 
          <strong>${record.apartmentNumber}</strong> ל-<strong>${status.name}</strong>
        </p>
        <p>מצורף קובץ PDF עם פרטי הדירה המלאים.</p>
        <p>בברכה,<br/>מערכת ניהול חייבים</p>
      </div>
    `;

    // שליחת מיילים
    const emails = status.notification_emails.split(',').map(e => e.trim()).filter(e => e);
    
    for (const email of emails) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `עדכון סטטוס - דירה ${record.apartmentNumber}`,
          body: emailBody
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
      }
    }

    return Response.json({ 
      success: true, 
      message: `Notifications sent to ${emails.length} recipients`,
      file_url 
    });

  } catch (error) {
    console.error('Error in sendStatusChangeNotification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});