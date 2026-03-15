import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function TodoItemForm({ open, onClose, onSave, initialData, categories, currentUsername }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sharedWith, setSharedWith] = useState('');
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
    });
    setSaving(false);
    onClose();
  };

  const isEdit = !!initialData;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'עריכת תזכורת' : 'תזכורת חדשה'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">כותרת <span className="text-red-500">*</span></label>
            <Input
              placeholder="מה צריך לעשות?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              dir="rtl"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSave(); }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">תיאור (אופציונלי)</label>
            <textarea
              placeholder="פרטים נוספים..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              dir="rtl"
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">קטגוריה <span className="text-red-500">*</span></label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              dir="rtl"
              className="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Share */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">שתף עם משתמש (אופציונלי)</label>
            <select
              value={sharedWith}
              onChange={e => setSharedWith(e.target.value)}
              dir="rtl"
              className="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">ללא שיתוף</option>
              {otherUsers.map(u => (
                <option key={u.username} value={u.username}>{u.first_name || u.username}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={onClose}>ביטול</Button>
            <Button
              disabled={!title.trim() || !categoryId || saving}
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? 'שומר...' : isEdit ? 'שמור שינויים' : 'הוסף'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}