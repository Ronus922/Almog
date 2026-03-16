import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Polling Fallback — Green API Webhook Delivery Failed
 * 
 * Status: ACTIVE PERMANENT SOLUTION
 * Reason: Green API instance cannot deliver webhooks (service limitation)
 * 
 * Fetches incoming messages every 10-30 seconds via Green API REST API
 * Stores messages directly to ChatMessage entity
 * Runs as scheduled automation
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    console.log('[POLLING] ▶️▶️▶️ START: Fetching incoming messages from Green API');

    const greenApiInstanceId = Deno.env.get('GREEN_API_INSTANCE_ID');
    const greenApiToken = Deno.env.get('GREEN_API_TOKEN');

    if (!greenApiInstanceId || !greenApiToken) {
      console.error('[POLLING] ❌ Missing Green API credentials');
      return Response.json({ error: 'Missing credentials' }, { status: 500 });
    }

    // Green API REST endpoint: Get incoming messages
    const greenApiUrl = `https://api.green-api.com/waInstance${greenApiInstanceId}/ReceiveNotification/${greenApiToken}`;

    console.log(`[POLLING] ✓ Fetching from: ${greenApiUrl}`);
    let notifications = [];
    try {
      const response = await fetch(greenApiUrl);
      if (response.ok) {
        const data = await response.json();
        if (data?.receiveNotification) {
          notifications = [data.receiveNotification];
          console.log(`[POLLING] ✓ Received ${notifications.length} notification(s)`);
        } else {
          console.log('[POLLING] ✓ No new notifications');
          return Response.json({ status: 'no_messages', processed: 0 }, { status: 200 });
        }
      } else {
        console.warn(`[POLLING] ⚠️ Green API returned ${response.status}`);
        return Response.json({ status: 'green_api_error', statusCode: response.status }, { status: 200 });
      }
    } catch (fetchErr) {
      console.error('[POLLING] ❌ Fetch failed:', fetchErr.message);
      return Response.json({ error: fetchErr.message }, { status: 500 });
    }

    let processedCount = 0;

    for (const notification of notifications) {
      try {
        const body = notification.body || {};
        const typeWebhook = body.typeWebhook;

        if (typeWebhook !== 'incomingMessageReceived') {
          console.log(`[POLLING] ⏭️ Skipped type: ${typeWebhook}`);
          continue;
        }

        // Parse sender
        const senderRaw = body.senderData?.chatId || body.senderData?.sender || '';
        const messageId = body.idMessage || '';

        if (!senderRaw || !messageId) {
          console.warn('[POLLING] ⚠️ Missing sender or messageId');
          continue;
        }

        // Normalize phone
        let senderPhone = senderRaw.split('@')[0].replace(/[^0-9]/g, '');
        if (senderPhone.startsWith('972')) {
          senderPhone = '0' + senderPhone.substring(3);
        }

        console.log(`[POLLING] 📱 Processing: ${senderPhone}, msgId=${messageId}`);

        // Parse message content
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

        // Dedup: check for existing message by external_message_id
        const existingByExternalId = await base44.asServiceRole.entities.ChatMessage.filter({
          external_message_id: messageId,
          direction: 'received'
        });

        if (existingByExternalId.length > 0) {
          console.log(`[POLLING] ⚠️ DUPLICATE - msgId=${messageId} already exists`);
          continue;
        }

        // Find contact by phone
        const contacts = await base44.asServiceRole.entities.Contact.filter({});
        const senderPhoneClean = senderPhone.replace(/[^0-9]/g, '');
        const contact = contacts.find(c => {
          const phones = [c.owner_phone, c.tenant_phone].filter(p => p);
          return phones.some(p => p.replace(/[^0-9]/g, '') === senderPhoneClean);
        });

        // Save message
        if (contact) {
          console.log(`[POLLING] 🔗 Found contact: ${contact.apartment_number}`);
          await base44.asServiceRole.entities.ChatMessage.create({
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
          console.log(`[POLLING] ✅ SAVED AS LINKED - contact_id=${contact.id}`);
        } else {
          console.log(`[POLLING] 🔓 Unknown sender - saving as UNLINKED`);
          await base44.asServiceRole.entities.ChatMessage.create({
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
          console.log(`[POLLING] ✅ SAVED AS UNLINKED`);
        }

        processedCount++;

        // Delete the processed notification from Green API queue
        try {
          const deleteUrl = `https://api.green-api.com/waInstance${greenApiInstanceId}/DeleteNotification/${greenApiToken}/${notification.receiptId}`;
          await fetch(deleteUrl, { method: 'DELETE' });
          console.log(`[POLLING] ✓ Notification ${notification.receiptId} deleted from queue`);
        } catch (deleteErr) {
          console.warn('[POLLING] ⚠️ Failed to delete notification:', deleteErr.message);
        }

      } catch (processErr) {
        console.error('[POLLING] ❌ Process error:', processErr.message);
      }
    }

    console.log(`[POLLING] ▶️▶️▶️ COMPLETE: Processed ${processedCount} message(s)`);
    return Response.json({ status: 'success', processed: processedCount }, { status: 200 });

  } catch (error) {
    console.error('[POLLING] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});