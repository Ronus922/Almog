import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const instanceId = Deno.env.get('GREEN_API_INSTANCE_ID');
    const apiToken = Deno.env.get('GREEN_API_TOKEN');

    if (!instanceId || !apiToken) {
      return Response.json({ error: 'Green API credentials not configured' }, { status: 500 });
    }

    const contacts = await base44.entities.Contact.list();
    let updated = 0;
    let noAvatar = 0;
    const errors = [];

    for (const contact of contacts) {
      try {
        const phone = contact.owner_phone || contact.tenant_phone;
        if (!phone) continue;

        // נרמול מספר טלפון
        const digits = phone.replace(/\D/g, '');
        const chatId = digits.startsWith('972')
          ? digits + '@c.us'
          : digits.startsWith('0')
          ? '972' + digits.substring(1) + '@c.us'
          : '972' + digits + '@c.us';

        // קריאה ל-GetAvatar API
        const response = await fetch(
          `https://api.green-api.com/waInstance${instanceId}/getAvatar/${apiToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId })
          }
        );

        if (!response.ok) {
          errors.push({ contactId: contact.id, apartment: contact.apartment_number, error: `HTTP ${response.status}` });
          continue;
        }

        let data;
        try { data = await response.json(); } catch { continue; }

        const now = new Date().toISOString();

        if (data && data.available === true && data.urlAvatar) {
          await base44.entities.Contact.update(contact.id, {
            whatsapp_profile_image_url: data.urlAvatar,
            whatsapp_profile_sync_status: 'synced',
            whatsapp_profile_last_synced_at: now,
            whatsapp_profile_sync_error: null
          });
          updated++;
        } else {
          await base44.entities.Contact.update(contact.id, {
            whatsapp_profile_sync_status: 'no_avatar',
            whatsapp_profile_last_synced_at: now,
            whatsapp_profile_sync_error: null
          });
          noAvatar++;
        }

        // עיכוב קצר למניעת rate-limiting
        await new Promise(r => setTimeout(r, 200));

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
      noAvatar,
      total: contacts.length,
      errors
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});