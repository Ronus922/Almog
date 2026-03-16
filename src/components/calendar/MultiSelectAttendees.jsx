import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
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
  const containerRef = useRef(null);

  // סגור רק בלחיצה מחוץ לcontainer
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredItems = items.filter(item =>
    formatLabel(item).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItems = items.filter(item => {
    const id = String(item.id || item.email || '');
    return selectedIds.includes(id);
  });

  return (
    <div ref={containerRef} className="relative w-full" dir="rtl">
      {label && (
        <label className="text-sm font-medium text-slate-700 block mb-2">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        className="w-full border border-slate-200 rounded-lg px-3 h-10 text-right flex items-center justify-between hover:border-slate-300 bg-white transition-colors"
      >
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        <span className="text-slate-600 text-sm">
          {selectedIds.length > 0 ? `${selectedIds.length} נבחרו` : (searchPlaceholder || 'בחר...')}
        </span>
      </button>

      {/* Dropdown Panel — onMouseDown עם preventDefault על כל הPanel */}
      {isOpen && (
        <div
          className="absolute top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[9999]"
          onMouseDown={(e) => {
            // מונע את סגירת הdropdown בכל לחיצה בתוך הpanel
            e.preventDefault();
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
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
            />
          </div>

          {/* Items */}
          <div className="max-h-52 overflow-y-auto p-1">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const itemId = String(item.id || item.email || '');
                const isSelected = selectedIds.includes(itemId);
                return (
                  <div
                    key={itemId}
                    onClick={() => onToggle(itemId)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {/* Checkbox ויזואלי בלבד */}
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

                    {/* Label */}
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

      {/* Tags of selected items */}
      {selectedItems.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedItems.map((item) => {
            const itemId = String(item.id || item.email || '');
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
                  onClick={() => onToggle(itemId)}
                  className="text-blue-500 hover:text-blue-800 ml-0.5"
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