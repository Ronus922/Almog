// Public webhook handler for Green API - processes incoming messages
// Green API calls this when a message is received

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    
    console.log('=== GREEN API WEBHOOK RECEIVED ===');
    console.log('Full payload:', JSON.stringify(payload));
    console.log('Event type:', payload.event);
    
    // Green API sends 'incomingMessageReceived' event
    if (payload.event === 'incomingMessageReceived') {
      const message = payload.data;
      const senderRaw = message.senderData?.sender || '';
      
      // Green API format: "972512345678@c.us" - extract just the phone
      let senderPhone = senderRaw.replace(/[^0-9]/g, '');
      
      // Convert to Israeli format (0501234567)
      if (senderPhone.startsWith('972')) {
        senderPhone = '0' + senderPhone.substring(3);
      }
      
      console.log('Message from:', senderPhone);
      
      const textContent = message.messageData?.textMessageData?.textMessage || '';
      const timestamp = new Date(message.timestamp * 1000).toISOString();
      
      console.log('Message content:', textContent);
      console.log('Timestamp:', timestamp);
      
      // Now get base44 client and save the message
      try {
        const base44 = createClientFromRequest(req);
        
        // Find matching contact
        const contacts = await base44.asServiceRole.entities.Contact.filter({});
        console.log('Total contacts in DB:', contacts.length);
        
        const senderPhoneClean = senderPhone.replace(/[^0-9]/g, '');
        
        const contact = contacts.find(c => {
          const phones = [
            c.owner_phone,
            c.tenant_phone,
            c.phoneOwner,
            c.phoneTenant,
            c.phonePrimary
          ].filter(p => p);
          
          return phones.some(phone => {
            const phoneClean = (phone || '').replace(/[^0-9]/g, '');
            return phoneClean === senderPhoneClean;
          });
        });
        
        if (contact) {
          console.log('✓ Contact found:', contact.id, contact.apartment_number);
          
          const savedMsg = await base44.asServiceRole.entities.ChatMessage.create({
            contact_id: contact.id,
            contact_phone: senderPhone,
            direction: 'received',
            message_type: 'text',
            content: textContent,
            timestamp: timestamp
          });
          console.log('✓ Message saved:', savedMsg.id);
        } else {
          console.log('✗ No contact found for phone:', senderPhone);
        }
      } catch (dbError) {
        console.error('Database error:', dbError.message);
      }
    }
    
    // Always return 200 to prevent retries from Green API
    return Response.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ status: 'ok' }, { status: 200 });
  }
});