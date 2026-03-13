import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get Green API credentials
    let instanceId = Deno.env.get('GREEN_API_INSTANCE_ID');
    let token = Deno.env.get('GREEN_API_TOKEN');
    
    try {
      const settingsList = await base44.asServiceRole.entities.Settings.list();
      if (settingsList.length > 0) {
        const s = settingsList[0];
        if (s.greenApiInstanceId) instanceId = s.greenApiInstanceId;
        if (s.greenApiToken) token = s.greenApiToken;
      }
    } catch { /* fallback to env */ }

    if (!instanceId || !token) {
      return Response.json({ error: 'Green API credentials not configured' }, { status: 500 });
    }

    // Get last message timestamp from storage
    const settingsList = await base44.asServiceRole.entities.Settings.list();
    let lastMessageTime = settingsList[0]?.lastWhatsAppCheckTime ? new Date(settingsList[0].lastWhatsAppCheckTime).getTime() / 1000 : Math.floor(Date.now() / 1000) - 300;

    // Fetch messages from Green API
    const res = await fetch(`https://api.green-api.com/waInstance${instanceId}/messages/${token}`, {
      method: 'GET'
    });

    if (!res.ok) {
      console.error('Green API error:', res.status);
      return Response.json({ error: 'Failed to fetch messages from Green API' }, { status: res.status });
    }

    const data = await res.json();
    const messages = data?.data || [];

    // Process new messages
    let processedCount = 0;
    for (const msg of messages) {
      if (msg.timestamp <= lastMessageTime || msg.typeMessage === 'outgoing') continue;

      const phone = msg.senderData?.sender?.replace('@c.us', '') || '';
      if (!phone) continue;

      // Normalize phone for matching
      let normalizedPhone = phone;
      if (phone.startsWith('972')) {
        normalizedPhone = '0' + phone.slice(3);
      }

      // Find contact
      const contacts = await base44.asServiceRole.entities.Contact.filter({
        "$or": [
          { "owner_phone": phone },
          { "owner_phone": normalizedPhone },
          { "tenant_phone": phone },
          { "tenant_phone": normalizedPhone }
        ]
      });

      if (contacts?.length > 0) {
        // Save message
        try {
          await base44.asServiceRole.entities.ChatMessage.create({
            contact_id: contacts[0].id,
            contact_phone: phone,
            direction: 'received',
            message_type: 'text',
            content: msg.textMessageData?.textMessage || msg.body || '',
            timestamp: new Date(msg.timestamp * 1000).toISOString()
          });
          processedCount++;
        } catch (e) {
          console.error('Failed to save message:', e);
        }
      }
    }

    // Update last check time
    if (settingsList.length > 0) {
      await base44.asServiceRole.entities.Settings.update(settingsList[0].id, {
        lastWhatsAppCheckTime: new Date().toISOString()
      });
    }

    return Response.json({ success: true, processedCount });
  } catch (error) {
    console.error('Poll error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});