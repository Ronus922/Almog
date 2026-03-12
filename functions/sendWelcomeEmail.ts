import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get Gmail connection
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    
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
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;600;700&display=swap');
</style>
</head>
<body style="margin:0;padding:20px;font-family:'Noto Sans Hebrew','Segoe UI',Tahoma,sans-serif;background:#f8fafc;direction:rtl;text-align:right;line-height:1.6">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;direction:rtl">
<tr>
<td>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);direction:rtl">
<tr>
<td style="background:#1e3a8a;color:#fff;padding:25px;text-align:center;direction:rtl">
<h1 style="margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px">שלום ${fullName}</h1>
<p style="margin:8px 0 0;font-size:15px;font-weight:500">מערכת ניהול חייבים - בניין אלמוג</p>
</td>
</tr>
<tr>
<td style="padding:25px">
<table cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
<td style="background:#eff6ff;border-right:4px solid #3b82f6;padding:15px;margin-bottom:25px;border-radius:8px;text-align:right;direction:rtl">
<p style="font-size:15px;color:#1e3a8a;margin:0;text-align:right;line-height:1.7">חברת הניהול רוצה לשתף אותך עם מידע לגבי חייבים בבניין אלמוג.<br><br>האפליקציה/אתר תאפשר לך לעקוב אחרי חייבים, חובות וסטטוס משפטי של כל דייר.</p>
</td>
</tr>
</table>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:25px">
<tr>
<td style="background:#dcfce7;border:2px solid #16a34a;border-radius:12px;padding:20px;direction:rtl;text-align:right">
<p style="margin:0 0 15px;font-size:16px;color:#15803d;font-weight:700;text-align:right">פרטי התחברות למערכת:</p>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff;border-radius:8px;padding:15px;margin-bottom:12px;direction:rtl">
<tr>
<td style="text-align:right;padding:0">
<p style="margin:10px 0;font-size:15px;color:#334155;text-align:right"><strong>שם משתמש:</strong> <span style="font-family:monospace;direction:ltr;display:inline-block">${username}</span></p>
<p style="margin:10px 0;font-size:15px;color:#334155;text-align:right"><strong>סיסמה:</strong> <span style="font-family:monospace;direction:ltr;display:inline-block">${password}</span></p>
<p style="margin:10px 0;font-size:15px;color:#1e40af;text-align:right"><strong>תפקיד:</strong> ${role === 'admin' ? 'מנהל - גישה מלאה' : 'צופה - גישה לצפייה'}</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:32px 0;direction:rtl">
<tr>
<td style="text-align:center">
<a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:white;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 12px rgba(37,99,235,0.3);font-family:'Noto Sans Hebrew','Segoe UI',sans-serif">לאתר לחץ כאן</a>
</td>
</tr>
</table>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;padding-top:24px;border-top:1px solid #e2e8f0;direction:rtl">
<tr>
<td style="text-align:right;direction:rtl">
<p style="font-size:15px;color:#64748b;margin:0;line-height:1.8;text-align:right">בברכה,<br><strong style="font-weight:700">מערכת ניהול חייבים - בניין אלמוג</strong></p>
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

    const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: btoa(`To: ${email}\r\nSubject: ${emailSubject}\r\nContent-Type: text/html; charset="UTF-8"\r\n\r\n${emailBody}`)
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[WELCOME_EMAIL] Gmail API error:', data);
      throw new Error(`Gmail API error: ${JSON.stringify(data)}`);
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