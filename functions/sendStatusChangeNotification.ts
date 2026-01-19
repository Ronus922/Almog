import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Resend } from 'npm:resend@4.0.0';

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

    const emails = status.notification_emails.split(',').map(e => e.trim()).filter(e => e);
    
    // יצירת PDF עם פרטי הדירה
    const pdfBuffer = await generateApartmentPDF(record, status, comments);
    const pdfBase64 = btoa(String.fromCharCode.apply(null, new Uint8Array(pdfBuffer)));
    
    const emailResults = [];
    for (const email of emails) {
      try {
        console.log(`Sending email via Resend to: ${email}`);
        
        const result = await resend.emails.send({
          from: 'ניהול חייבים <onboarding@resend.dev>',
          to: email,
          subject: `עדכון סטטוס - דירה ${record.apartmentNumber}`,
          html: `
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
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                  מערכת ניהול חייבים • ${new Date().toLocaleString('he-IL')}<br/>
                  <em>פרטי הדירה מצורפים כ-PDF</em>
                </div>
              </div>
            </div>
          `,
          attachments: [
            {
              filename: `דירה_${record.apartmentNumber}_${new Date().toISOString().split('T')[0]}.pdf`,
              content: pdfBase64,
              encoding: 'base64'
            }
          ]
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
      emailResults
    });

  } catch (error) {
    console.error('Error in sendStatusChangeNotification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function generateApartmentPDF(record, status, comments) {
  const formatCurrency = (num) => 
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);

  const formatPhone = (phone) => {
    if (!phone) return 'אין מספר';
    const cleaned = phone.replace(/\D/g, '');
    if (/^0+$/.test(cleaned)) return 'אין מספר';
    return phone;
  };

  // HTML בדיוק כמו בפרונטאנד
  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; direction: rtl; }
        * { margin: 0; padding: 0; }
      </style>
    </head>
    <body style="direction: rtl; text-align: right; font-family: Arial, sans-serif; padding: 40px; background: white;">
      <div style="direction: rtl; text-align: right;">
        <h1 style="color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; margin-bottom: 20px;">
          פרטי דירה ${record.apartmentNumber}
        </h1>
        
        <div style="margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px;">
          <h3 style="color: #334155; margin: 0 0 10px 0;">פרטים עיקריים</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div><strong>מספר דירה:</strong> ${record.apartmentNumber}</div>
            <div><strong>בעל דירה:</strong> ${record.ownerName || 'לא צוין'}</div>
            <div><strong>טלפון בעלים:</strong> ${formatPhone(record.phoneOwner)}</div>
            <div><strong>טלפון שוכר:</strong> ${formatPhone(record.phoneTenant)}</div>
          </div>
        </div>

        <div style="margin-bottom: 20px; background: #eff6ff; padding: 15px; border-radius: 8px;">
          <h3 style="color: #334155; margin: 0 0 10px 0;">סטטוס משפטי</h3>
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${status.name}</div>
          ${status.description ? `<div style="font-size: 14px; color: #64748b;">${status.description}</div>` : ''}
        </div>

        <div style="margin-bottom: 20px; background: #fef2f2; border: 2px solid #fca5a5; padding: 15px; border-radius: 8px;">
          <h3 style="color: #991b1b; margin: 0 0 10px 0;">פירוט חובות</h3>
          <div style="font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 10px;">
            סה״כ חוב: ${formatCurrency(record.totalDebt)}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div><strong>דמי ניהול:</strong> ${formatCurrency(record.monthlyDebt)}</div>
            <div><strong>מים חמים:</strong> ${formatCurrency(record.specialDebt)}</div>
          </div>
        </div>

        ${record.managementMonthsRaw ? `
          <div style="margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px;">
            <h3 style="color: #334155; margin: 0 0 10px 0;">דמי ניהול לחודשים</h3>
            <div style="white-space: pre-wrap;">${record.managementMonthsRaw}</div>
          </div>
        ` : ''}

        ${comments && comments.length > 0 ? `
          <div style="margin-top: 20px;">
            <h3 style="color: #334155; margin-bottom: 10px;">הערות ותיעוד</h3>
            ${comments.map(comment => `
              <div style="background: #f8fafc; border-right: 4px solid #3b82f6; padding: 12px; margin-bottom: 10px; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; color: #64748b;">
                  <strong style="color: #1e40af;">${comment.author_name}</strong>
                  <span>${new Date(comment.created_date).toLocaleString('he-IL')}</span>
                </div>
                <div style="white-space: pre-wrap;">${comment.content}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
          נוצר ב-${new Date().toLocaleString('he-IL')} • מערכת ניהול חייבים
        </div>
      </div>
    </body>
    </html>
  `;

  // שימוש בPuppeteer כדי ליצור PDF בדיוק כמו בפרונטאנד
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: 0, bottom: 0, left: 0, right: 0 } });
    return pdfBuffer;
  } finally {
    if (browser) await browser.close();
  }
}