import { createClient } from 'npm:@base44/sdk@0.8.20';

const base44 = createClient({
  appId: Deno.env.get('BASE44_APP_ID'),
});

Deno.serve(async (req) => {
  // קרא את ה-body לפני הכל
  let rawBody = '';
  try {
    rawBody = await req.text();
  } catch (e) {
    console.error('[WH] Failed to read body:', e.message);
    return Response.json({ ok: true }, { status: 200 });
  }

  // parse JSON
  let payload;
  try {
    payload = JSON.parse(rawBody);
    console.log('[WH] typeWebhook:', payload?.typeWebhook, '| idMessage:', payload?.idMessage);
  } catch (e) {
    console.error('[WH] JSON parse error:', e.message);
    return Response.json({ ok: true }, { status: 200 });
  }

  // רק הודעות נכנסות
  if (payload?.typeWebhook !== 'incomingMessageReceived') {
    return Response.json({ ok: true }, { status: 200 });
  }

  const idMessage = payload.idMessage;
  if (!idMessage) {
    return Response.json({ ok: true }, { status: 200 });
  }

  try {
    // בדיקת כפילות
    console.log('[WH] Checking duplicate for idMessage:', idMessage);
    const existing = await base44.entities.ChatMessage.filter({ external_message_id: idMessage });
    if (existing && existing.length > 0) {
      console.log('[WH] Duplicate detected, skipping');
      return Response.json({ ok: true }, { status: 200 });
    }
    console.log('[WH] No duplicate, proceeding...');

    // נרמול טלפון
    const senderRaw = payload.senderData?.sender || '';
    const senderChatId = payload.senderData?.chatId || '';
    let phone = senderRaw.replace('@c.us', '');
    if (phone.startsWith('972')) phone = '0' + phone.slice(3);
    console.log('[WH] Phone normalized:', phone, 'from:', senderRaw);

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
    console.log('[WH] messageType:', messageType, 'content:', content.slice(0, 100));

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
      const results = await base44.asServiceRole.entities.Contact.filter({ [attempt.field]: attempt.value });
      if (results?.length > 0) {
        contactMatch = results[0];
        console.log('[WH] Contact found via', attempt.field, '=', attempt.value);
      }
    }

    const linkStatus = contactMatch ? 'linked' : 'unlinked';
    console.log('[WH] linkStatus:', linkStatus);

    // יצירת ChatMessage
    await base44.asServiceRole.entities.ChatMessage.create({
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
      link_status: linkStatus,
      contact_id: contactMatch ? contactMatch.id : null,
    });

    console.log('[WH] ✅ ChatMessage created successfully!');
    return Response.json({ ok: true }, { status: 200 });

  } catch (err) {
    console.error('[WH] ❌ Error:', err.message);
    console.error('[WH] Stack:', err.stack);
    return Response.json({ ok: true }, { status: 200 });
  }
});