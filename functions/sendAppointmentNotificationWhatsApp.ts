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

    const settings = await base44.asServiceRole.entities.Settings.list();
    const greenApiInstanceId = settings[0]?.greenApiInstanceId;
    const greenApiToken = settings[0]?.greenApiToken;

    if (!greenApiInstanceId || !greenApiToken) {
      return Response.json({ 
        success: false, 
        error: 'וואטסאפ לא מחובר' 
      }, { status: 400 });
    }

    // Get user's contact info - try to get their phone from Contact entity
    const contacts = await base44.asServiceRole.entities.Contact.filter({ 
      created_by: user.email 
    });
    
    const userPhone = contacts[0]?.tenant_phone || contacts[0]?.owner_phone;

    if (!userPhone) {
      return Response.json({ 
        success: false, 
        error: 'אין מספר טלפון זמין' 
      }, { status: 400 });
    }

    const phoneNumber = userPhone.replace(/\D/g, '');

    const message = `🗓️ *פגישה חדשה*\n\n` +
      `*כותרת:* ${data.title}\n` +
      `*תאריך:* ${data.date}\n` +
      `*שעה:* ${data.start_time}\n` +
      `${data.location ? `*מיקום:* ${data.location}\n` : ''}` +
      `${data.description ? `*תיאור:* ${data.description}` : ''}`;

    const response = await fetch(
      `https://api.green-api.com/waMessage/SendMessage/${greenApiInstanceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: `${phoneNumber}@c.us`,
          message: message,
          token: greenApiToken,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Green API Error:', error);
      return Response.json({ 
        success: false, 
        error: 'שגיאה בשליחת הודעה' 
      }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});