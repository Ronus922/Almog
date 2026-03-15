import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Green API - קבלת הודעות נכנסות
 * משתמש ב-receiveNotification (pull-based) של Green API
 * קורא הודעות אחת-אחת ומוחק אותן מהתור לאחר עיבוד
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // קבל פרטי Green API
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

    // קבל את כל אנשי הקשר פעם אחת
    const contacts = await base44.asServiceRole.entities.Contact.filter({});
    console.log(`[POLL] Contacts in DB: ${contacts.length}`);

    let processedCount = 0;
    let skippedCount = 0;

    // Green API receiveNotification - pull הודעות מהתור (עד 20 בכל ריצה)
    for (let i = 0; i < 20; i++) {
      const receiveRes = await fetch(
        `https://api.green-api.com/waInstance${instanceId}/receiveNotification/${token}`,
        { method: 'GET' }
      );

      if (!receiveRes.ok) {
        console.error(`[POLL] receiveNotification error: ${receiveRes.status}`);
        break;
      }

      const notification = await receiveRes.json();

      // אם אין הודעות בתור - עצור
      if (!notification || !notification.body) {
        console.log(`[POLL] No more notifications in queue after ${i} items`);
        break;
      }

      const receiptId = notification.receiptId;
      const body = notification.body;

      console.log(`[POLL] Notification type: ${body.typeWebhook}, receiptId: ${receiptId}`);

      // רק הודעות נכנסות
      if (body.typeWebhook === 'incomingMessageReceived') {
        const senderRaw = body.senderData?.sender || '';
        let senderPhone = senderRaw.replace(/[^0-9]/g, '');
        if (senderPhone.startsWith('972')) {
          senderPhone = '0' + senderPhone.substring(3);
        }

        console.log(`[POLL] Incoming message from: ${senderPhone}`);

        // חפש איש קשר מתאים
        const senderPhoneClean = senderPhone.replace(/[^0-9]/g, '');
        const contact = contacts.find(c => {
          const phones = [c.owner_phone, c.tenant_phone].filter(p => p);
          return phones.some(p => p.replace(/[^0-9]/g, '') === senderPhoneClean);
        });

        if (contact) {
          console.log(`[POLL] Contact found: apartment ${contact.apartment_number}`);

          // חלץ תוכן ההודעה לפי סוג
          let content = '';
          let message_type = 'text';
          const msgData = body.messageData || {};

          if (msgData.typeMessage === 'textMessage') {
            content = msgData.textMessageData?.textMessage || '';
          } else if (msgData.typeMessage === 'imageMessage') {
            content = msgData.imageMessageData?.downloadUrl || msgData.imageMessageData?.jpegThumbnail || '';
            message_type = 'image';
          } else if (msgData.typeMessage === 'documentMessage') {
            content = msgData.documentMessageData?.downloadUrl || msgData.documentMessageData?.fileName || '';
            message_type = 'document';
          } else if (msgData.typeMessage === 'extendedTextMessage') {
            content = msgData.extendedTextMessageData?.text || '';
          }

          const timestamp = new Date((body.timestamp || Date.now() / 1000) * 1000).toISOString();

          await base44.asServiceRole.entities.ChatMessage.create({
            contact_id: contact.id,
            contact_phone: senderPhone,
            direction: 'received',
            message_type,
            content,
            timestamp
          });

          processedCount++;
          console.log(`[POLL] ✓ Message saved for apartment ${contact.apartment_number}`);
        } else {
          console.log(`[POLL] No contact found for phone: ${senderPhone}`);
          skippedCount++;
        }
      } else {
        skippedCount++;
      }

      // מחק את ההתראה מהתור לאחר עיבוד
      await fetch(
        `https://api.green-api.com/waInstance${instanceId}/deleteNotification/${token}/${receiptId}`,
        { method: 'DELETE' }
      );
    }

    console.log(`[POLL] Done. processed=${processedCount}, skipped=${skippedCount}`);
    return Response.json({ success: true, processedCount, skippedCount });

  } catch (error) {
    console.error('[POLL] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});