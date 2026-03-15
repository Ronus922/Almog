import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function TodoItemForm({ open, onClose, onSave, initialData, categories, currentUsername }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sharedWith, setSharedWith] = useState('');
  const [stripColor, setStripColor] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['app-users-for-share'],
    queryFn: () => base44.entities.AppUser.list(),
    staleTime: 1000 * 60 * 5,
    enabled: open,
  });

  const otherUsers = allUsers.filter(u => u.username !== currentUsername && u.is_active);

  useEffect(() => {
    if (open) {
      setTitle(initialData?.title || '');
      setDescription(initialData?.description || '');
      setCategoryId(initialData?.category_id || categories[0]?.id || '');
      setSharedWith(initialData?.shared_with_user_id || '');
      setStripColor(initialData?.strip_color || '');
    }
  }, [open, initialData, categories]);

  const handleSave = async () => {
    if (!title.trim() || !categoryId) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      category_id: categoryId,
      shared_with_user_id: sharedWith || null,
      strip_color: stripColor || null,
    });
    setSaving(false);
    onClose();
  };

  const isEdit = !!initialData;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-background shadow-lg border p-0 overflow-hidden flex flex-col sm:rounded-lg"
        style={{ maxWidth: '472px', width: '100%' }}
        dir="rtl"
      >
        {/* כפתור סגירה */}
        <button
          onClick={onClose}
          className="absolute left-4 top-4 z-10 rounded-lg bg-white/20 p-1.5 hover:bg-white/40 transition-colors"
        >
          <X className="h-5 w-5 text-white" />
          <span className="sr-only">סגור</span>
        </button>

        {/* כותרת גרדיאנט */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-lg">
          <DialogHeader className="sr-only"><DialogTitle>{isEdit ? 'עריכת תזכורת' : 'תזכורת חדשה'}</DialogTitle></DialogHeader>
          <p className="text-white text-lg font-bold">{isEdit ? 'עריכת תזכורת' : 'תזכורת חדשה'}</p>
        </div>

        {/* תוכן */}
        <div className="space-y-4 px-6 pt-5 pb-2 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">כותרת <span className="text-red-500">*</span></label>
            <Input
              placeholder="מה צריך לעשות?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              dir="rtl"
              className="h-10 border-slate-200 rounded-lg"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSave(); }}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">תיאור (אופציונלי)</label>
            <textarea
              placeholder="פרטים נוספים..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              dir="rtl"
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">קטגוריה <span className="text-red-500">*</span></label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              dir="rtl"
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">שתף עם משתמש (אופציונלי)</label>
            <select
              value={sharedWith}
              onChange={e => setSharedWith(e.target.value)}
              dir="rtl"
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">ללא שיתוף</option>
              {otherUsers.map(u => (
                <option key={u.username} value={u.username}>{u.first_name || u.username}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">צבע פס (אופציונלי)</label>
            <select
              value={stripColor}
              onChange={e => setStripColor(e.target.value)}
              dir="rtl"
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">ברירת מחדל לפי קטגוריה</option>
              <option value="blue">כחול</option>
              <option value="green">ירוק</option>
              <option value="orange">כתום</option>
              <option value="purple">סגול</option>
              <option value="pink">ורוד</option>
            </select>
          </div>
        </div>

        {/* כפתורים */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
          <Button
            disabled={!title.trim() || !categoryId || saving}
            onClick={handleSave}
            className="bg-[#3563d0] text-white h-9 px-4 text-sm font-medium rounded-md shadow hover:bg-blue-700"
          >
            {saving ? 'שומר...' : isEdit ? 'שמור שינויים' : 'הוסף תזכורת'}
          </Button>
          <Button variant="outline" className="h-9" onClick={onClose}>ביטול</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}