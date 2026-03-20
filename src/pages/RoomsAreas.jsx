import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, MapPin, Pencil, Trash2, X, Save } from 'lucide-react';
import AreaCard from '@/components/AreaCard';

const COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#64748b', '#1e293b',
];

const EMPTY = { name: '', description: '', color: '#3b82f6' };

export default function RoomsAreas() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [descError, setDescError] = useState('');

  const qc = useQueryClient();

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: () => base44.entities.Area.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Area.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['areas'] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Area.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['areas'] }); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Area.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['areas'] }); setDeleteConfirm(null); },
  });

  const openNew = () => {
    setEditingArea(null);
    setForm(EMPTY);
    setDescError('');
    setDialogOpen(true);
  };

  const openEdit = (area) => {
    setEditingArea(area);
    setForm({ name: area.name, description: area.description || '', color: area.color || '#3b82f6' });
    setDescError('');
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingArea(null); };

  const handleDescChange = (val) => {
    if (val.length > 20) {
      setDescError('מקסימום 20 תווים');
      return;
    }
    setDescError('');
    setForm((p) => ({ ...p, description: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || descError) return;
    if (editingArea) {
      updateMutation.mutate({ id: editingArea.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">ניהול אזורים</h1>
            <p className="text-sm text-slate-500 mt-0.5">ניהול אזורי הבניין</p>
          </div>
          <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-4 gap-2">
            <Plus className="w-4 h-4" />
            אזור חדש
          </Button>
        </div>

        {/* Areas grid */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">טוען...</div>
        ) : areas.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">אין אזורים עדיין</p>
            <p className="text-sm mt-1">לחץ על "אזור חדש" כדי להתחיל</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...areas]
              .sort((a, b) => a.name.localeCompare(b.name, 'he'))
              .map((area) => (
                <div key={area.id} className="relative group">
                  <AreaCard area={area} />
                  <div className="absolute top-3 left-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(area)}
                      className="w-7 h-7 bg-white rounded-lg shadow border border-slate-200 flex items-center justify-center text-slate-600 hover:text-blue-600 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(area)}
                      className="w-7 h-7 bg-white rounded-lg shadow border border-slate-200 flex items-center justify-center text-slate-600 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-lg font-bold">
              {editingArea ? 'עריכת אזור' : 'אזור חדש'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">שם האזור *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="לדוגמה: לובי, חדר אוכל..."
                className="h-11 rounded-xl border-slate-200"
                required
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                תיאור קצר
                <span className="text-xs font-normal text-slate-400 mr-2">({form.description.length}/20)</span>
              </Label>
              <Input
                value={form.description}
                onChange={(e) => handleDescChange(e.target.value)}
                placeholder="תיאור קצר..."
                className="h-11 rounded-xl border-slate-200"
                maxLength={21}
              />
              {descError && <p className="text-xs text-red-500 mt-1">{descError}</p>}
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">צבע האזור</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, color: c }))}
                    className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                    style={{
                      backgroundColor: c,
                      borderColor: form.color === c ? '#1e293b' : 'transparent',
                      boxShadow: form.color === c ? '0 0 0 2px white, 0 0 0 4px ' + c : 'none',
                    }}
                  />
                ))}
              </div>
              {/* Custom color */}
              <div className="flex items-center gap-3 mt-3">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
                />
                <span className="text-sm text-slate-500">צבע מותאם אישית</span>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: form.color }} />
              <div className="p-3 flex items-center gap-3 bg-white">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: form.color + '20' }}>
                  <MapPin className="w-4 h-4" style={{ color: form.color }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{form.name || 'שם האזור'}</p>
                  {form.description && <p className="text-xs text-slate-500">{form.description}</p>}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold gap-2">
                <Save className="w-4 h-4" />
                {editingArea ? 'שמור שינויים' : 'צור אזור'}
              </Button>
              <Button type="button" variant="outline" onClick={closeDialog} className="h-11 rounded-xl px-4 gap-2">
                <X className="w-4 h-4" />
                ביטול
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">מחיקת אזור</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600 text-sm">האם למחוק את האזור "{deleteConfirm?.name}"? לא ניתן לבטל פעולה זו.</p>
          <div className="flex gap-3 mt-2">
            <Button onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl">
              מחק
            </Button>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl">ביטול</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}