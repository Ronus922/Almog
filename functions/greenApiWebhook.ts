import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    
    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Event type:', payload.event);
    console.log('Full payload:', JSON.stringify(payload, null, 2));
    
    // Green API sends 'incomingMessageReceived' event
    if (payload.event === 'incomingMessageReceived') {
      const message = payload.data;
      console.log('Message data:', JSON.stringify(message, null, 2));
      
      const senderRaw = message.senderData?.sender || '';
      console.log('Sender raw:', senderRaw);
      
      // Green API format: "972512345678@c.us" - extract just the phone
      let senderPhone = senderRaw.replace(/[^0-9]/g, '');
      console.log('Phone after extraction:', senderPhone);
      
      // Convert to Israeli format (0501234567)
      if (senderPhone.startsWith('972')) {
        senderPhone = '0' + senderPhone.substring(3);
      }
      console.log('Phone in Israeli format:', senderPhone);
      
      // Find matching contact - check all possible phone fields
      const contacts = await base44.entities.Contact.filter({});
      console.log('Total contacts in DB:', contacts.length);
      
      const senderPhoneClean = senderPhone.replace(/[^0-9]/g, '');
      
      const contact = contacts.find(c => {
        const phones = [
          c.owner_phone,
          c.tenant_phone,
          // Also check raw phone formats
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
        const textContent = message.messageData?.textMessageData?.textMessage || '';
        
        const savedMsg = await base44.entities.ChatMessage.create({
          contact_id: contact.id,
          contact_phone: senderPhone,
          direction: 'received',
          message_type: 'text',
          content: textContent,
          timestamp: new Date(message.timestamp * 1000).toISOString()
        });
        console.log('✓ Message saved:', savedMsg.id);
      } else {
        console.log('✗ No contact found for phone:', senderPhone);
        console.log('Available phones in DB:', contacts.map(c => ({
          apt: c.apartment_number,
          owner: (c.owner_phone || '').replace(/[^0-9]/g, ''),
          tenant: (c.tenant_phone || '').replace(/[^0-9]/g, '')
        })));
      }
    } else {
      console.log('Event not recognized, ignoring:', payload.event);
    }
    
    return Response.json({ status: 'ok' });
  } catch (error) {
    console.error('✗ Webhook error:', error.message);
    console.error(error.stack);
    return Response.json({ error: error.message }, { status: 200 });
  }
});