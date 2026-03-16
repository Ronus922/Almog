import React, { useState } from 'react';
import { Search, X, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function NewChatDialog({ users, currentUser, onStart, onClose }) {
  const [search, setSearch] = useState('');

  const filtered = users.filter(u =>
    u.username !== currentUser.username &&
    (!search || u.username?.includes(search) || u.first_name?.includes(search) || u.last_name?.includes(search))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-slate-800">שיחה חדשה</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש משתמש..."
              className="pr-9 h-9 text-sm bg-slate-50"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">לא נמצאו משתמשים</p>
            ) : (
              filtered.map(u => {
                const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username;
                const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
                return (
                  <button
                    key={u.id}
                    onClick={() => onStart(u)}
                    className="w-full text-right flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{name}</p>
                      <p className="text-xs text-slate-400">{u.username}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}