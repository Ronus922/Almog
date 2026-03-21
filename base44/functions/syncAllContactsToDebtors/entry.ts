import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function normalizeApartmentNumber(apt) {
  if (!apt) return '';
  let normalized = String(apt).trim();
  if (normalized.endsWith('.0')) normalized = normalized.slice(0, -2);
  normalized = normalized.replace(/\D/g, '');
  return normalized.replace(/^0+/, '') || '0';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin' && user?.isBase44Admin !== true) {
      return Response.json({ error: 'הרשאה מוגבלת' }, { status: 403 });
    }

    console.log('[syncAllContactsToDebtors] התחלת סנכרון גלובלי');

    // טעינת כל הרשומות
    const allContacts = await base44.asServiceRole.entities.Contact.list();
    const allDebtors = await base44.asServiceRole.entities.DebtorRecord.list();

    // בניית מפה מ-Contact לפי דירה
    const contactMap = {};
    for (const contact of allContacts) {
      const key = normalizeApartmentNumber(contact.apartment_number);
      if (key) {
        contactMap[key] = contact;
      }
    }

    console.log(`[syncAllContactsToDebtors] טעונים: ${allContacts.length} Contact, ${allDebtors.length} DebtorRecord`);

    let syncedCount = 0;
    let skippedCount = 0;

    // סנכרון כל Debtor עם Contact תואם
    for (const debtor of allDebtors) {
      const key = normalizeApartmentNumber(debtor.apartmentNumber);
      const contact = contactMap[key];

      if (!contact) {
        skippedCount++;
        continue;
      }

      const updatePayload = {};
      if (contact.owner_name && contact.owner_name !== debtor.ownerName) updatePayload.ownerName = contact.owner_name;
      if (contact.owner_phone && contact.owner_phone !== debtor.phoneOwner) updatePayload.phoneOwner = contact.owner_phone;
      if (contact.tenant_phone && contact.tenant_phone !== debtor.phoneTenant) updatePayload.phoneTenant = contact.tenant_phone;

      const phonePrimary = contact.owner_is_primary_contact && contact.owner_phone 
        ? contact.owner_phone 
        : (contact.tenant_is_primary_contact && contact.tenant_phone 
          ? contact.tenant_phone 
          : (contact.owner_phone || contact.tenant_phone || ''));

      if (phonePrimary && phonePrimary !== debtor.phonePrimary) updatePayload.phonePrimary = phonePrimary;

      if (Object.keys(updatePayload).length > 0) {
        await base44.asServiceRole.entities.DebtorRecord.update(debtor.id, updatePayload);
        syncedCount++;
      }
    }

    console.log(`[syncAllContactsToDebtors] סנכרון הושלם: ${syncedCount} עודכנו, ${skippedCount} לא היה להם Contact`);

    return Response.json({ 
      success: true, 
      syncedCount, 
      skippedCount,
      totalDebtors: allDebtors.length,
      totalContacts: allContacts.length
    });
  } catch (error) {
    console.error('[syncAllContactsToDebtors] שגיאה:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});