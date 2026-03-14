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
    <div className="text-sm text-gray-600 mt-1 space-y-2">
      <div className="flex items-center gap-2">
        {contact.whatsapp_profile_image_url || contact.whatsapp_profile_image && (
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <img 
              src={contact.whatsapp_profile_image_url || contact.whatsapp_profile_image} 
              alt={contact.owner_name || contact.tenant_name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div>
          <div>דירה {contact.apartment_number}</div>
          {linkedName && linkedType && <div className="text-xs">{linkedType}: {linkedName}</div>}
        </div>
      </div>
    </div>
  );
}