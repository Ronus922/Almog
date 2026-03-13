import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, MessageCircle } from 'lucide-react';
import { useAlert } from '@/components/notifications/AlertSystem';


const VARIABLES = [
  { label: 'שם הדייר', value: '{{name}}' },
  { label: 'סכום חוב', value: '{{debt}}' },
  { label: 'דמי ניהול', value: '{{monthly}}' },
  { label: 'מים חמים', value: '{{special}}' },
];

function TemplateForm({ template, onSave, onCancel }) {
  const [name, setName] = useState(template?.name || '');
  const [content, setContent] = useState(template?.content || '');
  const textareaRef = useRef(null);

  const insertVariable = (variable) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newContent = content.substring(0, start) + variable + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    onSave({ name: name.trim(), content: content.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-slate-700 mb-1.5 block">שם התבנית</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="לדוגמה: תזכורת חוב, הודעה דחופה..."
          className="rounded-xl"
          dir="rtl"
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-700 mb-1.5 block">הוסף משתנה</label>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => insertVariable(v.value)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition-colors border border-blue-200"
            >
              <span className="text-blue-400">{'{ }'}</span>
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold text-slate-700 mb-1.5 block">תוכן התבנית</label>
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={7}
          placeholder="כתוב את תוכן ההודעה..."
          className="rounded-xl text-sm resize-none"
          dir="rtl"
        />
      </div>
      <div className="flex gap-2 justify-start pt-1">
        <Button type="submit" className="rounded-xl">שמור</Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={onCancel}>ביטול</Button>
      </div>
    </form>
  );
}

export default function WhatsAppTemplates() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: () => base44.entities.WhatsAppTemplate.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WhatsAppTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('התבנית נשמרה');
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WhatsAppTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('התבנית עודכנה');
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WhatsAppTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('התבנית נמחקה');
    },
  });

  const handleSave = (formData) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEdit = (template) => {
    setEditing(template);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div className="max-w-3xl mx-auto p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-100 rounded-xl">
            <MessageCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">תבניות וואטסאפ</h1>
            <p className="text-sm text-slate-500">ניהול תבניות הודעות לשליחה מהירה</p>
          </div>
        </div>
        <Button onClick={openNew} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" />
          תבנית חדשה
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">טוען...</div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="py-16 text-center">
            <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">אין תבניות עדיין</p>
            <p className="text-sm text-slate-400 mt-1">לחץ על "תבנית חדשה" כדי להוסיף</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <Card key={template.id} className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-base">{template.name}</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-3 whitespace-pre-wrap">{template.content}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-slate-500 hover:text-blue-600"
                      onClick={() => openEdit(template)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-slate-500 hover:text-red-600"
                      onClick={() => deleteMutation.mutate(template.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? 'עריכת תבנית' : 'תבנית חדשה'}</DialogTitle>
          </DialogHeader>
          <TemplateForm
            template={editing}
            onSave={handleSave}
            onCancel={() => { setDialogOpen(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}