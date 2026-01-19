import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // תוכן המייל בעברית (RTL)
    const emailBody = `
      <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px;">
          עדכון סטטוס משפטי - דירה ${record.apartmentNumber}
        </h2>
        
        <p style="font-size: 16px;">שלום,</p>
        
        <p style="font-size: 16px;">
          <strong>${user.username || user.email}</strong> עדכן את הסטטוס המשפטי של דירה 
          <strong>${record.apartmentNumber}</strong> ל-<strong>${status.name}</strong>
        </p>

        <div style="background: #f8fafc; border-right: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h3 style="color: #334155; margin: 0 0 10px 0;">פרטי הדירה:</h3>
          <p style="margin: 5px 0;"><strong>מספר דירה:</strong> ${record.apartmentNumber}</p>
          <p style="margin: 5px 0;"><strong>בעל דירה:</strong> ${record.ownerName || 'לא צוין'}</p>
          <p style="margin: 5px 0;"><strong>טלפון בעלים:</strong> ${record.phoneOwner || 'לא צוין'}</p>
          <p style="margin: 5px 0;"><strong>טלפון שוכר:</strong> ${record.phoneTenant || 'לא צוין'}</p>
        </div>

        <div style="background: #fef2f2; border: 2px solid #fca5a5; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h3 style="color: #991b1b; margin: 0 0 10px 0;">פירוט חובות:</h3>
          <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #dc2626;">
            סה״כ חוב: ${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.totalDebt || 0)}
          </p>
          <p style="margin: 5px 0;"><strong>דמי ניהול:</strong> ${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.monthlyDebt || 0)}</p>
          <p style="margin: 5px 0;"><strong>מים חמים:</strong> ${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(record.specialDebt || 0)}</p>
        </div>

        ${comments && comments.length > 0 ? `
          <div style="margin-top: 20px;">
            <h3 style="color: #334155; margin-bottom: 10px;">הערות ותיעוד:</h3>
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

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        
        <p style="color: #64748b; font-size: 12px; text-align: center;">
          נוצר ב-${new Date().toLocaleString('he-IL')} • מערכת ניהול חייבים
        </p>
      </div>
    `;

    // שליחת מיילים
    const emails = status.notification_emails.split(',').map(e => e.trim()).filter(e => e);
    
    const emailResults = [];
    for (const email of emails) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `עדכון סטטוס - דירה ${record.apartmentNumber}`,
          body: emailBody
        });
        emailResults.push({ email, success: true });
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