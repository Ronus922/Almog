import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const base44 = createClientFromRequest(req);
    
    console.log('Webhook received:', JSON.stringify(payload).slice(0, 500));
    
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
      
      console.log('Processing message from:', senderPhone);
      
      // Find matching contact
      const contacts = await base44.entities.Contact.filter({});
      const contact = contacts.find(c => {
        const ownerMatch = (c.owner_phone || '').replace(/[^0-9]/g, '') === senderPhone.replace(/[^0-9]/g, '');
        const tenantMatch = (c.tenant_phone || '').replace(/[^0-9]/g, '') === senderPhone.replace(/[^0-9]/g, '');
        return ownerMatch || tenantMatch;
      });
      
      if (contact) {
        console.log('Contact found:', contact.id);
        const textContent = message.messageData?.textMessageData?.textMessage || '';
        
        await base44.entities.ChatMessage.create({
          contact_id: contact.id,
          contact_phone: senderPhone,
          direction: 'received',
          message_type: 'text',
          content: textContent,
          timestamp: new Date(message.timestamp * 1000).toISOString()
        });
        console.log('Message saved');
      } else {
        console.log('No contact found for phone:', senderPhone);
      }
    }
    
    return Response.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 200 });
  }
});