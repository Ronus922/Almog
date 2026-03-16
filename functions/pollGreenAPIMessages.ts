import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Green API - קבלת הודעות נכנסות
 * ReceiveNotification (pull-based) + DeleteNotification אחרי כל עיבוד
 * נשמרות גם הודעות ממספרים שלא מוכרים / שלא יזמנו איתם שיחה
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // קבל פרטי Green API מה-Settings או env
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
    console.log(`[POLL] ✓ Contacts in DB: ${contacts.length}`);

    let processedCount = 0;
    let skippedCount = 0;
    let unknownCount = 0;
    let emptyCount = 0;

    // pull עד 50 הודעות מהתור בכל ריצה
    for (let i = 0; i < 50; i++) {
      console.log(`[POLL] Attempt ${i + 1}/50 - polling receiveNotification...`);
      
      const receiveRes = await fetch(
        `https://api.green-api.com/waInstance${instanceId}/receiveNotification/${token}`,
        { method: 'GET' }
      );

      if (!receiveRes.ok) {
        console.error(`[POLL] ❌ receiveNotification HTTP error: ${receiveRes.status}`);
        // אל תעצור בגלל 400 — המשך לנסות
        if (i === 0) {
          // הפעם הראשונה — אולי זה בעיית אימות, חברה וחצי
          console.error('[POLL] First attempt failed with ' + receiveRes.status + ', stopping this run');
          break;
        }
        // הפעמים הבאות — דלג על הודעה אחת ולא תעצור את כל הלולאה
        continue;
      }

      const notification = await receiveRes.json();

      // אין יותר הודעות בתור
      if (!notification || !notification.body) {
        emptyCount++;
        console.log(`[POLL] Empty response #${emptyCount} (queue likely empty, continuing...)`);
        // אל תעצור! המשך לנסות עד 50
        if (emptyCount >= 3) {
          // אחרי 3 ריקים ברציפות, סביר שאין הודעות
          console.log(`[POLL] 3 empty responses in a row - stopping this batch`);
          break;
        }
        continue;
      }
      
      // reset empty counter כי קיבלנו הודעה
      emptyCount = 0;

      const receiptId = notification.receiptId;
      const body = notification.body;

      console.log(`[POLL] ✓ Notification #${i + 1}: type=${body.typeWebhook}, receiptId=${receiptId}`);

      // טפל רק בהודעות נכנסות
      if (body.typeWebhook === 'incomingMessageReceived') {
        // חלץ מספר שולח
        const senderRaw = body.senderData?.chatId || body.senderData?.sender || '';
        // chatId מגיע כ-972501234567@c.us — נקה ל-05...
        let senderPhone = senderRaw.split('@')[0].replace(/[^0-9]/g, '');
        if (senderPhone.startsWith('972')) {
          senderPhone = '0' + senderPhone.substring(3);
        }

        console.log(`[POLL] 📨 Incoming from: ${senderPhone} (sender=${senderRaw})`);

        // חלץ תוכן ההודעה לפי סוג
        let content = '';
        let message_type = 'text';
        const msgData = body.messageData || {};

        if (msgData.typeMessage === 'textMessage') {
          content = msgData.textMessageData?.textMessage || '';
          console.log(`[POLL] Message type: textMessage, content: "${content.substring(0, 50)}..."`);
        } else if (msgData.typeMessage === 'imageMessage') {
          content = msgData.imageMessageData?.downloadUrl || msgData.imageMessageData?.jpegThumbnail || '';
          message_type = 'image';
          console.log(`[POLL] Message type: imageMessage`);
        } else if (msgData.typeMessage === 'documentMessage') {
          content = msgData.documentMessageData?.downloadUrl || msgData.documentMessageData?.fileName || '';
          message_type = 'document';
          console.log(`[POLL] Message type: documentMessage`);
        } else if (msgData.typeMessage === 'extendedTextMessage') {
          content = msgData.extendedTextMessageData?.text || '';
          console.log(`[POLL] Message type: extendedTextMessage, content: "${content.substring(0, 50)}..."`);
        } else if (msgData.typeMessage === 'audioMessage' || msgData.typeMessage === 'voiceMessage') {
          content = msgData.audioMessageData?.downloadUrl || msgData.fileMessageData?.downloadUrl || '';
          message_type = 'document';
          console.log(`[POLL] Message type: audioMessage/voiceMessage`);
        }

        const timestamp = new Date((body.timestamp || Date.now() / 1000) * 1000).toISOString();
        console.log(`[POLL] Timestamp: ${timestamp}`);

        // חפש איש קשר מתאים לפי טלפון
        const senderPhoneClean = senderPhone.replace(/[^0-9]/g, '');
        const contact = contacts.find(c => {
          const phones = [c.owner_phone, c.tenant_phone].filter(p => p);
          return phones.some(p => p.replace(/[^0-9]/g, '') === senderPhoneClean);
        });

        if (contact) {
          // מספר מוכר — שמור עם contact_id אמיתי
          console.log(`[POLL] 🔗 Found contact: ${contact.apartment_number} - ${contact.owner_name || contact.tenant_name}`);
          await base44.asServiceRole.entities.ChatMessage.create({
            contact_id: contact.id,
            contact_phone: senderPhone,
            sender_chat_id: senderRaw,
            sender_phone_raw: senderRaw.split('@')[0],
            link_status: 'linked',
            direction: 'received',
            message_type,
            content,
            timestamp
          });
          processedCount++;
          console.log(`[POLL] ✅ SAVED AS LINKED - contact_id=${contact.id}`);
        } else {
          // מספר לא מוכר — שמור ללא contact_id (null), עם link_status=unlinked
          // ניתן לשיוך רטרואקטיבי בעתיד לפי sender_chat_id / contact_phone
          console.log(`[POLL] 🔓 Unknown sender - saving as UNLINKED`);
          await base44.asServiceRole.entities.ChatMessage.create({
            contact_phone: senderPhone,
            sender_chat_id: senderRaw,
            sender_phone_raw: senderRaw.split('@')[0],
            link_status: 'unlinked',
            direction: 'received',
            message_type,
            content,
            timestamp
          });
          unknownCount++;
          console.log(`[POLL] ✅ SAVED AS UNLINKED - phone=${senderPhone}, sender_chat_id=${senderRaw}`);
        }
      } else {
        // סוג אחר (statusMessage, outgoingMessage וכו') — דלג
        skippedCount++;
        console.log(`[POLL] Skipped type: ${body.typeWebhook}`);
      }

      // חובה: מחק את ההתראה מהתור לאחר עיבוד (גם אם דילגנו)
      // זה מונע תקיעת ה-FIFO
      console.log(`[POLL] 🗑️ Deleting notification from queue - receiptId=${receiptId}`);
      const deleteRes = await fetch(
        `https://api.green-api.com/waInstance${instanceId}/deleteNotification/${token}/${receiptId}`,
        { method: 'DELETE' }
      );
      if (!deleteRes.ok) {
        console.error(`[POLL] ❌ deleteNotification FAILED: HTTP ${deleteRes.status} for receiptId=${receiptId}`);
      } else {
        console.log(`[POLL] ✅ deleteNotification SUCCESS - queue cleaned`);
      }
    }

    console.log(`[POLL] ✅ POLL COMPLETE - processed=${processedCount}, unlinked=${unknownCount}, skipped=${skippedCount}`);
    return Response.json({ 
      success: true, 
      processedCount, 
      unknownCount, 
      skippedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[POLL] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});