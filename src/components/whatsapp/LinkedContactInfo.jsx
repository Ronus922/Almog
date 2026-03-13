import React from 'react';

export default function LinkedContactInfo({ contact }) {
  if (!contact) return null;

  const linkedName = contact.owner_name && contact.tenant_name 
    ? (contact.owner_name === (contact.owner_name || contact.tenant_name) ? contact.tenant_name : contact.owner_name)
    : null;
  const linkedType = contact.owner_name && contact.tenant_name
    ? (contact.owner_name === (contact.owner_name || contact.tenant_name) ? 'שוכר' : 'בעלים')
    : null;

  return (
    <div className="text-sm text-gray-600 mt-1 space-y-1">
      <div>דירה {contact.apartment_number}</div>
      {linkedName && linkedType && <div className="text-xs">{linkedType}: {linkedName}</div>}
    </div>
  );
}