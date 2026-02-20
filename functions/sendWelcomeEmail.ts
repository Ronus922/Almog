import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { username, email, password, role } = await req.json();

    if (!email || !username || !password) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const loginUrl = `${req.headers.get('origin') || 'https://app.base44.com'}/applogin`;

    const emailSubject = 'ברוכים הבאים למערכת ניהול חייבים - בניין אלמוג';
    const emailBody = `
      <div dir="rtl" style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h1 style="color: #1e40af; font-size: 24px; margin-bottom: 20px; text-align: right;">
            שלום ${username},
          </h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 16px; text-align: right;">
            אני רוצה לשתף אותך עם מידע לגבי חייבים בבניין אלמוג.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 16px; text-align: right;">
            האפליקציה תאפשר לך לעקוב אחרי חייבים, חובות וסטטוס משפטי של כל דייר.
          </p>
          
          <div style="background: #eef2ff; border-right: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 8px;">
            <p style="margin: 0 0 12px 0; font-size: 15px; color: #1e40af; text-align: right;">
              <strong>פרטי התחברות למערכת:</strong>
            </p>
            <p style="margin: 8px 0; font-size: 15px; color: #334155; text-align: right;">
              <strong>שם משתמש:</strong> ${username}
            </p>
            <p style="margin: 8px 0; font-size: 15px; color: #334155; text-align: right;">
              <strong>סיסמה:</strong> ${password}
            </p>
            <p style="margin: 12px 0 0 0; font-size: 15px; color: #1e40af; text-align: right;">
              <strong>תפקיד:</strong> ${role === 'ADMIN' ? 'מנהל - גישה מלאה' : 'צופה - גישה לצפייה'}
            </p>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
              כניסה למערכת
            </a>
          </div>
          
          <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-top: 24px; text-align: right;">
            <strong>שים לב:</strong> מומלץ לשנות את הסיסמה לאחר הכניסה הראשונה למערכת.
          </p>
          
          <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 14px; color: #64748b; text-align: right; margin: 0;">
              בברכה,<br/>
              <strong>מערכת ניהול חייבים - בניין אלמוג</strong>
            </p>
          </div>
        </div>
      </div>
    `;

    // Send email using Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'מערכת בניין אלמוג <no-reply@mail.bios.co.il>',
        to: [email],
        subject: emailSubject,
        html: emailBody
      })
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    return Response.json({ 
      success: true, 
      message: `Welcome email sent to ${email}` 
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});