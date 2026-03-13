import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    // Parse incoming webhook
    const payload = await req.json();
    
    const base44 = createClientFromRequest(req);
    
    // Green API sends different event types
    // We're interested in 'IncomingMessageReceived' for new incoming messages
    if (payload.event === 'incomingMessageReceived') {
      const message = payload.data;
      
      // Normalize phone number (remove country code)
      let senderPhone = message.senderData?.sender?.replace(/\D/g, '');
      if (senderPhone?.startsWith('972')) {
        senderPhone = '0' + senderPhone.substring(3);
      }
      
      // Find contact by phone
      const contacts = await base44.entities.Contact.filter({});
      const contact = contacts.find(c => 
        c.tenant_phone?.replace(/\D/g, '') === senderPhone?.replace(/\D/g, '') ||
        c.owner_phone?.replace(/\D/g, '') === senderPhone?.replace(/\D/g, '')
      );
      
      if (contact) {
        // Save the message
        await base44.entities.ChatMessage.create({
          contact_id: contact.id,
          contact_phone: senderPhone,
          direction: 'received',
          message_type: message.messageData?.typeMessage === 'textMessage' ? 'text' : 'document',
          content: message.messageData?.textMessageData?.textMessage || message.messageData?.documentMessage?.caption || '',
          timestamp: new Date(message.timestamp * 1000).toISOString()
        });
      }
    }
    
    // Always return 200 OK to Green API
    return Response.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});