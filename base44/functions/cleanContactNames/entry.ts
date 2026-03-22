import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function cleanName(name) {
  if (!name) return name;
  // הסרת URL כלשהו (http/https) ומה שאחריו
  return name.replace(/\s*(https?:\/\/\S+)/g, '').trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    const contacts = await base44.asServiceRole.entities.Contact.list();
    let cleaned = 0;

    for (const c of contacts) {
      const updates = {};
      const cleanOwner = cleanName(c.owner_name);
      const cleanTenant = cleanName(c.tenant_name);

      if (cleanOwner !== c.owner_name) updates.owner_name = cleanOwner;
      if (cleanTenant !== c.tenant_name) updates.tenant_name = cleanTenant;

      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.Contact.update(c.id, updates);
        cleaned++;
        console.log(`[cleanContactNames] נוקה: ${c.id} | דירה: ${c.apartment_number}`);
      }
    }

    return Response.json({ success: true, cleaned, total: contacts.length });
  } catch (error) {
    console.error('[cleanContactNames] שגיאה:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});