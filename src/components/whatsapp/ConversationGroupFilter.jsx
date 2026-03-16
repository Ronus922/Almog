import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const GROUPS = [
  { key: 'all',       label: 'הכל' },
  { key: 'owners',    label: 'בעלי נכסים' },
  { key: 'tenants',   label: 'שוכרים' },
  { key: 'operators', label: 'מפעילים' },
  { key: 'suppliers', label: 'ספקים' },
  { key: 'unlinked',  label: 'לא משויכים' },
];

export default function ConversationGroupFilter({ activeGroup, onChange }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft < -2);
    setCanScrollRight(el.scrollLeft > -(el.scrollWidth - el.clientWidth) + 2);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener('scroll', checkScroll);
    return () => { if (el) el.removeEventListener('scroll', checkScroll); };
  }, []);

  // RTL: scroll direction is reversed
  const scrollBy = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 80, behavior: 'smooth' });
  };

  return (
    <div className="relative flex items-center gap-1">
      {/* חץ שמאל (RTL = קדימה) */}
      {canScrollRight && (
        <button
          onClick={() => scrollBy(-1)}
          className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', direction: 'rtl' }}
        onScroll={checkScroll}
      >
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

      {/* חץ ימין (RTL = אחורה) */}
      {canScrollLeft && (
        <button
          onClick={() => scrollBy(1)}
          className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}