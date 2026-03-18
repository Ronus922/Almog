import { createClient } from 'npm:@base44/sdk@0.8.20';

const base44 = createClient({
  appId: Deno.env.get('BASE44_APP_ID'),
});

// פונקציה זו היא fallback — מעבירה הכל ל-whatsappWebhook
// Green API מוגדר עם /whatsappWebhook ישירות
Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return Response.json({ ok: true }, { status: 200 });
    }

    if (payload?.typeWebhook !== 'incomingMessageReceived') {
      return Response.json({ ok: true }, { status: 200 });
    }

    const idMessage = payload.idMessage;
    if (!idMessage) return Response.json({ ok: true }, { status: 200 });

    // בדיקת כפילות
    const existing = await base44.entities.ChatMessage.filter({ external_message_id: idMessage });
    if (existing && existing.length > 0) {
      return Response.json({ ok: true }, { status: 200 });
    }

    const senderRaw = payload.senderData?.sender || '';
    const senderChatId = payload.senderData?.chatId || '';
    let phone = senderRaw.replace('@c.us', '');
    if (phone.startsWith('972')) phone = '0' + phone.slice(3);

    const typeMessage = payload.messageData?.typeMessage;
    let messageType = 'text';
    let content = '';
    if (typeMessage === 'textMessage' || typeMessage === 'extendedTextMessage') {
      content = payload.messageData?.textMessageData?.textMessage
        || payload.messageData?.extendedTextMessageData?.text || '';
    } else if (typeMessage === 'imageMessage') {
      messageType = 'image';
      content = payload.messageData?.fileMessageData?.caption || '';
    } else if (typeMessage === 'documentMessage') {
      messageType = 'document';
      content = payload.messageData?.fileMessageData?.fileName || '';
    } else {
      content = typeMessage || '';
    }

    // חיפוש איש קשר
    let contactMatch = null;
    const rawPhone = senderRaw.replace('@c.us', '');
    const attempts = [
      { field: 'owner_phone', value: phone },
      { field: 'owner_phone', value: rawPhone },
      { field: 'tenant_phone', value: phone },
      { field: 'tenant_phone', value: rawPhone },
    ];
    for (const attempt of attempts) {
      if (contactMatch) break;
      const results = await base44.entities.Contact.filter({ [attempt.field]: attempt.value });
      if (results?.length > 0) contactMatch = results[0];
    }

    await base44.entities.ChatMessage.create({
      direction: 'received',
      external_message_id: idMessage,
      sender_chat_id: senderChatId,
      sender_phone_raw: senderRaw,
      contact_phone: phone,
      message_type: messageType,
      content: content,
      timestamp: payload.timestamp
        ? new Date(payload.timestamp * 1000).toISOString()
        : new Date().toISOString(),
      link_status: contactMatch ? 'linked' : 'unlinked',
      contact_id: contactMatch ? contactMatch.id : null,
    });

    console.log('[greenApiWebhook] ✅ הודעה נשמרה:', idMessage);
    return Response.json({ ok: true }, { status: 200 });

  } catch (err) {
    console.error('[greenApiWebhook] ❌ שגיאה:', err.message);
    return Response.json({ ok: true }, { status: 200 });
  }
});