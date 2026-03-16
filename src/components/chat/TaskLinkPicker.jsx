import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, X, Link } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function TaskLinkPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('');

  const { data: tasks = [] } = useQuery({
    queryKey: ['taskpro-link-picker'],
    queryFn: () => base44.entities.TaskPro.filter({ is_archived: false }),
  });

  const filtered = tasks.filter(t =>
    !search ||
    t.title?.includes(search) ||
    t.apartment_number?.includes(search) ||
    t.owner_name?.includes(search)
  ).slice(0, 20);

  const statusColor = {
    'פתוחה': 'bg-blue-100 text-blue-700',
    'בטיפול': 'bg-amber-100 text-amber-700',
    'הושלמה': 'bg-green-100 text-green-700',
    'בוטלה': 'bg-red-100 text-red-700',
    'ממתינה': 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Link className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-slate-800">קישור למשימה</h3>
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
              placeholder="חיפוש לפי כותרת, דירה, בעלים..."
              className="pr-9 h-9 text-sm bg-slate-50 border-slate-200"
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">לא נמצאו משימות</p>
            ) : (
              filtered.map(task => (
                <button
                  key={task.id}
                  onClick={() => onSelect(task)}
                  className="w-full text-right flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.apartment_number && (
                        <span className="text-xs text-slate-400">דירה {task.apartment_number}</span>
                      )}
                      {task.assigned_to_name && (
                        <span className="text-xs text-slate-400">· {task.assigned_to_name}</span>
                      )}
                    </div>
                  </div>
                  {task.status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor[task.status] || 'bg-slate-100 text-slate-600'}`}>
                      {task.status}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}