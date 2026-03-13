import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Extract message from Green API webhook
    const { from, body, timestamp, id } = payload;
    
    if (!from || !body) {
      return Response.json({ message: "Invalid payload" }, { status: 400 });
    }

    // Find contact by phone number - normalize to match stored format
    let phone = from.replace('@c.us', '');
    // Try to normalize: remove leading 972 and add 0
    let normalizedPhone = phone;
    if (phone.startsWith('972')) {
      normalizedPhone = '0' + phone.slice(3);
    }
    
    const contacts = await base44.asServiceRole.entities.Contact.filter({
      "$or": [
        { "owner_phone": phone },
        { "owner_phone": normalizedPhone },
        { "tenant_phone": phone },
        { "tenant_phone": normalizedPhone }
      ]
    });

    if (contacts && contacts.length > 0) {
      // Save message to ChatMessage entity
      await base44.asServiceRole.entities.ChatMessage.create({
        contact_id: contacts[0].id,
        contact_phone: phone,
        direction: 'received',
        message_type: 'text',
        content: body,
        timestamp: new Date(timestamp * 1000).toISOString()
      });
      console.log(`Message saved from ${phone} to contact ${contacts[0].id}`);
    } else {
      console.warn(`No contact found for phone: ${phone} or ${normalizedPhone}`);
    }

    return Response.json({ message: "OK" }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});