import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { debtorRecordId, newStatusId } = await req.json();

    if (!debtorRecordId || !newStatusId) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // טעינת נתונים
    const record = await base44.asServiceRole.entities.DebtorRecord.get(debtorRecordId);
    const status = await base44.asServiceRole.entities.Status.get(newStatusId);

    // בדיקה אם יש אימיילים להתראה
    if (!status.notification_emails || status.notification_emails.trim() === '') {
      return Response.json({ 
        success: true, 
        message: 'No notification emails configured for this status' 
      });
    }

    // שליחת מייל פשוט מאוד לבדיקה
    const emails = status.notification_emails.split(',').map(e => e.trim()).filter(e => e);
    
    const emailResults = [];
    for (const email of emails) {
      try {
        console.log(`Attempting to send email to: ${email}`);
        
        const result = await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `בדיקה - עדכון דירה ${record.apartmentNumber}`,
          body: `<div dir="rtl"><h2>עדכון סטטוס</h2><p>דירה ${record.apartmentNumber} עודכנה לסטטוס: ${status.name}</p></div>`
        });
        
        console.log(`Email sent successfully to ${email}:`, result);
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