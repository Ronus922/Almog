import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, X, Save, Shield, Check, Globe, Lock } from 'lucide-react';
import { PAGE_KEYS } from '@/lib/pageKeys';

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

const ALL_PAGES = PAGE_KEYS;

const PERMISSIONS = [
  { key: 'can_add_records', label: 'הוספת רשומות' },
  { key: 'can_edit_records', label: 'עריכת רשומות' },
  { key: 'can_delete_records', label: 'מחיקת רשומות' },
];

const EMPTY = {
  name: '', description: '', color: 'blue',
  is_admin: false,
  accessible_pages: [],
  can_add_records: false, can_edit_records: false, can_delete_records: false,
  active: true
};

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
      is_admin: r.is_admin || false,
      accessible_pages: r.accessible_pages || [],
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

  const togglePage = (pageName) => {
    setForm((p) => {
      const pages = p.accessible_pages || [];
      if (pages.includes(pageName)) {
        return { ...p, accessible_pages: pages.filter((pg) => pg !== pageName) };
      } else {
        return { ...p, accessible_pages: [...pages, pageName] };
      }
    });
  };

  const selectAllPages = () => setForm((p) => ({ ...p, accessible_pages: ALL_PAGES.map((pg) => pg.name) }));
  const clearAllPages = () => setForm((p) => ({ ...p, accessible_pages: [] }));

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
            <p className="text-sm text-slate-500 mt-0.5">הגדרת תפקידים, הרשאות ודפים נגישים</p>
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
              const pages = role.accessible_pages || [];

              return (
                <div key={role.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className={`h-1.5 w-full ${colorOpt?.class || 'bg-blue-500'}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${badgeClass}`}>
                          <Shield className="w-3 h-3" />
                          {role.name}
                        </span>
                        {role.is_admin && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-xs font-semibold flex items-center gap-1">
                            <Globe className="w-3 h-3" /> מנהל
                          </span>
                        )}
                        {role.active === false && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-xs">לא פעיל</span>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
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

                    {/* דפים נגישים */}
                    {!role.is_admin && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          דפים נגישים ({pages.length})
                        </p>
                        {pages.length === 0 ? (
                          <p className="text-xs text-red-400">אין גישה לאף דף</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {pages.slice(0, 4).map((pg) => {
                              const pageLabel = ALL_PAGES.find((p) => p.name === pg)?.label || pg;
                              return (
                                <span key={pg} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{pageLabel}</span>
                              );
                            })}
                            {pages.length > 4 && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">+{pages.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {role.is_admin && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                          <Globe className="w-3 h-3" /> גישה לכל הדפים
                        </p>
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
        <DialogContent className="max-w-3xl w-[95vw] max-h-[921px] p-0 border-0 rounded-xl overflow-hidden flex flex-col [&>button]:hidden" dir="rtl"
          style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)', backgroundColor: '#ffffff' }}>
          {/* Header Section - gradient from-primary to-primary-container */}
          <div className="px-8 py-6 flex justify-between items-start relative shrink-0"
            style={{ background: 'linear-gradient(to right, #003aa0, #004fd2)' }}>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-black tracking-tight text-white">
                {editing ? 'עריכת תפקיד' : 'תפקיד חדש'}
              </h1>
              <p className="text-sm font-medium" style={{ color: 'rgba(196, 209, 255, 0.8)' }}>
                הגדר את פרטי התפקיד והרשאות הגישה במערכת
              </p>
            </div>
            <button type="button" onClick={closeDialog}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              style={{ color: 'rgba(255,255,255,0.6)' }}>
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content Area (Scrollable) */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 space-y-10" style={{ scrollbarWidth: 'thin', scrollbarColor: '#c5c5d4 transparent' }}>

              {/* Section 1: Basic Info */}
              <section className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold px-1" style={{ color: '#454652' }}>שם התפקיד</label>
                    <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="לדוגמה: מנהל לקוחות בכיר"
                      className="w-full bg-white border border-[#c5c5d4]/20 rounded-lg px-4 py-3 focus:outline-none focus:border-[#003aa0] focus:ring-1 focus:ring-[#003aa0] transition-all placeholder:text-[#757684]/50 h-auto"
                      required />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold px-1" style={{ color: '#454652' }}>צבע התפקיד</label>
                    <div className="flex items-center gap-3 h-[46px]">
                      {COLOR_OPTIONS.map((c) => (
                        <button key={c.value} type="button"
                          onClick={() => setForm((p) => ({ ...p, color: c.value }))}
                          title={c.label}
                          className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${c.class} ${form.color === c.value ? 'border-2 border-white ring-2 ring-[#003aa0]' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold px-1" style={{ color: '#454652' }}>תיאור</label>
                  <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="תאר בקצרה את תחומי האחריות של התפקיד..."
                    className="w-full bg-white border border-[#c5c5d4]/20 rounded-lg px-4 py-3 focus:outline-none focus:border-[#003aa0] focus:ring-1 focus:ring-[#003aa0] transition-all placeholder:text-[#757684]/50 resize-none"
                    rows={3} />
                </div>
              </section>

              {/* Section 2: Access Type */}
              <section className="space-y-4">
                <h3 className="text-lg font-bold" style={{ color: '#1a1b22' }}>סוג גישה</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Access Card */}
                  <div onClick={() => setForm((p) => ({ ...p, is_admin: true }))}
                    className={`group relative cursor-pointer border-2 rounded-xl p-5 flex items-center gap-4 transition-all ${form.is_admin ? 'border-[#003aa0] bg-[#003aa0]/5' : 'border-[#c5c5d4]/20 bg-[#f4f2fc] hover:border-[#757684]'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${form.is_admin ? 'bg-[#003aa0] text-white' : 'bg-[#e9e7f0] text-[#454652]'}`}>
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className={`font-bold ${form.is_admin ? 'text-[#003aa0]' : 'text-[#1a1b22]'}`}>גישה מלאה</h4>
                      <p className="text-xs text-[#454652]">גישה לכל דפי המערכת וביצוע כל הפעולות</p>
                    </div>
                    {form.is_admin && (
                      <div className="absolute top-3 left-3">
                        <Check className="w-5 h-5 text-[#003aa0]" />
                      </div>
                    )}
                  </div>
                  {/* Limited Access Card */}
                  <div onClick={() => setForm((p) => ({ ...p, is_admin: false }))}
                    className={`group relative cursor-pointer border-2 rounded-xl p-5 flex items-center gap-4 transition-all ${!form.is_admin ? 'border-[#003aa0] bg-[#003aa0]/5' : 'border-[#c5c5d4]/20 bg-[#f4f2fc] hover:border-[#757684]'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${!form.is_admin ? 'bg-[#003aa0] text-white' : 'bg-[#e9e7f0] text-[#454652]'}`}>
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className={`font-bold ${!form.is_admin ? 'text-[#003aa0]' : 'text-[#1a1b22]'}`}>גישה מוגבלת</h4>
                      <p className="text-xs text-[#454652]">הגדרת הרשאות ספציפיות לפי צורך</p>
                    </div>
                    {!form.is_admin && (
                      <div className="absolute top-3 left-3">
                        <Check className="w-5 h-5 text-[#003aa0]" />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Section 3: Accessible Pages */}
              {!form.is_admin && (
                <section className="space-y-4 rounded-xl p-6" style={{ backgroundColor: '#f4f2fc' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold" style={{ color: '#1a1b22' }}>דפים נגישים</h3>
                    <div className="flex gap-2">
                      <button type="button" onClick={selectAllPages} className="text-xs font-medium text-[#003aa0] hover:underline">בחר הכל</button>
                      <span className="text-[#c5c5d4]">|</span>
                      <button type="button" onClick={clearAllPages} className="text-xs text-[#757684] hover:underline">נקה הכל</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                    {ALL_PAGES.map((pg) => {
                      const selected = (form.accessible_pages || []).includes(pg.name);
                      return (
                        <label key={pg.name} className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={selected} onChange={() => togglePage(pg.name)}
                            className="w-5 h-5 rounded border-[#c5c5d4] text-[#003aa0] focus:ring-[#003aa0]" />
                          <span className={`text-sm font-medium group-hover:text-[#003aa0] transition-colors ${selected ? 'text-[#003aa0]' : 'text-[#1a1b22]'}`}>
                            {pg.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Section 4: Additional Permissions */}
              <section className="space-y-4">
                <h3 className="text-lg font-bold" style={{ color: '#1a1b22' }}>הרשאות נוספות</h3>
                <div className="flex flex-wrap gap-x-12 gap-y-4">
                  {PERMISSIONS.map((p) => (
                    <label key={p.key} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={form[p.key]} onChange={() => togglePerm(p.key)}
                        className="w-5 h-5 rounded border-[#c5c5d4] text-[#5500bc] focus:ring-[#5500bc]" />
                      <span className="text-sm font-bold text-[#1a1b22] group-hover:text-[#5500bc] transition-colors">
                        {p.label}
                      </span>
                    </label>
                  ))}
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={form.active} onChange={() => setForm((p) => ({ ...p, active: !p.active }))}
                      className="w-5 h-5 rounded border-[#c5c5d4] text-[#003aa0] focus:ring-[#003aa0]" />
                    <span className="text-sm font-bold text-[#1a1b22] group-hover:text-[#003aa0] transition-colors">
                      תפקיד פעיל
                    </span>
                  </label>
                </div>
              </section>
            </div>

            {/* Footer Section */}
            <div className="px-8 py-5 border-t border-[#c5c5d4]/20 flex justify-end items-center gap-4 shrink-0"
              style={{ backgroundColor: 'rgba(244, 242, 252, 0.3)' }}>
              <Button type="button" variant="outline" onClick={closeDialog}
                className="px-6 py-2.5 rounded-lg border border-[#c5c5d4]/30 text-[#003aa0] font-bold hover:bg-[#e9e7f0] transition-all h-auto">
                ביטול
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                className="px-8 py-2.5 rounded-lg text-white font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 h-auto"
                style={{ background: 'linear-gradient(to right, #003aa0, #4648d4)' }}>
                <Plus className="w-4 h-4" />
                {editing ? 'שמור שינויים' : 'צור תפקיד'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm p-0 border-0" dir="rtl"
          style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}>
          <div className="px-6 py-4 text-white rounded-t-lg"
            style={{ background: 'linear-gradient(135deg, #b71c1c, #d32f2f)' }}>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              מחיקת תפקיד
            </h2>
          </div>
          <div className="p-6" style={{ backgroundColor: '#fbf8ff' }}>
            <p className="text-sm mb-4" style={{ color: '#454652' }}>האם למחוק את התפקיד "<strong>{deleteConfirm?.name}</strong>"?</p>
            <div className="flex gap-3">
              <Button onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}
                className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold">מחק</Button>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}
                className="flex-1 h-10 rounded-lg bg-transparent hover:bg-[#e9e7f0]"
                style={{ borderColor: 'rgba(197, 197, 212, 0.4)', color: '#454652' }}>ביטול</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}