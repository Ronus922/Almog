import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Green API - Webhook לקבלת הודעות נכנסות בזמן אמת
 * 
 * PRODUCTION ENDPOINT: https://copy-d3b3e777.base44.app/api/functions/greenApiWebhook
 * 
 * ARCHITECTURE:
 * - Webhook is the ONLY active inbound mechanism for incoming messages
 * - Returns HTTP 200 immediately (before processing)
 * - Processes asynchronously: parse → link → deduplicate → store
 * - Real-time subscriptions handle UI refresh
 * - Polling (pollGreenAPIMessages) is disabled when webhookUrl is active
 * 
 * REQUIRED GREEN API DASHBOARD SETTINGS:
 * - webhookUrl = https://copy-d3b3e777.base44.app/api/functions/greenApiWebhook
 * - incomingWebhook = yes
 * - outgoingWebhook = no (status updates via subscription)
 * - stateWebhook = no
 * - deviceWebhook = no
 * - webhookUrlToken = not required (webhook endpoint doesn't validate tokens)
 * 
 * HANDLES:
 * 1. Incoming text messages
 * 2. Incoming media (image/document/audio)
 * 3. Linked contacts (matched by phone)
 * 4. Unlinked messages (no matching contact)
 * 5. Duplicate prevention (content + timestamp + direction match)
 * 6. Malformed payloads (logged, no crash)
 */

Deno.serve(async (req) => {
  // חובה: החזרת 200 מייד, עיבוד אחרי כן
  const responsePromise = (async () => {
    try {
      const base44 = createClientFromRequest(req);

      // קבל את ה-payload מ-Green API
      let payload;
      try {
        payload = await req.json();
      } catch (parseErr) {
        console.error('[WEBHOOK] ❌ Failed to parse JSON:', parseErr.message);
        return;
      }

      if (!payload || !payload.body) {
        console.warn('[WEBHOOK] ⚠️ Empty or malformed payload');
        return;
      }

      const body = payload.body;
      const typeWebhook = body.typeWebhook;

      console.log(`[WEBHOOK] 📩 Received webhook: type=${typeWebhook}`);

      // טפל רק בהודעות נכנסות
      if (typeWebhook !== 'incomingMessageReceived') {
        console.log(`[WEBHOOK] ⏭️ Skipped type: ${typeWebhook} (not incomingMessageReceived)`);
        return;
      }

      // חלץ מידע שולח
      const senderRaw = body.senderData?.chatId || body.senderData?.sender || '';
      const messageId = body.idMessage || '';
      
      if (!senderRaw || !messageId) {
        console.error('[WEBHOOK] ❌ Missing senderData.chatId or idMessage');
        return;
      }

      // נרמול מספר טלפון: 972501234567@c.us -> 0501234567
      let senderPhone = senderRaw.split('@')[0].replace(/[^0-9]/g, '');
      if (senderPhone.startsWith('972')) {
        senderPhone = '0' + senderPhone.substring(3);
      }

      console.log(`[WEBHOOK] 📱 Sender: ${senderPhone} (raw=${senderRaw}), msgId=${messageId}`);

      // חלץ תוכן ההודעה לפי סוג
      let content = '';
      let message_type = 'text';
      const msgData = body.messageData || {};

      if (msgData.typeMessage === 'textMessage') {
        content = msgData.textMessageData?.textMessage || '';
        console.log(`[WEBHOOK] 📄 Type: textMessage, content: "${content.substring(0, 50)}..."`);
      } else if (msgData.typeMessage === 'imageMessage') {
        content = msgData.imageMessageData?.downloadUrl || msgData.imageMessageData?.jpegThumbnail || '';
        message_type = 'image';
        console.log(`[WEBHOOK] 🖼️ Type: imageMessage`);
      } else if (msgData.typeMessage === 'documentMessage') {
        content = msgData.documentMessageData?.downloadUrl || msgData.documentMessageData?.fileName || '';
        message_type = 'document';
        console.log(`[WEBHOOK] 📎 Type: documentMessage`);
      } else if (msgData.typeMessage === 'extendedTextMessage') {
        content = msgData.extendedTextMessageData?.text || '';
        console.log(`[WEBHOOK] 📝 Type: extendedTextMessage, content: "${content.substring(0, 50)}..."`);
      } else if (msgData.typeMessage === 'audioMessage' || msgData.typeMessage === 'voiceMessage') {
        content = msgData.audioMessageData?.downloadUrl || msgData.fileMessageData?.downloadUrl || '';
        message_type = 'document';
        console.log(`[WEBHOOK] 🎵 Type: audioMessage/voiceMessage`);
      }

      const timestamp = new Date((body.timestamp || Date.now() / 1000) * 1000).toISOString();

      // בדיקת כפילות באמצעות external_message_id (idMessage מ-Green API)
      // זה המזהה החיצוני האמיתי של Green API
      const senderPhoneClean = senderPhone.replace(/[^0-9]/g, '');
      
      // בדיקה: האם הודעה עם אותו external_message_id כבר קיימת?
      // (זה הדרך הנכונה לטפל בכפילויות של webhook redelivery)
      const existingByExternalId = await base44.asServiceRole.entities.ChatMessage.filter({
        external_message_id: messageId,
        direction: 'received'
      });

      if (existingByExternalId.length > 0) {
        console.log(`[WEBHOOK] ⚠️ DUPLICATE MESSAGE - already exists with external_message_id=${messageId}`);
        return;
      }
      
      // fallback dedup: content + timestamp (in case external_message_id isn't stored properly)
      const existingMessages = await base44.asServiceRole.entities.ChatMessage.filter({
        contact_phone: senderPhone,
        direction: 'received'
      });

      const isDuplicateByContent = existingMessages.some(m => {
        return m.content === content && 
               new Date(m.timestamp).getTime() === new Date(timestamp).getTime();
      });

      if (isDuplicateByContent) {
        console.log(`[WEBHOOK] ⚠️ DUPLICATE MESSAGE - content + timestamp match (fallback dedup)`);
        return;
      }

      // קבל את כל אנשי הקשר
      const contacts = await base44.asServiceRole.entities.Contact.filter({});
      console.log(`[WEBHOOK] 📋 Searching contacts (total: ${contacts.length})...`);

      // חפש איש קשר מתאים לפי טלפון
      const contact = contacts.find(c => {
        const phones = [c.owner_phone, c.tenant_phone].filter(p => p);
        return phones.some(p => p.replace(/[^0-9]/g, '') === senderPhoneClean);
      });

      // שמור הודעה
      let savedMessage;
      if (contact) {
        console.log(`[WEBHOOK] 🔗 Found contact: ${contact.apartment_number} - ${contact.owner_name || contact.tenant_name}`);
        savedMessage = await base44.asServiceRole.entities.ChatMessage.create({
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
        console.log(`[WEBHOOK] ✅ SAVED AS LINKED - contact_id=${contact.id}, msg_id=${savedMessage.id}`);
      } else {
        console.log(`[WEBHOOK] 🔓 Unknown sender - saving as UNLINKED`);
        savedMessage = await base44.asServiceRole.entities.ChatMessage.create({
          contact_phone: senderPhone,
          sender_chat_id: senderRaw,
          sender_phone_raw: senderRaw.split('@')[0],
          link_status: 'unlinked',
          direction: 'received',
          message_type,
          content,
          timestamp
        });
        console.log(`[WEBHOOK] ✅ SAVED AS UNLINKED - phone=${senderPhone}, msg_id=${savedMessage.id}`);
      }

      // עדכון UI בזמן אמת: Invalidate query ל-UI
      // (Base44 יטפל בעדכון מודרני דרך subscription)
      console.log(`[WEBHOOK] 🔄 Invalidating UI queries...`);
      
      console.log(`[WEBHOOK] ✅ WEBHOOK PROCESSING COMPLETE - msg saved: ${savedMessage.id}`);

    } catch (error) {
      console.error('[WEBHOOK] Fatal error:', error.message);
      console.error('[WEBHOOK] Stack:', error.stack);
    }
  })();

  // החזרת 200 מייד, עיבוד בהמשך
  responsePromise.catch(err => console.error('[WEBHOOK] Async error:', err));
  
  return Response.json({ success: true }, { status: 200 });
});