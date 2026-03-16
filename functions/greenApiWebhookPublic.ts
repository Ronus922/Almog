import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  console.log('WEBHOOK: Request received');
  
  // Return 200 IMMEDIATELY to acknowledge receipt
  const processingPromise = (async () => {
    try {
      if (req.method !== 'POST') {
        console.log('WEBHOOK: Not a POST request, ignoring');
        return;
      }

      const text = await req.text();
      console.log('WEBHOOK: Raw body:', text);
      
      const payload = JSON.parse(text);
      console.log('WEBHOOK: Parsed payload:', payload);
      
      if (payload.event !== 'incomingMessageReceived') {
        console.log('WEBHOOK: Event is', payload.event, 'ignoring');
        return;
      }

      const message = payload.data;
      const senderRaw = message.senderData?.sender || '';
      console.log('WEBHOOK: Sender raw:', senderRaw);
      
      // Green API format: "972512345678@c.us"
      let senderPhone = senderRaw.replace(/[^0-9]/g, '');
      
      // Convert to Israeli format
      if (senderPhone.startsWith('972')) {
        senderPhone = '0' + senderPhone.substring(3);
      }
      console.log('WEBHOOK: Phone:', senderPhone);
      
      const textContent = message.messageData?.textMessageData?.textMessage || '';
      const timestamp = new Date(message.timestamp * 1000).toISOString();
      
      console.log('WEBHOOK: Message content:', textContent);
      
      // Save to database
      const base44 = createClientFromRequest(req);
      
      const contacts = await base44.asServiceRole.entities.Contact.filter({});
      console.log('WEBHOOK: Found contacts:', contacts.length);
      
      const senderPhoneClean = senderPhone.replace(/[^0-9]/g, '');
      
      const contact = contacts.find(c => {
        const phones = [c.owner_phone, c.tenant_phone, c.phoneOwner, c.phoneTenant, c.phonePrimary].filter(p => p);
        return phones.some(phone => {
          const phoneClean = (phone || '').replace(/[^0-9]/g, '');
          return phoneClean === senderPhoneClean;
        });
      });
      
      if (contact) {
        console.log('WEBHOOK: Found contact:', contact.apartment_number);
        
        await base44.asServiceRole.entities.ChatMessage.create({
          contact_id: contact.id,
          contact_phone: senderPhone,
          direction: 'received',
          message_type: 'text',
          content: textContent,
          timestamp: timestamp
        });
        console.log('WEBHOOK: Message saved');
      } else {
        console.log('WEBHOOK: No contact found for', senderPhone);
      }
    } catch (error) {
      console.error('WEBHOOK ERROR:', error.message);
    }
  })();
  
  // Don't wait for processing - return immediately
  processingPromise.catch(e => console.error('Async processing error:', e));
  
  return Response.json({ status: 200 }, { status: 200 });
});