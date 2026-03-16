import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, X } from 'lucide-react';

export default function MultiSelectAttendees({
  label,
  items,
  selectedIds,
  onToggle,
  searchPlaceholder,
  formatLabel,
  getAvatarColor,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  // סגירה רק בלחיצה מחוץ לטריגר ומחוץ לפאנל
  useEffect(() => {
    const handleOutside = (e) => {
      const target = e.target;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return; // לחיצה בתוך הרכיב — לא סוגרים
      }
      setIsOpen(false);
      setSearchTerm('');
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('pointerdown', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('pointerdown', handleOutside);
    };
  }, []);

  const filteredItems = items.filter(item =>
    formatLabel(item).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItems = items.filter(item => {
    const id = String(item.id ?? item.email ?? '').trim();
    return selectedIds.map(s => String(s).trim()).includes(id);
  });

  const handleToggle = useCallback((itemId) => {
    const normalizedId = String(itemId ?? '').trim();
    if (!normalizedId) return;
    onToggle(normalizedId);
  }, [onToggle]);

  return (
    <div className="relative w-full" dir="rtl">
      {label && (
        <label className="text-sm font-medium text-slate-700 block mb-2">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full border border-slate-200 rounded-lg px-3 h-10 text-right flex items-center justify-between hover:border-blue-400 bg-white transition-colors"
      >
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        <span className="text-slate-600 text-sm">
          {selectedIds.length > 0 ? `${selectedIds.length} נבחרו` : (searchPlaceholder || 'בחר...')}
        </span>
      </button>

      {/* Panel — stopPropagation על mousedown + pointerdown כדי לבלום כל listener חיצוני */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999]"
          onMouseDown={(e) => { e.stopPropagation(); }}
          onPointerDown={(e) => { e.stopPropagation(); }}
          onClick={(e) => { e.stopPropagation(); }}
        >
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              placeholder={searchPlaceholder || 'חיפוש...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              dir="rtl"
              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 bg-slate-50"
              autoFocus
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>

          {/* Items List */}
          <div className="max-h-52 overflow-y-auto p-1">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const itemId = String(item.id ?? item.email ?? '').trim();
                const isSelected = selectedIds.map(s => String(s).trim()).includes(itemId);
                return (
                  <div
                    key={itemId}
                    onMouseDown={(e) => {
                      // מונע focus-race ואירועי document
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(itemId);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer select-none transition-colors ${
                      isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {/* Checkbox ויזואלי — ללא רכיב Radix */}
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Avatar */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: getAvatarColor(item) }}
                    >
                      {formatLabel(item)[0]}
                    </div>

                    <span className="text-sm truncate">{formatLabel(item)}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">אין תוצאות</p>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {selectedItems.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedItems.map((item) => {
            const itemId = String(item.id ?? item.email ?? '').trim();
            return (
              <div
                key={itemId}
                className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium"
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(item) }}
                >
                  {formatLabel(item)[0]}
                </div>
                <span>{formatLabel(item)}</span>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={(e) => { e.stopPropagation(); handleToggle(itemId); }}
                  className="text-blue-400 hover:text-blue-800 mr-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}