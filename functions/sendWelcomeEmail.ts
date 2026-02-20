import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data, event } = await req.json();

    // Only send email on user creation
    if (event.type !== 'create') {
      return Response.json({ success: true, message: 'Not a create event, skipping' });
    }

    const newUser = data;
    if (!newUser.email) {
      return Response.json({ error: 'User has no email' }, { status: 400 });
    }

    const emailSubject = 'ברוכים הבאים למערכת ניהול חייבים - בניין אלמוג';
    const emailBody = `
      <div dir="rtl" style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h1 style="color: #1e40af; font-size: 24px; margin-bottom: 20px; text-align: right;">
            שלום ${newUser.username || newUser.first_name || 'משתמש'},
          </h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 16px; text-align: right;">
            אני רוצה לשתף אותך עם מידע לגבי חייבים בבניין אלמוג.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 16px; text-align: right;">
            האפליקציה תאפשר לך לעקוב אחרי חייבים, חובות וסטטוס משפטי של כל דייר.
          </p>
          
          <div style="background: #eef2ff; border-right: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 8px;">
            <p style="margin: 0; font-size: 15px; color: #1e40af; text-align: right;">
              <strong>תפקידך במערכת:</strong> ${newUser.role === 'ADMIN' ? 'מנהל - יש לך גישה מלאה לכל הפונקציות' : 'צופה - יש לך גישה לצפייה במידע'}
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 24px; text-align: right;">
            ניתן להתחבר למערכת ולהתחיל לעבוד עם הנתונים.
          </p>
          
          <div style="text-align: center; margin-top: 32px;">
            <p style="font-size: 14px; color: #64748b; text-align: right;">
              בברכה,<br/>
              <strong>מערכת ניהול חייבים - בניין אלמוג</strong>
            </p>
          </div>
        </div>
      </div>
    `;

    // Send email using Core.SendEmail integration
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: newUser.email,
      subject: emailSubject,
      body: emailBody
    });

    return Response.json({ 
      success: true, 
      message: `Welcome email sent to ${newUser.email}` 
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});