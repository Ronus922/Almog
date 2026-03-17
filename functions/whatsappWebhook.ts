import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  console.log('[WH] START', new Date().toISOString());

  const rawBody = await req.text();
  console.log('[WH] body:', rawBody?.slice(0, 300));

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.log('[WH] JSON parse error:', e.message);
    return Response.json({ ok: true }, { status: 200 });
  }

  const typeWebhook = payload?.typeWebhook;
  const idMessage = payload?.idMessage;
  console.log('[WH] typeWebhook:', typeWebhook, 'idMessage:', idMessage);

  if (typeWebhook !== 'incomingMessageReceived') {
    console.log('[WH] skip non-incoming:', typeWebhook);
    return Response.json({ ok: true }, { status: 200 });
  }

  if (!idMessage) {
    console.log('[WH] no idMessage');
    return Response.json({ ok: true }, { status: 200 });
  }

  try {
    const base44 = createClientFromRequest(req);

    // Dedup
    const existing = await base44.asServiceRole.entities.ChatMessage.filter({ external_message_id: idMessage });
    if (existing && existing.length > 0) {
      console.log('[WH] duplicate:', idMessage);
      return Response.json({ ok: true }, { status: 200 });
    }

    // Phone normalization
    const senderRaw = payload.senderData?.sender || '';
    const senderChatId = payload.senderData?.chatId || '';
    let phone = senderRaw.replace('@c.us', '');
    if (phone.startsWith('972')) phone = '0' + phone.slice(3);
    console.log('[WH] phone normalized:', phone);

    // Message content
    const typeMessage = payload.messageData?.typeMessage;
    let messageType = 'text';
    let content = '';

    if (typeMessage === 'textMessage' || typeMessage === 'extendedTextMessage') {
      content = payload.messageData?.textMessageData?.textMessage || payload.messageData?.extendedTextMessageData?.text || '';
    } else if (typeMessage === 'imageMessage') {
      messageType = 'image';
      content = payload.messageData?.fileMessageData?.caption || '';
    } else if (typeMessage === 'documentMessage') {
      messageType = 'document';
      content = payload.messageData?.fileMessageData?.fileName || '';
    } else {
      content = typeMessage || '';
    }

    // Find contact
    let contactMatch = null;
    const rawPhone = senderRaw.replace('@c.us', '');

    const q1 = await base44.asServiceRole.entities.Contact.filter({ owner_phone: phone });
    if (q1?.length > 0) { contactMatch = q1[0]; }
    else {
      const q2 = await base44.asServiceRole.entities.Contact.filter({ owner_phone: rawPhone });
      if (q2?.length > 0) { contactMatch = q2[0]; }
      else {
        const q3 = await base44.asServiceRole.entities.Contact.filter({ tenant_phone: phone });
        if (q3?.length > 0) { contactMatch = q3[0]; }
        else {
          const q4 = await base44.asServiceRole.entities.Contact.filter({ tenant_phone: rawPhone });
          if (q4?.length > 0) { contactMatch = q4[0]; }
        }
      }
    }

    const linkStatus = contactMatch ? 'linked' : 'unlinked';
    console.log('[WH] linkStatus:', linkStatus, contactMatch ? 'contactId:' + contactMatch.id : '');

    await base44.asServiceRole.entities.ChatMessage.create({
      direction: 'received',
      external_message_id: idMessage,
      sender_chat_id: senderChatId,
      sender_phone_raw: senderRaw,
      contact_phone: phone,
      message_type: messageType,
      content: content,
      timestamp: payload.timestamp ? new Date(payload.timestamp * 1000).toISOString() : new Date().toISOString(),
      link_status: linkStatus,
      contact_id: contactMatch ? contactMatch.id : null,
    });

    console.log('[WH] ChatMessage CREATED OK');
    return Response.json({ ok: true }, { status: 200 });

  } catch (err) {
    console.error('[WH] ERROR:', err.message);
    return Response.json({ ok: true }, { status: 200 });
  }
});