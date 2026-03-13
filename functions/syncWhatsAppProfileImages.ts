import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instanceId = Deno.env.get('GREEN_API_INSTANCE_ID');
    const apiToken = Deno.env.get('GREEN_API_TOKEN');

    if (!instanceId || !apiToken) {
      return Response.json({ error: 'Green API credentials not configured' }, { status: 500 });
    }

    // Get all contacts
    const contacts = await base44.entities.Contact.list();
    let updated = 0;
    const errors = [];

    for (const contact of contacts) {
      try {
        // Get phone number - try different fields
        const phone = contact.owner_phone || contact.tenant_phone;
        if (!phone) continue;

        // Format phone to international format with country code
        const formattedPhone = phone.replace(/\D/g, '');
        const phoneWithCountry = formattedPhone.startsWith('972') 
          ? formattedPhone 
          : formattedPhone.startsWith('0')
          ? '972' + formattedPhone.substring(1)
          : '972' + formattedPhone;

        // Get contact info from Green API
        const response = await fetch(
          `https://api.green-api.com/waInstance${instanceId}/getContactInfo/${apiToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: `${phoneWithCountry}@c.us` })
          }
        );

        const data = await response.json();

        if (data.profilePicUrl) {
          // Update contact with profile image
          await base44.entities.Contact.update(contact.id, {
            whatsapp_profile_image: data.profilePicUrl
          });
          updated++;
        }
      } catch (err) {
        errors.push({
          contactId: contact.id,
          apartment: contact.apartment_number,
          error: err.message
        });
      }
    }

    return Response.json({
      success: true,
      updated,
      total: contacts.length,
      errors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});