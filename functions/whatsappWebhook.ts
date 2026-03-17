import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const rawBody = await req.text();
    console.log('[WEBHOOK] Raw body received:', rawBody?.slice(0, 500));
    console.log('[WEBHOOK] Method:', req.method);
    console.log('[WEBHOOK] Content-Type:', req.headers.get('content-type'));

    if (!rawBody || rawBody.trim() === '') {
      console.log('[WEBHOOK] Empty body, skipping');
      return Response.json({ message: 'OK - empty' }, { status: 200 });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error('[WEBHOOK] Failed to parse JSON:', e.message, 'Body was:', rawBody?.slice(0, 200));
      return Response.json({ message: 'OK - parse error' }, { status: 200 });
    }

    const typeWebhook = payload.typeWebhook;
    const idMessage = payload.idMessage;
    const senderChatId = payload.senderData?.chatId || null;
    const senderPhoneRaw = payload.senderData?.sender || null;
    const timestamp = payload.timestamp;
    const typeMessage = payload.messageData?.typeMessage;

    console.log('[WEBHOOK] typeWebhook:', typeWebhook);
    console.log('[WEBHOOK] idMessage:', idMessage);
    console.log('[WEBHOOK] senderData.chatId:', senderChatId);
    console.log('[WEBHOOK] senderData.sender:', senderPhoneRaw);
    console.log('[WEBHOOK] messageData.typeMessage:', typeMessage);

    // Process only real incoming messages
    if (typeWebhook !== 'incomingMessageReceived') {
      console.log('[WEBHOOK] Skipping non-incoming webhook:', typeWebhook);
      return Response.json({ message: 'OK - skipped' }, { status: 200 });
    }

    if (!idMessage) {
      console.log('[WEBHOOK] Missing idMessage, skipping');
      return Response.json({ message: 'OK - no idMessage' }, { status: 200 });
    }

    // Dedup by external_message_id
    const existing = await base44.asServiceRole.entities.ChatMessage.filter({
      external_message_id: idMessage
    });
    if (existing && existing.length > 0) {
      console.log('[WEBHOOK] Duplicate message, skipping:', idMessage);
      return Response.json({ message: 'OK - duplicate' }, { status: 200 });
    }

    // Normalize phone number
    let phone = senderPhoneRaw || '';
    if (phone.endsWith('@c.us')) phone = phone.replace('@c.us', '');
    if (phone.startsWith('972')) phone = '0' + phone.slice(3);

    // Map message type and content
    let messageType = 'text';
    let content = '';
    let mediaUrl = null;

    const textTypes = ['textMessage', 'extendedTextMessage'];
    const fileTypes = ['imageMessage', 'videoMessage', 'documentMessage', 'audioMessage', 'stickerMessage'];

    if (textTypes.includes(typeMessage)) {
      messageType = 'text';
      content =
        payload.messageData?.textMessageData?.textMessage ||
        payload.messageData?.extendedTextMessageData?.text ||
        '';
    } else if (fileTypes.includes(typeMessage)) {
      const fileData = payload.messageData?.fileMessageData || {};
      mediaUrl = fileData.downloadUrl || null;
      content = fileData.caption || fileData.fileName || '';
      if (typeMessage === 'imageMessage') messageType = 'image';
      else if (typeMessage === 'documentMessage') messageType = 'document';
      else messageType = 'image'; // video/audio/sticker → image fallback for enum
    } else {
      console.log('[WEBHOOK] Unknown typeMessage:', typeMessage, '— saving as text');
      messageType = 'text';
      content = typeMessage || '';
    }

    // Find matching contact - run separate queries (no $or support)
    const rawPhone = senderPhoneRaw?.replace('@c.us', '') || phone;
    let contactMatch = null;

    const byOwnerPhone = await base44.asServiceRole.entities.Contact.filter({ owner_phone: phone });
    if (byOwnerPhone && byOwnerPhone.length > 0) {
      contactMatch = byOwnerPhone[0];
    } else {
      const byOwnerRaw = await base44.asServiceRole.entities.Contact.filter({ owner_phone: rawPhone });
      if (byOwnerRaw && byOwnerRaw.length > 0) {
        contactMatch = byOwnerRaw[0];
      } else {
        const byTenantPhone = await base44.asServiceRole.entities.Contact.filter({ tenant_phone: phone });
        if (byTenantPhone && byTenantPhone.length > 0) {
          contactMatch = byTenantPhone[0];
        } else {
          const byTenantRaw = await base44.asServiceRole.entities.Contact.filter({ tenant_phone: rawPhone });
          if (byTenantRaw && byTenantRaw.length > 0) {
            contactMatch = byTenantRaw[0];
          }
        }
      }
    }
    console.log('[WEBHOOK] contactMatch:', contactMatch ? contactMatch.id : 'none', 'phone:', phone, 'rawPhone:', rawPhone);
    const linkStatus = contactMatch ? 'linked' : 'unlinked';

    const chatMessageData = {
      direction: 'received',
      external_message_id: idMessage,
      sender_chat_id: senderChatId,
      sender_phone_raw: senderPhoneRaw,
      contact_phone: phone,
      message_type: messageType,
      content: content,
      timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString(),
      link_status: linkStatus,
      contact_id: contactMatch ? contactMatch.id : null,
    };

    await base44.asServiceRole.entities.ChatMessage.create(chatMessageData);

    console.log('[WEBHOOK] CREATED ChatMessage with direction=received');
    console.log('[WEBHOOK] external_message_id=' + idMessage);
    console.log('[WEBHOOK] link_status=' + linkStatus + (contactMatch ? ' contact_id=' + contactMatch.id : ''));

    return Response.json({ message: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});