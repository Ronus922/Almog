import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// פונקציה לנרמול מספר דירה
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
    const { event, data } = await req.json();

    if (!data?.apartment_number) {
      console.log('[syncContactToDebtorRecord] מספר דירה חסר');
      return Response.json({ success: true });
    }

    const apartmentKey = normalizeApartmentNumber(data.apartment_number);
    console.log(`[syncContactToDebtorRecord] סנכרון Contact דירה: ${apartmentKey}`);

    // חיפוש DebtorRecord תואם
    const debtorRecords = await base44.asServiceRole.entities.DebtorRecord.filter({
      apartmentNumber: apartmentKey
    });

    if (debtorRecords.length === 0) {
      console.log(`[syncContactToDebtorRecord] לא נמצאת רשומת DebtorRecord לדירה: ${apartmentKey}`);
      return Response.json({ success: true });
    }

    const debtor = debtorRecords[0];
    const updatePayload = {};

    // עדכון שדות מ-Contact
    if (data.owner_name) updatePayload.ownerName = data.owner_name;
    if (data.owner_phone) updatePayload.phoneOwner = data.owner_phone;
    if (data.tenant_phone) updatePayload.phoneTenant = data.tenant_phone;

    // קביעת טלפון ראשי
    updatePayload.phonePrimary = data.owner_is_primary_contact && data.owner_phone 
      ? data.owner_phone 
      : (data.tenant_is_primary_contact && data.tenant_phone 
        ? data.tenant_phone 
        : (data.owner_phone || data.tenant_phone || ''));

    if (Object.keys(updatePayload).length > 0) {
      await base44.asServiceRole.entities.DebtorRecord.update(debtor.id, updatePayload);
      console.log(`[syncContactToDebtorRecord] עדכון DebtorRecord: ${debtor.id}`);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[syncContactToDebtorRecord] שגיאה:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});