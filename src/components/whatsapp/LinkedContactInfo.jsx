import React from 'react';

export default function LinkedContactInfo({ contact }) {
  if (!contact) return null;

  const name = contact.owner_name || contact.tenant_name;
  const linkedName = contact.owner_name && contact.tenant_name 
    ? (contact.owner_name === name ? contact.tenant_name : contact.owner_name)
    : null;
  const linkedType = contact.owner_name && contact.tenant_name
    ? (contact.owner_name === name ? 'שוכר' : 'בעלים')
    : null;

  return (
    <div className="text-xs text-gray-600 mt-1 space-y-0.5">
      <div>{name}</div>
      <div>דירה {contact.apartment_number}</div>
      {linkedName && linkedType && <div>{linkedType}: {linkedName}</div>}
    </div>
  );
}