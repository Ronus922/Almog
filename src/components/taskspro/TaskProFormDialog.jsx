import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import MultiSelectAttendees from "./MultiSelectAttendees";
import { createTask, updateTask, replaceAttendees, fetchTemplates, fetchAttendees, logActivity, createRule } from "./taskProApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const TASK_TYPES = ["שיחת טלפון", "שליחת מכתב התראה", "פגישה", "מעקב תשלום", "הגשת תביעה", "משימה כללית", "אחר"];
const PRIORITIES = ["גבוהה", "בינונית", "נמוכה"];
const STATUSES = ["פתוחה", "בטיפול", "ממתינה"];
const FREQ_LABELS = { daily: "יומי", weekly: "שבועי", monthly: "חודשי", yearly: "שנתי" };
const DAYS_HE = [
  { key: "sunday", label: "א'" }, { key: "monday", label: "ב'" }, { key: "tuesday", label: "ג'" },
  { key: "wednesday", label: "ד'" }, { key: "thursday", label: "ה'" }, { key: "friday", label: "ו'" }, { key: "saturday", label: "ש'" },
];

const defaultForm = {
  title: "", task_type: "שיחת טלפון", status: "פתוחה", priority: "בינונית",
  description: "", assigned_to: "", assigned_to_name: "",
  due_at: "", debtor_record_id: "", apartment_number: "", owner_name: "",
  source: "manual", template_id: "", is_recurring: false,
};

const defaultRecurrence = {
  frequency: "weekly", interval_value: 1, generate_mode: "fixed_schedule",
  days_of_week: [], day_of_month: 1, ends_mode: "never", ends_at: "", max_occurrences: "",
};

