import { createClient } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  let rawBody = '';
  try {
    rawBody = await req.text();
  } catch (e) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  console.log('[WH] Received typeWebhook:', payload?.typeWebhook);

  if (payload?.typeWebhook !== 'incomingMessageReceived') {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const idMessage = payload.idMessage;
  if (!idMessage) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // יצירת client ישיר עם APP_ID בלבד (ללא auth)
  const appId = Deno.env.get('BASE44_APP_ID');
  const base44 = createClient({ appId });

  try {
    // בדיקת כפילות
    const existing = await base44.asServiceRole.entities.ChatMessage.filter({ external_message_id: idMessage });
    if (existing && existing.length > 0) {
      console.log('[WH] Duplicate, skipping:', idMessage);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // נרמול טלפון
    const senderRaw = payload.senderData?.sender || '';
    const senderChatId = payload.senderData?.chatId || '';
    let phone = senderRaw.replace('@c.us', '');
    if (phone.startsWith('972')) phone = '0' + phone.slice(3);
    console.log('[WH] Phone:', phone);

    // תוכן הודעה
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
    for (const [field, val] of [
      ['owner_phone', phone],
      ['owner_phone', rawPhone],
      ['tenant_phone', phone],
      ['tenant_phone', rawPhone],
    ]) {
      if (contactMatch) break;
      const res = await base44.asServiceRole.entities.Contact.filter({ [field]: val });
      if (res?.length > 0) contactMatch = res[0];
    }

    await base44.asServiceRole.entities.ChatMessage.create({
      direction: 'received',
      external_message_id: idMessage,
      sender_chat_id: senderChatId,
      sender_phone_raw: senderRaw,
      contact_phone: phone,
      message_type: messageType,
      content,
      timestamp: payload.timestamp
        ? new Date(payload.timestamp * 1000).toISOString()
        : new Date().toISOString(),
      link_status: contactMatch ? 'linked' : 'unlinked',
      contact_id: contactMatch ? contactMatch.id : null,
    });

    console.log('[WH] ✅ Saved message:', idMessage);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[WH] ❌ Error:', err.message);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
});