import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    console.log('[POLLING] ▶️ START');

    const greenApiInstanceId = Deno.env.get('GREEN_API_INSTANCE_ID');
    const greenApiToken = Deno.env.get('GREEN_API_TOKEN');

    if (!greenApiInstanceId || !greenApiToken) {
      return Response.json({ error: 'Missing credentials' }, { status: 500 });
    }

    const greenApiUrl = `https://api.green-api.com/waInstance${greenApiInstanceId}/ReceiveNotification/${greenApiToken}`;
    const response = await fetch(greenApiUrl);

    if (!response.ok) {
      return Response.json({ status: 'green_api_error', statusCode: response.status });
    }

    const data = await response.json();
    if (!data?.receiveNotification) {
      return Response.json({ status: 'no_messages', processed: 0 });
    }

    const notification = data.receiveNotification;
    const body = notification.body || {};
    const typeWebhook = body.typeWebhook;

    if (typeWebhook !== 'incomingMessageReceived') {
      console.log(`[POLLING] ⏭️ Skipped type: ${typeWebhook}`);
      // Delete from queue and exit
      try {
        await fetch(`https://api.green-api.com/waInstance${greenApiInstanceId}/DeleteNotification/${greenApiToken}/${notification.receiptId}`, { method: 'DELETE' });
      } catch (_) {}
      return Response.json({ status: 'skipped', processed: 0 });
    }

    const senderRaw = body.senderData?.chatId || body.senderData?.sender || '';
    const messageId = body.idMessage || '';

    if (!senderRaw || !messageId) {
      return Response.json({ status: 'missing_fields', processed: 0 });
    }

    // Normalize phone
    let senderPhone = senderRaw.split('@')[0].replace(/[^0-9]/g, '');
    if (senderPhone.startsWith('972')) senderPhone = '0' + senderPhone.substring(3);

    // Dedup by external_message_id
    const existingByExternalId = await base44.asServiceRole.entities.ChatMessage.filter({
      external_message_id: messageId,
      direction: 'received'
    });
    if (existingByExternalId.length > 0) {
      console.log(`[POLLING] ⚠️ DUPLICATE - ${messageId}`);
      // Still delete from queue
      try {
        await fetch(`https://api.green-api.com/waInstance${greenApiInstanceId}/DeleteNotification/${greenApiToken}/${notification.receiptId}`, { method: 'DELETE' });
      } catch (_) {}
      return Response.json({ status: 'duplicate', processed: 0 });
    }

    // Parse content
    let content = '';
    let message_type = 'text';
    const msgData = body.messageData || {};

    if (msgData.typeMessage === 'textMessage') {
      content = msgData.textMessageData?.textMessage || '';
    } else if (msgData.typeMessage === 'imageMessage') {
      content = msgData.imageMessageData?.downloadUrl || '';
      message_type = 'image';
    } else if (msgData.typeMessage === 'documentMessage') {
      content = msgData.documentMessageData?.downloadUrl || '';
      message_type = 'document';
    } else if (msgData.typeMessage === 'extendedTextMessage') {
      content = msgData.extendedTextMessageData?.text || '';
    } else if (msgData.typeMessage === 'audioMessage' || msgData.typeMessage === 'voiceMessage') {
      content = msgData.audioMessageData?.downloadUrl || '';
      message_type = 'document';
    }

    const timestamp = new Date((body.timestamp || Date.now() / 1000) * 1000).toISOString();

    // Find contact
    const contacts = await base44.asServiceRole.entities.Contact.filter({});
    const senderPhoneClean = senderPhone.replace(/[^0-9]/g, '');
    const contact = contacts.find(c => {
      const phones = [c.owner_phone, c.tenant_phone].filter(p => p);
      return phones.some(p => p.replace(/[^0-9]/g, '') === senderPhoneClean);
    });

    const isLinked = !!contact;

    let createdMessage;
    if (isLinked) {
      createdMessage = await base44.asServiceRole.entities.ChatMessage.create({
        contact_id: contact.id,
        contact_phone: senderPhone,
        sender_chat_id: senderRaw,
        sender_phone_raw: senderRaw.split('@')[0],
        external_message_id: messageId,
        link_status: 'linked',
        direction: 'received',
        message_type,
        content,
        timestamp
      });
    } else {
      createdMessage = await base44.asServiceRole.entities.ChatMessage.create({
        contact_phone: senderPhone,
        sender_chat_id: senderRaw,
        sender_phone_raw: senderRaw.split('@')[0],
        external_message_id: messageId,
        link_status: 'unlinked',
        direction: 'received',
        message_type,
        content,
        timestamp
      });
    }

    // Notification לאדמינים (dedupe לפי messageId)
    const notifDedupeBase = `whatsapp_msg:${messageId}`;
    const existingNotif = await base44.asServiceRole.entities.Notification.filter({ dedupe_key: notifDedupeBase });
    if (!existingNotif || existingNotif.length === 0) {
      const allUsers = await base44.asServiceRole.entities.AppUser.list();
      const admins = allUsers.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');

      const type = isLinked ? 'whatsapp_message_received' : 'whatsapp_message_received_unlinked';
      const title = isLinked ? 'התקבלה הודעת וואטצאפ חדשה' : 'התקבלה הודעת וואטצאפ ממספר לא משויך';
      const msgText = isLinked
        ? `הודעה חדשה מדירה ${contact?.apartment_number || senderPhone}: "${content.slice(0, 60)}"`
        : `הודעה ממספר לא מזוהה: ${senderPhone}`;

      for (const admin of admins) {
        if (!admin.username) continue;
        await base44.asServiceRole.entities.Notification.create({
          user_username: admin.username,
          type,
          title,
          message: msgText,
          source_module: 'whatsapp',
          source_entity_type: 'ChatMessage',
          source_entity_id: createdMessage.id,
          action_url: '/WhatsAppChat',
          priority: isLinked ? 'normal' : 'high',
          dedupe_key: `${notifDedupeBase}:${admin.username}`,
          is_read: false,
        });
      }
    }

    // Delete from Green API queue
    try {
      await fetch(`https://api.green-api.com/waInstance${greenApiInstanceId}/DeleteNotification/${greenApiToken}/${notification.receiptId}`, { method: 'DELETE' });
      console.log(`[POLLING] ✓ Deleted from queue`);
    } catch (deleteErr) {
      console.warn('[POLLING] ⚠️ Failed to delete from queue:', deleteErr.message);
    }

    console.log(`[POLLING] ✅ Processed: ${messageId}`);
    return Response.json({ status: 'success', processed: 1 });

  } catch (error) {
    console.error('[POLLING] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});