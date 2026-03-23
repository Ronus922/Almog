import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data } = await req.json();

    if (event.type !== 'create') {
      return Response.json({ success: true });
    }

    if (!data) {
      return Response.json({ success: true });
    }

    const emailSubject = `📅 פגישה חדשה: ${data.title}`;
    const emailBody = `
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { color: #2563eb; margin: 0; font-size: 24px; }
    .details { margin-bottom: 20px; }
    .detail-item { margin-bottom: 12px; }
    .detail-label { font-weight: bold; color: #333; }
    .detail-value { color: #666; }
    .footer { border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🗓️ פגישה חדשה</h1>
    </div>
    
    <div class="details">
      <div class="detail-item">
        <span class="detail-label">כותרת:</span>
        <span class="detail-value">${data.title}</span>
      </div>
      
      <div class="detail-item">
        <span class="detail-label">תאריך:</span>
        <span class="detail-value">${new Date(data.date).toLocaleDateString('he-IL')}</span>
      </div>
      
      <div class="detail-item">
        <span class="detail-label">שעה:</span>
        <span class="detail-value">${data.start_time} - ${data.end_time}</span>
      </div>
      
      ${data.location ? `
      <div class="detail-item">
        <span class="detail-label">מיקום:</span>
        <span class="detail-value">${data.location}</span>
      </div>
      ` : ''}
      
      ${data.appointment_type ? `
      <div class="detail-item">
        <span class="detail-label">סוג:</span>
        <span class="detail-value">${data.appointment_type}</span>
      </div>
      ` : ''}
      
      ${data.description ? `
      <div class="detail-item">
        <span class="detail-label">תיאור:</span>
        <span class="detail-value">${data.description}</span>
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>הודעה זו נשלחה מ-יומן ניהול</p>
    </div>
  </div>
</body>
</html>
    `;

    const response = await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: emailSubject,
      body: emailBody,
      from_name: 'יומן ניהול',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});