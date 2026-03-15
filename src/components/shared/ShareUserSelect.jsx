import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Search } from 'lucide-react';

export default function ShareUserSelect({
  users = [],
  value = '',
  onChange,
  label = 'שתף עם משתמש',
  required = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const filteredUsers = searchTerm.trim()
    ? users.filter(u => (u.first_name || u.username).toLowerCase().includes(searchTerm.toLowerCase()))
    : users;

  const selectedUser = users.find(u => u.username === value);

  const getDisplayText = () => {
    if (!value) return 'בחר משתמש...';
    return selectedUser ? (selectedUser.first_name || selectedUser.username) : 'בחר משתמש...';
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
                  placeholder="חפש משתמש..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  dir="rtl"
                  className="pr-9 pl-3 h-9 text-sm rounded-lg border-slate-200"
                  autoFocus
                />
              </div>
            </div>

            {/* Users List */}
            <div className="max-h-60 overflow-y-auto p-2">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg transition-colors text-right cursor-pointer group"
                dir="rtl"
              >
                <Checkbox checked={value === ''} onCheckedChange={() => {}} className="flex-shrink-0" />
                <span className="text-sm text-slate-700 flex-1 group-hover:text-slate-900">ללא שיתוף</span>
              </button>

              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <button
                    key={user.username}
                    type="button"
                    onClick={() => {
                      onChange(user.username);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg transition-colors text-right cursor-pointer group"
                    dir="rtl"
                  >
                    <Checkbox checked={value === user.username} onCheckedChange={() => {}} className="flex-shrink-0" />
                    <span className="text-sm text-slate-700 flex-1 group-hover:text-slate-900">
                      {user.first_name || user.username}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">לא נמצאו משתמשים</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}