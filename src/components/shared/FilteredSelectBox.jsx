import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Search } from 'lucide-react';

/**
 * תיבת בחירה עם פילטר
 * תומכת בבחירה יחידה או מרובה עם חיפוש בזמן אמת
 */
export default function FilteredSelectBox({
  items = [],
  value = null,
  onChange,
  label = '',
  placeholder = 'בחר...',
  searchPlaceholder = 'חפש...',
  getItemLabel = (item) => item.name || item,
  getItemId = (item) => item.id || item,
  multiple = false,
  required = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const filteredItems = searchTerm.trim()
    ? items.filter(item => {
        const label = getItemLabel(item);
        return String(label).toLowerCase().includes(searchTerm.toLowerCase());
      })
    : items;

  const getDisplayText = () => {
    if (!value) return placeholder;
    if (Array.isArray(value)) {
      return value.length === 0 ? placeholder : `${value.length} נבחרו`;
    }
    const item = items.find(i => getItemId(i) === value);
    return item ? getItemLabel(item) : placeholder;
  };

  const isSelected = (itemId) => {
    if (Array.isArray(value)) {
      return value.includes(itemId);
    }
    return value === itemId;
  };

  const handleSelect = (itemId) => {
    if (multiple) {
      const newValue = Array.isArray(value) ? [...value] : [];
      if (newValue.includes(itemId)) {
        newValue.splice(newValue.indexOf(itemId), 1);
      } else {
        newValue.push(itemId);
      }
      onChange(newValue);
    } else {
      onChange(itemId);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

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
    <div className="space-y-2" ref={containerRef}>
      {label && (
        <label className="block text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-right flex items-center justify-between hover:border-slate-300 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <ChevronDown
            className={`w-4 h-4 text-slate-600 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
          <span className="text-sm text-slate-700 flex-1 text-right px-2 truncate">
            {getDisplayText()}
          </span>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
            {/* Search Input */}
            <div className="p-3 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  dir="rtl"
                  className="pr-9 pl-3 h-9 text-sm rounded-lg border-slate-200"
                  autoFocus
                />
              </div>
            </div>

            {/* Items List */}
            <div className="max-h-60 overflow-y-auto p-2">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const itemId = getItemId(item);
                  const itemLabel = getItemLabel(item);
                  return (
                    <button
                      key={itemId}
                      type="button"
                      onClick={() => handleSelect(itemId)}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg transition-colors text-right cursor-pointer group"
                      dir="rtl"
                    >
                      <Checkbox
                        checked={isSelected(itemId)}
                        onCheckedChange={() => {}}
                        className="flex-shrink-0"
                      />
                      <span className="text-sm text-slate-700 flex-1 group-hover:text-slate-900">
                        {itemLabel}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">לא נמצאו פריטים</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}