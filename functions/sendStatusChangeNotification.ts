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
      console.log('No notification emails configured for status:', status.id);
      return Response.json({ 
        success: true, 
        message: 'No notification emails configured for this status' 
      });
    }

    const emails = status.notification_emails.split(',').map(e => e.trim()).filter(e => e);
    
    console.log('Sending notifications to emails:', emails);
    
    const emailResults = [];
    for (const email of emails) {
      try {
        console.log(`Sending email via Resend to: ${email}`);
        
        const emailHtml = `
          <!DOCTYPE html>
          <html dir="rtl">
          <head>
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: Arial, sans-serif; background: #f5f5f5; }
            </style>
          </head>
          <body style="margin: 0; padding: 20px; background: #f5f5f5;">
            <div style="width: 300px; margin: 0 auto; background: white; padding: 0;">

              <!-- Header -->
              <div style="background: #2563eb; color: white; padding: 20px 30px; border-bottom: 4px solid #1e40af;">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold; text-align: right;">פרטי דירה ${record.apartmentNumber}</h1>
              </div>

              <div style="padding: 30px;">

                <!-- הודעת פתיחה -->
                <div style="margin-bottom: 20px; padding: 15px; background: #eff6ff; border-radius: 8px; border-right: 4px solid #3b82f6;">
                  <p style="margin: 0 0 8px 0; color: #1e293b; font-size: 14px; text-align: right; line-height: 1.6;">
                    שלום, נשלח אליך מסמך פרטי דירה בעקבות שינוי סטטוס משפטי.
                  </p>
                  <p style="margin: 0; color: #64748b; font-size: 12px; text-align: right;">
                    הסטטוס עודכן ע"י: ${record.legal_status_updated_by || 'מערכת'}
                  </p>
                </div>

                <!-- פרטים עיקריים -->
                <div style="margin-bottom: 25px;">
                  <h2 style="font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 15px; text-align: right;">פרטים עיקריים</h2>
                  <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #475569;">מספר דירה:</td>
                        <td style="padding: 8px 0; text-align: right; color: #1e293b;">${record.apartmentNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #475569;">בעל דירה:</td>
                        <td style="padding: 8px 0; text-align: right; color: #1e293b;">${record.ownerName || 'לא צוין'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #475569;">טלפון בעלים:</td>
                        <td style="padding: 8px 0; text-align: right; color: #1e293b;">${record.phoneOwner || 'אין מספר'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #475569;">טלפון שוכר:</td>
                        <td style="padding: 8px 0; text-align: right; color: #1e293b;">${record.phoneTenant || 'אין מספר'}</td>
                      </tr>
                    </table>
                  </div>
                </div>

                <!-- סטטוס משפטי -->
                <div style="margin-bottom: 25px;">
                  <h2 style="font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 15px; text-align: right;">סטטוס משפטי</h2>
                  <div style="background: #dbeafe; padding: 15px; border-radius: 8px;">
                    <p style="margin: 0 0 8px 0; font-size: 20px; font-weight: bold; color: #1e40af; text-align: right;">${status.name}</p>
                    <p style="margin: 0; font-size: 13px; color: #64748b; text-align: right;">עודכן: ${new Date().toLocaleString('he-IL')}</p>
                  </div>
                </div>

                <!-- פירוט חובות -->
                <div style="margin-bottom: 25px;">
                  <h2 style="font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 15px; text-align: right;">פירוט חובות</h2>
                  <div style="border: 3px solid #fca5a5; border-radius: 12px; padding: 20px; background: #fef2f2;">
                    <div style="text-align: center; margin-bottom: 15px;">
                      <p style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold; color: #991b1b;">סה״כ חוב:</p>
                      <p style="margin: 0; font-size: 32px; font-weight: bold; color: #dc2626;">${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.totalDebt || 0)}</p>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                      <tr>
                        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #991b1b;">מים חמים:</td>
                        <td style="padding: 8px 0; text-align: right; color: #991b1b;">${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.specialDebt || 0)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #991b1b;">דמי ניהול:</td>
                        <td style="padding: 8px 0; text-align: right; color: #991b1b;">${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.monthlyDebt || 0)}</td>
                      </tr>
                    </table>
                  </div>
                </div>

                <!-- דמי ניהול לחודשים -->
                ${record.managementMonthsRaw ? `
                <div style="margin-bottom: 25px;">
                  <h2 style="font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 15px; text-align: right;">דמי ניהול לחודשים</h2>
                  <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <p style="margin: 0; color: #475569; text-align: right; white-space: pre-wrap; font-size: 14px;">${record.managementMonthsRaw}</p>
                  </div>
                </div>
                ` : ''}

                <!-- הערות ותיעוד -->
                ${comments && comments.length > 0 ? `
                <div style="margin-bottom: 25px;">
                  <h2 style="font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 15px; text-align: right;">הערות ותיעוד</h2>
                  <div style="border-right: 4px solid #3b82f6; padding-right: 0;">
                    ${comments.map(comment => `
                      <div style="background: #f8fafc; margin-bottom: 10px; padding: 15px; border-radius: 6px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                          <span style="font-weight: bold; color: #1e40af; font-size: 14px; text-align: right; display: block;">${comment.author_name}</span>
                          <span style="color: #64748b; font-size: 13px; text-align: left; display: block;">${new Date(comment.created_date).toLocaleString('he-IL')}</span>
                        </div>
                        <p style="margin: 0; color: #334155; text-align: right; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${comment.content}</p>
                      </div>
                    `).join('')}
                  </div>
                </div>
                ` : ''}

                <!-- Footer -->
                <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center;">
                  <p style="margin: 0; color: #94a3b8; font-size: 12px;">נוצר ב-${new Date().toLocaleString('he-IL')} • מערכת ניהול חייבים</p>
                </div>

              </div>
            </div>
          </body>
          </html>
        `;
        
        const result = await resend.emails.send({
          from: 'ניהול חייבים <onboarding@resend.dev>',
          to: email,
          subject: `עדכון סטטוס - דירה ${record.apartmentNumber}`,
          html: emailHtml
        });
        
        console.log(`Email sent successfully to ${email}:`, result.id);
        emailResults.push({ email, success: true, messageId: result.id });
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError.message);
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