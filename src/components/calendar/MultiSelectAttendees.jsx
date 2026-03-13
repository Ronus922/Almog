import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';

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
  const [filteredItems, setFilteredItems] = useState(items);
  const containerRef = useRef(null);

  useEffect(() => {
    setFilteredItems(
      items.filter(item =>
        formatLabel(item).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, items, formatLabel]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full text-right">
      <label className="text-sm font-medium text-slate-700 block mb-2 text-right">
        {label}
      </label>

      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-slate-200 rounded-lg p-3 text-right flex items-center justify-between hover:border-slate-300 bg-white"
      >
        <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        <span className="text-slate-600 text-sm">
          {selectedIds.length > 0 ? `${selectedIds.length} נבחרו` : 'חפש...'}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-200">
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              dir="rtl"
              className="text-right"
              autoFocus
            />
          </div>

          {/* Items List */}
          <div className="max-h-48 overflow-y-auto p-2">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const itemId = String(item.id || item.email);
                const isSelected = selectedIds.includes(itemId);
                return (
                  <div
                    key={itemId}
                    className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded text-right"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggle(itemId)}
                    />

                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}
                      style={{ backgroundColor: getAvatarColor(item) }}
                    >
                      {formatLabel(item)[0]}
                    </div>

                    {/* Label */}
                    <span className="text-sm text-slate-700 truncate">
                      {formatLabel(item)}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">אין תוצאות</p>
            )}
          </div>
        </div>
      )}

      {/* Selected Items Tags */}
      {selectedIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 justify-end">
          {items
            .filter(item => selectedIds.includes(item.id || item.email))
            .map((item) => (
              <div
                key={item.id || item.email}
                className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: getAvatarColor(item) }}
                >
                  {formatLabel(item)[0]}
                </div>
                <span>{formatLabel(item)}</span>
                <button
                  type="button"
                  onClick={() => onToggle(item.id || item.email)}
                  className="text-blue-600 hover:text-blue-800 font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}