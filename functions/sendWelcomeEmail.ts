import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Resend } from 'npm:resend@4.0.1';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { username, email, password, role, first_name, last_name } = await req.json();

    console.log('[WELCOME_EMAIL] Request params:', { username, email, role, first_name, last_name });

    if (!email || !username || !password) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const fullName = first_name && last_name ? `${first_name} ${last_name}` : username;
    const loginUrl = 'https://almogbilling.base44.app';

    const emailSubject = 'ברוכים הבאים למערכת ניהול חייבים - בניין אלמוג';
    const emailBody = `<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f8fafc;direction:rtl">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto">
<tr>
<td>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
<tr>
<td style="background:#1e3a8a;color:#fff;padding:25px;text-align:center">
<h1 style="margin:0;font-size:26px;font-weight:700">שלום ${fullName}</h1>
<p style="margin:8px 0 0;font-size:14px">מערכת ניהול חייבים - בניין אלמוג</p>
</td>
</tr>
<tr>
<td style="padding:25px">
<table cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
<td style="background:#eff6ff;border-right:4px solid #3b82f6;padding:15px;margin-bottom:25px;border-radius:8px">
<p style="font-size:15px;color:#1e3a8a;margin:0">חברת הניהול רוצה לשתף אותך עם מידע לגבי חייבים בבניין אלמוג.<br><br>האפליקציה/אתר תאפשר לך לעקוב אחרי חייבים, חובות וסטטוס משפטי של כל דייר.</p>
</td>
</tr>
</table>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:25px">
<tr>
<td style="background:#dcfce7;border:2px solid #16a34a;border-radius:12px;padding:20px">
<p style="margin:0 0 12px;font-size:15px;color:#15803d;font-weight:600;text-align:right">פרטי התחברות למערכת:</p>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff;border-radius:8px;padding:15px;margin-bottom:12px">
<tr>
<td style="text-align:right">
<p style="margin:8px 0;font-size:15px;color:#334155"><strong>שם משתמש:</strong> ${username}</p>
<p style="margin:8px 0;font-size:15px;color:#334155"><strong>סיסמה:</strong> ${password}</p>
<p style="margin:8px 0;font-size:15px;color:#1e40af"><strong>תפקיד:</strong> ${role === 'ADMIN' ? 'מנהל - גישה מלאה' : 'צופה - גישה לצפייה'}</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:32px 0">
<tr>
<td style="text-align:center">
<a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(37,99,235,0.3)">לאתר לחץ כאן</a>
</td>
</tr>
</table>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;padding-top:24px;border-top:1px solid #e2e8f0">
<tr>
<td style="text-align:right">
<p style="font-size:14px;color:#64748b;margin:0">בברכה,<br><strong>מערכת ניהול חייבים - בניין אלמוג</strong></p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;

    console.log('[WELCOME_EMAIL] Sending email to:', email);

    const { data, error } = await resend.emails.send({
      from: 'מערכת בניין אלמוג <onboarding@resend.dev>',
      to: [email],
      subject: emailSubject,
      html: emailBody
    });

    if (error) {
      console.error('[WELCOME_EMAIL] Resend error:', error);
      throw new Error(`Resend API error: ${JSON.stringify(error)}`);
    }

    console.log('[WELCOME_EMAIL] Email sent successfully:', data);

    return Response.json({ 
      success: true, 
      message: `Welcome email sent to ${email}`,
      emailId: data?.id
    });
  } catch (error) {
    console.error('[WELCOME_EMAIL] Error sending welcome email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});