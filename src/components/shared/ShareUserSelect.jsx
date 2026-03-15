import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronDown } from 'lucide-react';

export default function ShareUserSelect({
  users = [],
  value = '',
  onChange,
  placeholder = 'בחר משתמש...',
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
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="חפש לפי שם..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          dir="rtl"
          className="h-9 border-slate-200 rounded-lg text-sm"
        />
        {isOpen && (
          <div className="absolute z-10 w-full border border-slate-200 bg-white rounded-lg shadow-lg">
            <select
              value={value}
              onChange={e => {
                onChange(e.target.value);
                setIsOpen(false);
                setSearchTerm('');
              }}
              dir="rtl"
              className="w-full h-10 border-0 px-3 text-sm bg-white focus:outline-none"
            >
              <option value="">ללא שיתוף</option>
              {filteredUsers.map(u => (
                <option key={u.username} value={u.username}>{u.first_name || u.username}</option>
              ))}
            </select>
          </div>
        )}
        {!isOpen && (
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            dir="rtl"
            className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">ללא שיתוף</option>
            {users.map(u => (
              <option key={u.username} value={u.username}>{u.first_name || u.username}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}