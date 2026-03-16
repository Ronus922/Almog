import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Green API - קבלת הודעות נכנסות
 * MODE: DISABLED WHEN WEBHOOK IS ACTIVE
 * 
 * IMPORTANT: When webhookUrl is configured in Green API dashboard:
 * - ReceiveNotification/DeleteNotification CANNOT work in parallel
 * - This polling function must NOT run as active fallback
 * 
 * STATUS: CODE KEPT FOR MANUAL DEBUG/RECOVERY ONLY
 * Primary inbound mechanism is greenApiWebhook (webhook).
 * This function may be called manually via dashboard if needed.
 * 
 * DO NOT automatically schedule or invoke this while webhookUrl is active.
 */
/**
 * DISABLED - Polling is not active when webhookUrl is configured in Green API Dashboard.
 * 
 * STATUS: MANUAL/DEBUG ONLY
 * This function may be called manually via dashboard if webhook delivery fails.
 * It must NOT run automatically while webhook is active (causes conflicts).
 * 
 * To use: Manually invoke via dashboard. Do NOT schedule or automate.
 */

Deno.serve(async (req) => {
  return Response.json({ 
    error: 'Polling disabled - webhook is the active inbound mechanism',
    status: 'disabled',
    note: 'Use greenApiWebhook endpoint instead'
  }, { status: 403 });
  
  // Original code below - kept for manual debug recovery only
  /*
  try {
    const base44 = createClientFromRequest(req);

    // קבל פרטי Green API: ראשית מ-Settings, אחרי כן fallback ל-env
    let instanceId = null;
    let token = null;
    let credentialsSource = 'unknown';

    // 1. קרא מ-Settings entity (מקור האמת הראשי)
    try {
      const settingsList = await base44.asServiceRole.entities.Settings.list();
      if (settingsList.length > 0) {
        const s = settingsList[0];
        if (s.greenApiInstanceId && s.greenApiToken) {
          instanceId = s.greenApiInstanceId;
          token = s.greenApiToken;
          credentialsSource = 'Settings Entity';
        }
      }
    } catch (err) {
      console.warn('[POLL] ⚠️ Failed to fetch from Settings entity:', err.message);
    }

    // 2. Fallback ל-env variables אם חסר מ-Settings
    if (!instanceId) {
      const envInstanceId = Deno.env.get('GREEN_API_INSTANCE_ID');
      if (envInstanceId) {
        instanceId = envInstanceId;
        credentialsSource = 'Environment Variable (GREEN_API_INSTANCE_ID)';
      }
    }
    if (!token) {
      const envToken = Deno.env.get('GREEN_API_TOKEN');
      if (envToken) {
        token = envToken;
        if (credentialsSource === 'Environment Variable (GREEN_API_INSTANCE_ID)') {
          credentialsSource = 'Environment Variables (both)';
        } else {
          credentialsSource = 'Environment Variable (GREEN_API_TOKEN)';
        }
      }
    }

    // 3. אם עדיין חסר - שגיאה ברורה
    if (!instanceId || !token) {
      const missingFields = [];
      if (!instanceId) missingFields.push('GREEN_API_INSTANCE_ID / Settings.greenApiInstanceId');
      if (!token) missingFields.push('GREEN_API_TOKEN / Settings.greenApiToken');
      
      const errorMsg = `Missing Green API credentials: ${missingFields.join(', ')}`;
      console.error(`[POLL] ❌ ${errorMsg}`);
      return Response.json({ error: errorMsg }, { status: 500 });
    }

    console.log(`[POLL] ✓ Green API Credentials loaded from: ${credentialsSource}`);
    console.log(`  - Instance ID: ${instanceId}`);
    console.log(`  - Token length: ${token.length} chars`);
    console.log(`  - First 8 chars of token: ${token.substring(0, 8)}...`);
    console.warn(`[POLL] ⚠️ WARNING: This is a MANUAL/DEBUG function. When webhookUrl is configured in Green API dashboard, polling MUST NOT run automatically.`);
    console.warn(`[POLL] ⚠️ Primary inbound is: greenApiWebhook endpoint (https://copy-d3b3e777.base44.app/api/functions/greenApiWebhook)`);

    // קבל את כל אנשי הקשר פעם אחת
    const contacts = await base44.asServiceRole.entities.Contact.filter({});
    console.log(`[POLL] ✓ Contacts in DB: ${contacts.length}`);

    let processedCount = 0;
    let skippedCount = 0;
    let unknownCount = 0;
    let emptyCount = 0;

    // pull עד 50 הודעות מהתור בכל ריצה
    // NOTE: This only works if webhookUrl is NOT set in Green API dashboard
    for (let i = 0; i < 50; i++) {
      console.log(`[POLL] Attempt ${i + 1}/50 - polling receiveNotification...`);
      
      const url = `https://api.green-api.com/waInstance${instanceId}/receiveNotification/${token}`;
      console.log(`[POLL] URL: ${url.substring(0, 80)}...`);
      
      const receiveRes = await fetch(url, { method: 'GET' });

      if (!receiveRes.ok) {
        const errorBody = await receiveRes.text();
        console.error(`[POLL] ❌ receiveNotification HTTP error: ${receiveRes.status}`);
        console.error(`[POLL] Response body: ${errorBody}`);
        console.error(`[POLL] Headers: ${JSON.stringify(Object.fromEntries(receiveRes.headers))}`);
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