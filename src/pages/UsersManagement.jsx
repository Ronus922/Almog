import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, X, Save, Users, Search, UserCheck, UserX, ShieldCheck } from 'lucide-react';

const COLOR_MAP = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  pink: 'bg-pink-100 text-pink-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  indigo: 'bg-indigo-100 text-indigo-700',
};

const EMPTY = { first_name: '', last_name: '', email: '', username: '', password: '', role_id: '', department: '', active: true };

export default function UsersManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState({});
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['appUsers'],
    queryFn: () => base44.entities.AppUser.list(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AppUser.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appUsers'] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AppUser.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appUsers'] }); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AppUser.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appUsers'] }); setDeleteConfirm(null); },
  });

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'שם פרטי נדרש';
    if (!editing && !form.password.trim()) e.password = 'סיסמה נדרשת';
    if (form.password && (form.password.length < 4)) e.password = 'סיסמה חייבת להיות לפחות 4 תווים';
    if (!form.role_id) e.role_id = 'יש לבחור תפקיד';
    if (!form.username.trim()) e.username = 'שם משתמש נדרש';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ first_name: u.first_name || '', last_name: u.last_name || '', email: u.email || '', username: u.username, password: '', role_id: u.role_id || '', department: u.department || '', active: u.active !== false });
    setErrors({});
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { ...form };
    // המר סיסמה ל-password_hash
    if (payload.password) {
      payload.password_hash = btoa(payload.password);
    }
    delete payload.password;
    if (editing && !payload.password_hash) delete payload.password_hash;
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getRoleName = (roleId) => roles.find((r) => r.id === roleId)?.name || '—';
  const getRoleColor = (roleId) => {
    const role = roles.find((r) => r.id === roleId);
    return role ? COLOR_MAP[role.color] || COLOR_MAP.blue : COLOR_MAP.blue;
  };

  const getFullName = (u) => [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username;

  const filtered = users.filter((u) =>
    !search || getFullName(u).includes(search) || u.email?.includes(search) || u.username?.includes(search)
  );

  const activeCount = users.filter((u) => u.active !== false).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              ניהול משתמשים
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">ניהול משתמשי המערכת והרשאותיהם</p>
          </div>
          <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-4 gap-2">
            <Plus className="w-4 h-4" />
            משתמש חדש
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'סה"כ משתמשים', value: users.length, icon: Users, color: 'bg-blue-50 border-blue-200 text-blue-700' },
            { label: 'פעילים', value: activeCount, icon: UserCheck, color: 'bg-green-50 border-green-200 text-green-700' },
            { label: 'לא פעילים', value: users.length - activeCount, icon: UserX, color: 'bg-slate-50 border-slate-200 text-slate-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`rounded-xl border p-4 flex items-center gap-3 ${color}`}>
              <Icon className="w-6 h-6 opacity-70" />
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם, דואל או שם משתמש..."
            className="h-11 pr-10 rounded-xl border-slate-200"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">טוען...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">אין משתמשים</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['שם מלא', 'דוא"ל', 'שם משתמש', 'מחלקה', 'תפקיד', 'סטטוס', 'פעולות'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.full_name}</td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{u.email}</td>
                    <td className="px-4 py-3 text-slate-500 text-sm font-mono">{u.username}</td>
                    <td className="px-4 py-3 text-slate-500 text-sm">{u.department || '—'}</td>
                    <td className="px-4 py-3">
                      {u.role_id ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${getRoleColor(u.role_id)}`}>
                          <ShieldCheck className="w-3 h-3" />
                          {getRoleName(u.role_id)}
                        </span>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${u.active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.active !== false ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => openEdit(u)} className="w-8 h-8 bg-slate-100 hover:bg-blue-100 hover:text-blue-600 rounded-lg flex items-center justify-center text-slate-500 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(u)} className="w-8 h-8 bg-slate-100 hover:bg-red-100 hover:text-red-600 rounded-lg flex items-center justify-center text-slate-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-lg font-bold">
              {editing ? 'עריכת משתמש' : 'משתמש חדש'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">שם מלא *</Label>
                <Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="ישראל ישראלי" className="h-11 rounded-xl" />
                {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">דוא"ל *</Label>
                <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="user@example.com" className="h-11 rounded-xl" type="email" />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">שם משתמש *</Label>
                <Input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} placeholder="User123" className="h-11 rounded-xl font-mono" disabled={!!editing} />
                {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}
                {editing && <p className="text-xs text-slate-400 mt-1">לא ניתן לשנות שם משתמש</p>}
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                  {editing ? 'סיסמה חדשה (אופציונלי)' : 'סיסמה *'}
                </Label>
                <Input value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder={editing ? 'השאר ריק אם לא לשנות' : '••••••••'} className="h-11 rounded-xl" type="password" />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">תפקיד *</Label>
                <Select value={form.role_id} onValueChange={(v) => setForm((p) => ({ ...p, role_id: v }))}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="בחר תפקיד..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.filter((r) => r.active !== false).map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role_id && <p className="text-xs text-red-500 mt-1">{errors.role_id}</p>}
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">מחלקה</Label>
                <Input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} placeholder="קומה 1, אזור A..." className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <input type="checkbox" id="active" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
              <Label htmlFor="active" className="text-sm font-semibold text-slate-700 cursor-pointer">משתמש פעיל</Label>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold gap-2">
                <Save className="w-4 h-4" />
                {editing ? 'שמור שינויים' : 'צור משתמש'}
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
            <DialogTitle className="text-right">מחיקת משתמש</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600 text-sm">האם למחוק את המשתמש "{deleteConfirm?.full_name}"? לא ניתן לבטל פעולה זו.</p>
          <div className="flex gap-3 mt-2">
            <Button onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl">מחק</Button>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl">ביטול</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}