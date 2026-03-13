import React from 'react';
import { Users } from 'lucide-react';

export default function LinkedContactInfo({ contact }) {
  // Determine what type of contact this is and show the counterpart
  const isOwner = contact.contact_type === 'owner' || (contact.owner_name && !contact.tenant_name);
  const isTenant = contact.contact_type === 'tenant' || (contact.tenant_name && !contact.owner_name);

  if (!contact || (contact.contact_type !== 'both' && !isOwner && !isTenant)) {
    return null;
  }

  // If contact_type is 'both', show both. If it's owner, show tenant. If it's tenant, show owner.
  const showTenant = contact.contact_type === 'both' || isOwner;
  const showOwner = contact.contact_type === 'both' || isTenant;

  return (
    <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-200">
      {showTenant && contact.tenant_name && (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="font-medium">שוכר:</span>
          <span>{contact.tenant_name}</span>
        </div>
      )}
      {showOwner && contact.owner_name && (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="font-medium">בעלים:</span>
          <span>{contact.owner_name}</span>
        </div>
      )}
    </div>
  );
}