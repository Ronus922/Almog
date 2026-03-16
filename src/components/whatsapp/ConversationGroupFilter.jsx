import React from 'react';

const GROUPS = [
  { key: 'all',       label: 'הכל' },
  { key: 'owners',    label: 'בעלי נכסים' },
  { key: 'tenants',   label: 'שוכרים' },
  { key: 'operators', label: 'מפעילים' },
  { key: 'suppliers', label: 'ספקים' },
  { key: 'unlinked',  label: 'לא משויכים' },
];

export default function ConversationGroupFilter({ activeGroup, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
      {GROUPS.map((g) => (
        <button
          key={g.key}
          onClick={() => onChange(g.key)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap border ${
            activeGroup === g.key
              ? 'bg-green-600 text-white border-green-600 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}