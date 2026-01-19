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
              <div style="margin: 20px 0; padding: 15px; background: #f0fdf4; border-radius: 4px;">
                <p style="margin: 0; color: #166534; font-size: 14px;"><strong>פרטי הדירה:</strong></p>
                <div style="margin-top: 10px; font-size: 13px; line-height: 1.8;">
                  <p style="margin: 5px 0;"><strong>טלפון בעלים:</strong> ${record.phoneOwner || 'לא צוין'}</p>
                  <p style="margin: 5px 0;"><strong>טלפון שוכר:</strong> ${record.phoneTenant || 'לא צוין'}</p>
                  <p style="margin: 5px 0;"><strong>סה"כ חוב:</strong> ${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(record.totalDebt || 0)}</p>
                  <p style="margin: 5px 0;"><strong>דמי ניהול:</strong> ${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(record.monthlyDebt || 0)}</p>
                </div>
              </div>
              ${comments && comments.length > 0 ? `
                <div style="margin: 20px 0; padding: 15px; background: #faf5ff; border-radius: 4px;">
                  <p style="margin: 0 0 10px 0; color: #6b21a8;"><strong>הערות אחרונות:</strong></p>
                  ${comments.slice(0, 2).map(c => `
                    <div style="margin: 8px 0; padding: 8px; background: white; border-right: 3px solid #a78bfa; border-radius: 3px; font-size: 12px;">
                      <strong>${c.author_name}</strong> - ${new Date(c.created_date).toLocaleString('he-IL')}<br/>
                      ${c.content.substring(0, 100)}${c.content.length > 100 ? '...' : ''}
                    </div>
                  `).join('')}
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