import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MapPin, Pencil, Trash2, X, Save, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import AreaCard from '@/components/AreaCard';

const EMPTY_AREA = { name: '', description: '', cleanliness_status: 'dirty' };

export default function RoomsAreas() {
  const [activeTab, setActiveTab] = useState('areas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [form, setForm] = useState(EMPTY_AREA);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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
    setForm(EMPTY_AREA);
    setDialogOpen(true);
  };

  const openEdit = (area) => {
    setEditingArea(area);
    setForm({ name: area.name, description: area.description || '', cleanliness_status: area.cleanliness_status || 'dirty' });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingArea(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingArea) {
      updateMutation.mutate({ id: editingArea.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const activeAreas  = areas.filter((a) => a.active !== false);
  const inactiveAreas = areas.filter((a) => a.active === false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">ניהול אזורים</h1>
            <p className="text-sm text-slate-500 mt-0.5">ניהול אזורי הבניין וסטטוס הניקיון שלהם</p>
          </div>
          <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-4 gap-2">
            <Plus className="w-4 h-4" />
            אזור חדש
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'נקיים',         count: areas.filter((a) => a.cleanliness_status === 'clean').length,         color: 'text-green-600 bg-green-50 border-green-200' },
            { label: 'צריכים ריענון', count: areas.filter((a) => a.cleanliness_status === 'needs_refresh').length, color: 'text-amber-600 bg-amber-50 border-amber-200' },
            { label: 'מלוכלכים',      count: areas.filter((a) => a.cleanliness_status === 'dirty').length,         color: 'text-red-600 bg-red-50 border-red-200' },
          ].map(({ label, count, color }) => (
            <div key={label} className={`rounded-xl border p-4 text-center ${color}`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm font-medium mt-0.5">{label}</p>
            </div>
          ))}
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
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
              <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">תיאור</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="תיאור קצר של האזור..."
                className="rounded-xl border-slate-200 resize-none"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">סטטוס ניקיון</Label>
              <Select value={form.cleanliness_status} onValueChange={(v) => setForm((p) => ({ ...p, cleanliness_status: v }))}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clean">נקי</SelectItem>
                  <SelectItem value="needs_refresh">צריך ריענון</SelectItem>
                  <SelectItem value="dirty">מלוכלך</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
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
            <Button
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              מחק
            </Button>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl">ביטול</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}