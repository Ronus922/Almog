import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Resend } from 'npm:resend@4.0.0';
import { PDFDocument, PDFPage, rgb } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return Response.json({ error: 'Email service not configured' }, { status: 500 });
    }
    
    const resend = new Resend(resendApiKey);

    const { debtorRecordId, newStatusId } = await req.json();

    if (!debtorRecordId || !newStatusId) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // טעינת נתונים
    const record = await base44.asServiceRole.entities.DebtorRecord.get(debtorRecordId);
    const status = await base44.asServiceRole.entities.Status.get(newStatusId);
    const comments = await base44.asServiceRole.entities.Comment.filter({ debtor_record_id: debtorRecordId }, '-created_date');

    // בדיקה אם יש אימיילים להתראה
    if (!status.notification_emails || status.notification_emails.trim() === '') {
      return Response.json({ 
        success: true, 
        message: 'No notification emails configured for this status' 
      });
    }

    // יצירת PDF
    let pdfUrl = null;
    try {
      const pdfDoc = PDFDocument.create();
      let page = pdfDoc.addPage([595, 842]); // A4
      const { width, height } = page.getSize();
      let yPosition = height - 40;
      
      const fontSize = 12;
      const colors = { dark: rgb(0.11, 0.25, 0.69), text: rgb(0, 0, 0), light: rgb(0.94, 0.96, 0.99) };
      
      // כותרת
      page.drawText(`פרטי דירה ${record.apartmentNumber}`, { 
        x: width - 40, 
        y: yPosition, 
        size: 18, 
        color: colors.dark,
        maxWidth: width - 80
      });
      yPosition -= 30;
      
      // פרטים עיקריים
      page.drawText('פרטים עיקריים', { x: width - 40, y: yPosition, size: 14, color: colors.dark });
      yPosition -= 20;
      page.drawText(`מספר דירה: ${record.apartmentNumber}`, { x: width - 40, y: yPosition, size: fontSize, color: colors.text, maxWidth: width - 80 });
      yPosition -= 15;
      page.drawText(`בעל דירה: ${record.ownerName || 'לא צוין'}`, { x: width - 40, y: yPosition, size: fontSize, color: colors.text, maxWidth: width - 80 });
      yPosition -= 15;
      page.drawText(`טלפון: ${record.phoneOwner || 'אין'}`, { x: width - 40, y: yPosition, size: fontSize, color: colors.text, maxWidth: width - 80 });
      yPosition -= 25;
      
      // סטטוס משפטי
      page.drawText('סטטוס משפטי', { x: width - 40, y: yPosition, size: 14, color: colors.dark });
      yPosition -= 20;
      page.drawText(status.name, { x: width - 40, y: yPosition, size: fontSize, color: colors.dark, maxWidth: width - 80 });
      yPosition -= 25;
      
      // חוב
      page.drawText('פירוט חובות', { x: width - 40, y: yPosition, size: 14, color: colors.dark });
      yPosition -= 20;
      const totalDebtStr = `סה"כ חוב: ${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(record.totalDebt)}`;
      page.drawText(totalDebtStr, { x: width - 40, y: yPosition, size: fontSize, color: rgb(0.86, 0.12, 0.12), maxWidth: width - 80 });
      yPosition -= 15;
      page.drawText(`דמי ניהול: ${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(record.monthlyDebt)}`, { x: width - 40, y: yPosition, size: fontSize, color: colors.text, maxWidth: width - 80 });
      yPosition -= 15;
      page.drawText(`מים חמים: ${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(record.specialDebt)}`, { x: width - 40, y: yPosition, size: fontSize, color: colors.text, maxWidth: width - 80 });
      yPosition -= 25;
      
      // הערות
      if (comments && comments.length > 0) {
        page.drawText('הערות ותיעוד', { x: width - 40, y: yPosition, size: 14, color: colors.dark });
        yPosition -= 20;
        for (const comment of comments) {
          const commentLines = comment.content.split('\n');
          for (const line of commentLines.slice(0, 3)) {
            if (yPosition < 50) {
              page = pdfDoc.addPage([595, 842]);
              yPosition = height - 40;
            }
            page.drawText(`• ${line.substring(0, 70)}`, { x: width - 40, y: yPosition, size: 10, color: colors.text, maxWidth: width - 80 });
            yPosition -= 12;
          }
          yPosition -= 5;
        }
      }
      
      // שמירת PDF
      const pdfBytes = await pdfDoc.save();
      const fileName = `apartment_${record.apartmentNumber}_${Date.now()}.pdf`;
      
      console.log('PDF generated, size:', pdfBytes.length);
    } catch (pdfError) {
      console.error('Failed to generate PDF:', pdfError);
      // continue without PDF
    }

    const emails = status.notification_emails.split(',').map(e => e.trim()).filter(e => e);
    
    const emailResults = [];
    for (const email of emails) {
      try {
        console.log(`Sending email via Resend to: ${email}`);
        
        const emailHtml = `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc; border-radius: 8px;">
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #1e40af; margin-top: 0; border-bottom: 3px solid #1e40af; padding-bottom: 10px;">
                עדכון סטטוס משפטי
              </h2>
              <div style="margin: 20px 0; padding: 15px; background: #eff6ff; border-right: 4px solid #3b82f6; border-radius: 4px;">
                <p style="margin: 5px 0; font-size: 16px;"><strong>דירה:</strong> ${record.apartmentNumber}</p>
                <p style="margin: 5px 0; font-size: 16px;"><strong>בעל דירה:</strong> ${record.ownerName || 'לא צוין'}</p>
                <p style="margin: 5px 0; font-size: 16px;"><strong>סטטוס חדש:</strong> <span style="color: #dc2626; font-weight: bold;">${status.name}</span></p>
              </div>
              ${status.description ? `
                <div style="margin: 20px 0; padding: 15px; background: #fef2f2; border-radius: 4px;">
                  <p style="margin: 0; color: #991b1b;"><strong>תיאור הסטטוס:</strong></p>
                  <p style="margin: 10px 0 0 0;">${status.description}</p>
                </div>
              ` : ''}
              ${pdfUrl ? `
                <div style="margin: 20px 0; text-align: center;">
                  <a href="${pdfUrl}" style="display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    הורד פרטי דירה PDF
                  </a>
                </div>
              ` : ''}
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                מערכת ניהול חייבים • ${new Date().toLocaleString('he-IL')}
              </div>
            </div>
          </div>
        `;
        
        const result = await resend.emails.send({
          from: 'ניהול חייבים <onboarding@resend.dev>',
          to: email,
          subject: `עדכון סטטוס - דירה ${record.apartmentNumber}`,
          html: emailHtml
        });
        
        console.log(`Email sent successfully to ${email}:`, result);
        emailResults.push({ email, success: true, messageId: result.id });
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
        emailResults.push({ email, success: false, error: emailError.message });
      }
    }

    return Response.json({ 
      success: true, 
      message: `Notifications sent to ${emails.length} recipients`,
      emailResults,
      pdfUrl
    });

  } catch (error) {
    console.error('Error in sendStatusChangeNotification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});