export default function TaskProFormDialog({ open, onClose, task, currentUser, onSaved }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);
  const [recurrence, setRecurrence] = useState(defaultRecurrence);
  const [attendees, setAttendees] = useState([]);
  const [saving, setSaving] = useState(false);

  const { data: appUsers = [] } = useQuery({
    queryKey: ["appUsers"],
    queryFn: () => base44.entities.AppUser.list(),
    enabled: open,
  });
  const { data: templates = [] } = useQuery({
    queryKey: ["taskpro-templates"],
    queryFn: fetchTemplates,
    enabled: open,
  });
  const { data: debtors = [] } = useQuery({
    queryKey: ["debtors"],
    queryFn: () => base44.entities.DebtorRecord.list(),
    enabled: open,
  });

  const userOptions = appUsers.map((u) => ({
    username: u.username,
    name: u.email === "r@bios.co.il" ? "רונן משולם" : [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username,
    email: u.email,
  }));

  useEffect(() => {
    if (!open) return;
    if (task) {
      setForm({
        title: task.title || "",
        task_type: task.task_type || "שיחת טלפון",
        status: task.status || "פתוחה",
        priority: task.priority || "בינונית",
        description: task.description || "",
        assigned_to: task.assigned_to || "",
        assigned_to_name: task.assigned_to_name || "",
        due_at: task.due_at ? task.due_at.slice(0, 16) : "",
        debtor_record_id: task.debtor_record_id || "",
        apartment_number: task.apartment_number || "",
        owner_name: task.owner_name || "",
        source: task.source || "manual",
        template_id: task.template_id || "",
        is_recurring: false,
      });
      fetchAttendees(task.id).then((list) =>
        setAttendees(list.map((a) => ({ username: a.user_username, name: a.user_name, email: a.user_email })))
      );
    } else {
      setForm(defaultForm);
      setAttendees([]);
    }
    setRecurrence(defaultRecurrence);
  }, [open, task?.id]);

  const setF = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setR = (key, val) => setRecurrence((r) => ({ ...r, [key]: val }));

  const handleDebtorChange = (id) => {
    const d = debtors.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      debtor_record_id: id,
      apartment_number: d?.apartmentNumber || "",
      owner_name: d?.ownerName || "",
    }));
  };

  const handleAssignedChange = (username) => {
    const u = userOptions.find((x) => x.username === username);
    setForm((f) => ({ ...f, assigned_to: username, assigned_to_name: u?.name || username }));
  };

  const handleTemplateChange = (id) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setForm((f) => ({
      ...f,
      template_id: id,
      task_type: t.task_type || f.task_type,
      priority: t.default_priority || f.priority,
      status: t.default_status || f.status,
      description: t.default_description || f.description,
      assigned_to: t.default_assigned_to || f.assigned_to,
      assigned_to_name: t.default_assigned_to_name || f.assigned_to_name,
      source: "template",
      due_at: t.due_days_from_now
        ? new Date(Date.now() + t.due_days_from_now * 86400000).toISOString().slice(0, 16)
        : f.due_at,
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.task_type) return;
    setSaving(true);

    const actor = {
      username: currentUser?.username || "",
      name: currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name || ""}`.trim() : currentUser?.username || "",
    };

    const payload = {
      title: form.title.trim(),
      task_type: form.task_type,
      status: form.status,
      priority: form.priority,
      description: form.description,
      assigned_to: form.assigned_to,
      assigned_to_name: form.assigned_to_name,
      assigned_by: actor.username,
      assigned_by_name: actor.name,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      debtor_record_id: form.debtor_record_id || null,
      apartment_number: form.apartment_number,
      owner_name: form.owner_name,
      source: form.source,
      template_id: form.template_id || null,
    };

    let saved;
    if (task) {
      saved = await updateTask(task.id, payload);
      await logActivity(task.id, "updated", actor, { changes: "עדכון משימה" });
    } else {
      saved = await createTask(payload);
      await logActivity(saved.id, "created", actor);
    }

    // attendees
    await replaceAttendees(saved.id, attendees);

    // recurrence rule
    if (!task && form.is_recurring) {
      const startDate = form.due_at ? new Date(form.due_at) : new Date();
      const nextRun = new Date(startDate);
      await createRule({
        title: form.title.trim(),
        frequency: recurrence.frequency,
        interval_value: recurrence.interval_value || 1,
        days_of_week_json: recurrence.frequency === "weekly" ? JSON.stringify(recurrence.days_of_week) : null,
        day_of_month: recurrence.frequency === "monthly" ? recurrence.day_of_month : null,
        starts_at: startDate.toISOString(),
        ends_mode: recurrence.ends_mode,
        ends_at: recurrence.ends_at ? new Date(recurrence.ends_at).toISOString() : null,
        max_occurrences: recurrence.max_occurrences ? parseInt(recurrence.max_occurrences) : null,
        generate_mode: recurrence.generate_mode,
        next_run_at: nextRun.toISOString(),
        template_task_title: form.title.trim(),
        template_task_type: form.task_type,
        template_priority: form.priority,
        template_description: form.description,
        assigned_to: form.assigned_to,
        assigned_to_name: form.assigned_to_name,
        debtor_record_id: form.debtor_record_id || null,
        apartment_number: form.apartment_number,
        owner_name: form.owner_name,
        created_by: actor.username,
        created_by_name: actor.name,
      });
    }

    queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["taskpro-rules"] });
    onSaved?.(saved);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            {task ? "עריכת משימה" : "משימה חדשה"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Template picker */}
          {!task && templates.length > 0 && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <Label className="text-sm font-semibold text-violet-700 mb-2 block">בחר תבנית (אופציונלי)</Label>
              <Select value={form.template_id} onValueChange={handleTemplateChange}>
                <SelectTrigger className="h-10 bg-white">
                  <SelectValue placeholder="בחר תבנית..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Section: פרטים בסיסיים */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-4">
            <p className="text-sm font-bold text-slate-600">פרטי משימה</p>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">כותרת המשימה *</Label>
              <Input
                className="h-10"
                placeholder="כותרת המשימה..."
                value={form.title}
                onChange={(e) => setF("title", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">סוג משימה *</Label>
                <Select value={form.task_type} onValueChange={(v) => setF("task_type", v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">עדיפות</Label>
                <Select value={form.priority} onValueChange={(v) => setF("priority", v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">סטטוס</Label>
                <Select value={form.status} onValueChange={(v) => setF("status", v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">תאריך יעד</Label>
                <Input type="datetime-local" className="h-10" value={form.due_at} onChange={(e) => setF("due_at", e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">תיאור</Label>
              <Textarea
                className="min-h-20 resize-none"
                placeholder="תיאור המשימה..."
                value={form.description}
                onChange={(e) => setF("description", e.target.value)}
              />
            </div>
          </div>

          {/* Section: הקצאה */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-4">
            <p className="text-sm font-bold text-slate-600">הקצאה ומשתתפים</p>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">משויך ראשי</Label>
              <Select value={form.assigned_to} onValueChange={handleAssignedChange}>
                <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="בחר עובד..." /></SelectTrigger>
                <SelectContent>
                  {userOptions.map((u) => <SelectItem key={u.username} value={u.username}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">משתתפים נוספים</Label>
              <MultiSelectAttendees
                users={userOptions}
                selected={attendees}
                onChange={setAttendees}
              />
            </div>
          </div>

          {/* Section: דירה/חייב */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-4">
            <p className="text-sm font-bold text-slate-600">קישור לדייר / דירה</p>
            <Select value={form.debtor_record_id} onValueChange={handleDebtorChange}>
              <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="בחר דירה / דייר..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>ללא קישור</SelectItem>
                {debtors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    דירה {d.apartmentNumber} – {d.ownerName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section: מחזוריות (רק ביצירה) */}
          {!task && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-blue-700">הפוך למשימה מחזורית</p>
                <Switch checked={form.is_recurring} onCheckedChange={(v) => setF("is_recurring", v)} />
              </div>
              {form.is_recurring && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-slate-600 mb-1 block">תדירות</Label>
                      <Select value={recurrence.frequency} onValueChange={(v) => setR("frequency", v)}>
                        <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(FREQ_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-600 mb-1 block">כל כמה</Label>
                      <Input
                        type="number" min={1} className="h-9 bg-white"
                        value={recurrence.interval_value}
                        onChange={(e) => setR("interval_value", parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>

                  {recurrence.frequency === "weekly" && (
                    <div>
                      <Label className="text-xs font-medium text-slate-600 mb-2 block">ימים בשבוע</Label>
                      <div className="flex gap-1.5 flex-wrap">
                        {DAYS_HE.map((d) => (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => {
                              const days = recurrence.days_of_week.includes(d.key)
                                ? recurrence.days_of_week.filter((x) => x !== d.key)
                                : [...recurrence.days_of_week, d.key];
                              setR("days_of_week", days);
                            }}
                            className={`w-9 h-9 rounded-full text-xs font-semibold transition-all border ${recurrence.days_of_week.includes(d.key) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-blue-50"}`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {recurrence.frequency === "monthly" && (
                    <div>
                      <Label className="text-xs font-medium text-slate-600 mb-1 block">יום בחודש</Label>
                      <Input type="number" min={1} max={31} className="h-9 w-24 bg-white" value={recurrence.day_of_month} onChange={(e) => setR("day_of_month", parseInt(e.target.value) || 1)} />
                    </div>
                  )}

                  <div>
                    <Label className="text-xs font-medium text-slate-600 mb-1 block">סיום</Label>
                    <Select value={recurrence.ends_mode} onValueChange={(v) => setR("ends_mode", v)}>
                      <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">ללא סיום</SelectItem>
                        <SelectItem value="on_date">בתאריך</SelectItem>
                        <SelectItem value="after_count">אחרי מספר פעמים</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {recurrence.ends_mode === "on_date" && (
                    <Input type="date" className="h-9 bg-white" value={recurrence.ends_at} onChange={(e) => setR("ends_at", e.target.value)} />
                  )}
                  {recurrence.ends_mode === "after_count" && (
                    <Input type="number" min={1} className="h-9 w-28 bg-white" placeholder="מס' פעמים" value={recurrence.max_occurrences} onChange={(e) => setR("max_occurrences", e.target.value)} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>ביטול</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-24"
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
            >
              {saving ? "שומר..." : task ? "עדכן" : "צור משימה"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}