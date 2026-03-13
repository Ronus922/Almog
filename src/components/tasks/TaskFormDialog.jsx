import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import TaskAuditLogTab from "@/components/tasks/TaskAuditLogTab";

const TRACKED_FIELDS = ["task_type", "status", "priority", "due_date", "assigned_to_name", "description", "completion_notes"];

const TASK_TYPES = ["שיחת טלפון", "שליחת מכתב התראה", "פגישה", "מעקב תשלום", "הגשת תביעה", "אחר"];
const PRIORITIES = ["גבוהה", "בינונית", "נמוכה"];
const STATUSES = ["פתוחה", "בטיפול", "הושלמה", "בוטלה"];

export default function TaskFormDialog({ open, onClose, task, debtorRecord, onSaved, currentUser }) {
  const isEdit = !!task;
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("form");

  const { data: appUsers = [] } = useQuery({
    queryKey: ["appUsers"],
    queryFn: () => base44.entities.AppUser.list("first_name"),
  });

  useEffect(() => {
    if (open) {
      setActiveTab("form");
      if (isEdit) {
        setForm({ ...task });
      } else {
        const assignerDisplayName = currentUser?.first_name
          ? `${currentUser.first_name}${currentUser.last_name ? " " + currentUser.last_name : ""}`
          : currentUser?.username || "";
        setForm({
          debtor_record_id: debtorRecord?.id || "",
          apartment_number: debtorRecord?.apartmentNumber || "",
          owner_name: debtorRecord?.ownerName || "",
          task_type: "שיחת טלפון",
          priority: "בינונית",
          status: "פתוחה",
          description: "",
          due_date: "",
          assigned_to: currentUser?.username || "",
          assigned_to_name: assignerDisplayName,
          assigned_by: currentUser?.username || currentUser?.email || "",
          completion_notes: "",
        });
      }
    }
  }, [open, task, debtorRecord]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleAssignedToChange = (username) => {
    const user = appUsers.find(u => u.username === username);
    const fullName = user
      ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}`
      : username;
    set("assigned_to", username);
    set("assigned_to_name", fullName);
  };

  const getChangerInfo = () => {
    const fullName = currentUser?.first_name
      ? `${currentUser.first_name}${currentUser.last_name ? " " + currentUser.last_name : ""}`
      : currentUser?.username || "";
    return { username: currentUser?.username || "", name: fullName };
  };

  const handleSave = async () => {
    if (!form.task_type || !form.due_date || !form.description) return;
    setSaving(true);
    const changer = getChangerInfo();

    if (isEdit) {
      const updateData = { ...form };
      if (form.status === "הושלמה" && !task.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      await base44.entities.Task.update(task.id, updateData);

      // Build changes diff
      const changes = {};
      TRACKED_FIELDS.forEach(field => {
        const oldVal = task[field] || "";
        const newVal = form[field] || "";
        if (oldVal !== newVal) {
          changes[field] = { from: oldVal, to: newVal };
        }
      });

      await base44.entities.TaskAuditLog.create({
        task_id: task.id,
        action: "updated",
        changed_by_username: changer.username,
        changed_by_name: changer.name,
        changes: JSON.stringify(changes),
      });
    } else {
      const newTask = await base44.entities.Task.create(form);
      await base44.entities.TaskAuditLog.create({
        task_id: newTask.id,
        action: "created",
        changed_by_username: changer.username,
        changed_by_name: changer.name,
        changes: "{}",
      });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "עריכת משימה" : "משימה חדשה"}</DialogTitle>
          {debtorRecord && !isEdit && (
            <p className="text-sm text-slate-500">
              דירה {debtorRecord.apartmentNumber} – {debtorRecord.ownerName}
            </p>
          )}
        </DialogHeader>

        {isEdit && (
          <div className="flex border-b border-slate-200 mb-2">
            <button
              onClick={() => setActiveTab("form")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "form" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              פרטי משימה
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "audit" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              היסטוריית שינויים
            </button>
          </div>
        )}

        {activeTab === "audit" && isEdit ? (
          <TaskAuditLogTab taskId={task?.id} />
        ) : (
          <>
            <div className="space-y-4 mt-2 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>סוג משימה *</Label>
                  <Select value={form.task_type} onValueChange={v => set("task_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>תאריך יעד *</Label>
                  <Input type="date" value={form.due_date || ""} onChange={e => set("due_date", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>עדיפות</Label>
                  <Select value={form.priority} onValueChange={v => set("priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>סטטוס</Label>
                  <Select value={form.status} onValueChange={v => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>הקצה ל:</Label>
                <Select value={form.assigned_to} onValueChange={handleAssignedToChange}>
                  <SelectTrigger><SelectValue placeholder="בחר משתמש..." /></SelectTrigger>
                  <SelectContent>
                    {appUsers.map(u => (
                      <SelectItem key={u.id} value={u.username}>
                        {u.first_name}{u.last_name ? " " + u.last_name : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>תיאור</Label>
                <Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} placeholder="פרטים נוספים על המשימה..." rows={3} />
              </div>

              {(form.status === "הושלמה" || form.status === "בוטלה") && (
                <div className="space-y-1">
                  <Label>הערות סגירה</Label>
                  <Textarea value={form.completion_notes || ""} onChange={e => set("completion_notes", e.target.value)} placeholder="מה בוצע / למה בוטל..." rows={2} />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={onClose}>ביטול</Button>
              <Button onClick={handleSave} disabled={saving || !form.task_type || !form.due_date}>
                {saving ? "שומר..." : isEdit ? "שמור שינויים" : "צור משימה"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}