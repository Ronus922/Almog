import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, X, Save, Shield, Check } from 'lucide-react';

const COLOR_OPTIONS = [
  { value: 'blue', label: 'כחול', class: 'bg-blue-500' },
  { value: 'green', label: 'ירוק', class: 'bg-green-500' },
  { value: 'purple', label: 'סגול', class: 'bg-purple-500' },
  { value: 'orange', label: 'כתום', class: 'bg-orange-500' },
  { value: 'red', label: 'אדום', class: 'bg-red-500' },
  { value: 'pink', label: 'ורוד', class: 'bg-pink-500' },
  { value: 'yellow', label: 'צהוב', class: 'bg-yellow-500' },
  { value: 'indigo', label: 'אינדיגו', class: 'bg-indigo-500' },
];

const COLOR_BADGE = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  pink: 'bg-pink-100 text-pink-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  indigo: 'bg-indigo-100 text-indigo-700',
};

const PERMISSIONS = [
  { key: 'can_view_all_employees', label: 'צפייה בכל העובדים' },
  { key: 'can_add_records', label: 'הוספת רשומות' },
  { key: 'can_edit_records', label: 'עריכת רשומות' },
  { key: 'can_delete_records', label: 'מחיקת רשומות' },
];

const EMPTY = { name: '', description: '', color: 'blue', can_view_all_employees: false, can_add_records: false, can_edit_records: false, can_delete_records: false, active: true };

export default function RolesManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const qc = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['appUsers'],
    queryFn: () => base44.entities.AppUser.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Role.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setDeleteConfirm(null); },
  });

  const openNew = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true); };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      name: r.name, description: r.description || '', color: r.color || 'blue',
      can_view_all_employees: r.can_view_all_employees || false,
      can_add_records: r.can_add_records || false,
      can_edit_records: r.can_edit_records || false,
      can_delete_records: r.can_delete_records || false,
      active: r.active !== false,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const togglePerm = (key) => setForm((p) => ({ ...p, [key]: !p[key] }));

  const getUserCount = (roleId) => users.filter((u) => u.role_id === roleId).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" />
              ניהול תפקידים
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">הגדרת תפקידים והרשאות המערכת</p>
          </div>
          <Button onClick={openNew} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-10 px-4 gap-2">
            <Plus className="w-4 h-4" />
            תפקיד חדש
          </Button>
        </div>

        {/* Roles grid */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">טוען...</div>
        ) : roles.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">אין תפקידים עדיין</p>
            <p className="text-sm mt-1">לחץ על "תפקיד חדש" כדי להתחיל</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => {
              const badgeClass = COLOR_BADGE[role.color] || COLOR_BADGE.blue;
              const colorOpt = COLOR_OPTIONS.find((c) => c.value === role.color);
              const userCount = getUserCount(role.id);
              const perms = PERMISSIONS.filter((p) => role[p.key]);

              return (
                <div key={role.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className={`h-1.5 w-full ${colorOpt?.class || 'bg-blue-500'}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${badgeClass}`}>
                          <Shield className="w-3 h-3" />
                          {role.name}
                        </span>
                        {role.active === false && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-xs">לא פעיל</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(role)} className="w-7 h-7 bg-slate-100 hover:bg-blue-100 hover:text-blue-600 rounded-lg flex items-center justify-center text-slate-500 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(role)} className="w-7 h-7 bg-slate-100 hover:bg-red-100 hover:text-red-600 rounded-lg flex items-center justify-center text-slate-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {role.description && (
                      <p className="text-sm text-slate-500 mb-3">{role.description}</p>
                    )}

                    <div className="text-xs text-slate-400 mb-3">{userCount} משתמשים בתפקיד</div>

                    {perms.length > 0 && (
                      <div className="space-y-1.5">
                        {perms.map((p) => (
                          <div key={p.key} className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            {p.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-lg font-bold">
              {editing ? 'עריכת תפקיד' : 'תפקיד חדש'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">שם התפקיד *</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="לדוגמה: מנהל, עובד, מפקח..." className="h-11 rounded-xl" required />
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">תיאור</Label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="תיאור קצר של התפקיד..." className="rounded-xl resize-none" rows={2} />
            </div>

            {/* Color */}
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">צבע התפקיד</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button key={c.value} type="button" onClick={() => setForm((p) => ({ ...p, color: c.value }))}
                    title={c.label}
                    className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                    style={{ borderColor: form.color === c.value ? '#1e293b' : 'transparent', boxShadow: form.color === c.value ? '0 0 0 2px white, 0 0 0 4px #1e293b' : 'none' }}>
                    <span className={`w-6 h-6 rounded-full ${c.class}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">הרשאות</Label>
              <div className="space-y-2 bg-slate-50 rounded-xl p-3">
                {PERMISSIONS.map((p) => (
                  <div key={p.key} className="flex items-center gap-3 cursor-pointer" onClick={() => togglePerm(p.key)}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form[p.key] ? 'bg-purple-600 border-purple-600' : 'border-slate-300 bg-white'}`}>
                      {form[p.key] && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-slate-700">{p.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl" onClick={() => setForm((p) => ({ ...p, active: !p.active }))}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${form.active ? 'bg-purple-600 border-purple-600' : 'border-slate-300 bg-white'}`}>
                {form.active && <Check className="w-3 h-3 text-white" />}
              </div>
              <Label className="text-sm font-semibold text-slate-700 cursor-pointer">תפקיד פעיל</Label>
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 h-11 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold gap-2">
                <Save className="w-4 h-4" />
                {editing ? 'שמור שינויים' : 'צור תפקיד'}
              </Button>
              <Button type="button" variant="outline" onClick={closeDialog} className="h-11 rounded-xl px-4 gap-2">
                <X className="w-4 h-4" />
                ביטול
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">מחיקת תפקיד</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600 text-sm">האם למחוק את התפקיד "{deleteConfirm?.name}"?</p>
          <div className="flex gap-3 mt-2">
            <Button onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl">מחק</Button>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl">ביטול</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}