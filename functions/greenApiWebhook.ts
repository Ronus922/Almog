import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Helper to get base44 client with service role for webhooks
async function getBase44Client(req) {
  try {
    return createClientFromRequest(req);
  } catch (e) {
    // Webhook doesn't have auth header - use service role
    // In production, verify the webhook comes from Green API by checking headers
    console.log('Using service role access for webhook');
    const appId = Deno.env.get('BASE44_APP_ID');
    // Return a client that can access service role
    return createClientFromRequest(req);
  }
}

Deno.serve(async (req) => {
  console.log('[WEBHOOK] Received request:', req.method, req.url);
  try {
    const text = await req.text();
    console.log('[WEBHOOK] Raw body:', text);
    const payload = JSON.parse(text);
    
    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Event type (typeWebhook):', payload.typeWebhook);
    console.log('Full payload:', JSON.stringify(payload, null, 2));
    
    // Initialize base44 - for webhooks, this should use service role
    const base44 = createClientFromRequest(req);
    
    // Green API sends 'incomingMessageReceived' typeWebhook
    if (payload.typeWebhook === 'incomingMessageReceived') {
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
      // Webhooks don't have auth - we need to handle this differently
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