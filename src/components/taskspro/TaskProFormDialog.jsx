import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { X, ClipboardList, Repeat2, MessageSquare, Paperclip, Users, CalendarIcon, Search, UserPlus, Check, Upload, Home } from "lucide-react";
import MultiSelectAttendees from "./MultiSelectAttendees";
import { createTask, updateTask, replaceAttendees, fetchTemplates, fetchAttendees, logActivity, createRule, fetchComments, createComment, fetchAttachments, uploadAttachment, deleteAttachment } from "./taskProApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthContext";

const PRIORITIES = ["נמוכה", "בינונית", "דחופה"];
const STATUSES = ["פתוחה", "בטיפול", "ממתינה", "הושלמה", "בוטלה"];
const FREQ_LABELS = { daily: "יומי", weekly: "שבועי", monthly: "חודשי", yearly: "שנתי" };
const DAYS_HE = [
  { key: "sunday", label: "א'" }, { key: "monday", label: "ב'" }, { key: "tuesday", label: "ג'" },
  { key: "wednesday", label: "ד'" }, { key: "thursday", label: "ה'" }, { key: "friday", label: "ו'" }, { key: "saturday", label: "ש'" }
];
const TASK_TYPES = ["שיחת טלפון", "שליחת מכתב התראה", "פגישה", "מעקב תשלום", "הגשת תביעה", "משימה כללית", "אחר"];

const defaultForm = {
  title: "", status: "פתוחה", priority: "נמוכה", task_type: "משימה כללית",
  description: "", due_at: "",
  debtor_record_ids: [], // array of selected debtors
  debtor_record_id: "", apartment_number: "", owner_name: "",
  source: "manual", template_id: "", is_recurring: false
};

const defaultRecurrence = {
  frequency: "weekly", interval_value: 1, generate_mode: "fixed_schedule",
  days_of_week: [], day_of_month: 1, ends_mode: "never", ends_at: "", max_occurrences: ""
};

const PRIORITY_STYLES = {
  "נמוכה": { active: "bg-blue-600 text-white border-blue-600", inactive: "border-blue-200 text-blue-600 hover:bg-blue-50" },
  "בינונית": { active: "bg-yellow-400 text-white border-yellow-400", inactive: "border-yellow-300 text-yellow-600 hover:bg-yellow-50" },
  "דחופה": { active: "bg-red-500 text-white border-red-500", inactive: "border-red-200 text-red-500 hover:bg-red-50" },
};

const STATUS_COLOR = { "פתוחה": "bg-blue-100 text-blue-700", "בטיפול": "bg-orange-100 text-orange-700", "הושלמה": "bg-green-100 text-green-700", "בוטלה": "bg-slate-100 text-slate-600", "ממתינה": "bg-purple-100 text-purple-700" };

// Multi-select debtors component (similar to MultiSelectAttendees)
function MultiSelectDebtors({ debtors = [], selected = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = debtors.filter((d) => {
    const q = search.toLowerCase();
    return !q || d.apartmentNumber?.includes(q) || d.ownerName?.toLowerCase().includes(q);
  });

  const isSelected = (d) => selected.some((s) => s.id === d.id);

  const toggle = (d) => {
    if (isSelected(d)) {
      onChange(selected.filter((s) => s.id !== d.id));
    } else {
      onChange([...selected, d]);
    }
  };

  const remove = (id) => onChange(selected.filter((s) => s.id !== id));

  return (
    <div className="relative" ref={ref} dir="rtl">
      <div
        className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 flex flex-wrap gap-1.5 cursor-text focus-within:ring-1 focus-within:ring-teal-400 focus-within:border-teal-400 transition-all"
        onClick={() => setOpen(true)}
      >
        {selected.map((d) => (
          <span key={d.id} className="inline-flex items-center gap-1 bg-teal-100 text-teal-800 text-xs font-medium px-2 py-0.5 rounded-full">
            <Home className="w-3 h-3" />
            דירה {d.apartmentNumber}{d.ownerName ? ` – ${d.ownerName}` : ""}
            <button type="button" onClick={(e) => { e.stopPropagation(); remove(d.id); }} className="hover:text-red-600 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {selected.length === 0 && (
          <span className="text-slate-400 text-sm flex items-center gap-1.5">
            <Home className="w-4 h-4" />
            קשר לדירה / דייר...
          </span>
        )}
      </div>

      {open && (
        <div className="absolute z-50 right-0 left-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                className="w-full pr-8 pl-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-400"
                placeholder="חפש דירה או בעל דירה..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">לא נמצאו תוצאות</p>
            ) : (
              filtered.map((d) => {
                const sel = isSelected(d);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggle(d)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-right hover:bg-slate-50 transition-colors ${sel ? "bg-teal-50" : ""}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${sel ? "bg-teal-600 border-teal-600" : "border-slate-300"}`}>
                      {sel && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">דירה {d.apartmentNumber}</p>
                      {d.ownerName && <p className="text-xs text-slate-400">{d.ownerName}</p>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-slate-100 text-xs text-slate-500 text-center">
              {selected.length} דירות נבחרו
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Date + Time Popover picker
function DateTimePicker({ value, onChange, placeholder = "בחר תאריך ושעה..." }) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("09:00");

  const selectedDate = value ? new Date(value) : undefined;

  const handleDaySelect = (day) => {
    if (!day) return;
    const [h, m] = time.split(":").map(Number);
    const dt = new Date(day);
    dt.setHours(h, m, 0, 0);
    onChange(dt.toISOString().slice(0, 16));
    setOpen(false);
  };

  const handleTimeChange = (t) => {
    setTime(t);
    if (selectedDate) {
      const [h, m] = t.split(":").map(Number);
      const dt = new Date(selectedDate);
      dt.setHours(h, m, 0, 0);
      onChange(dt.toISOString().slice(0, 16));
    }
  };

  const displayValue = selectedDate
    ? `${format(selectedDate, "dd/MM/yyyy")} ${format(selectedDate, "HH:mm")}`
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-10 flex items-center gap-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400 text-right"
          dir="rtl"
        >
          <CalendarIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className={displayValue ? "text-slate-800" : "text-slate-400"}>
            {displayValue || placeholder}
          </span>
          {value && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="mr-auto text-slate-400 hover:text-red-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" dir="rtl">
        <div className="p-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDaySelect}
            initialFocus
            locale={he}
          />
          <div className="border-t border-slate-100 pt-3 mt-1 flex items-center gap-2">
            <Label className="text-xs text-slate-600 flex-shrink-0">שעה:</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="h-8 text-sm flex-1"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function TaskProFormDialog({ open, onClose, task, currentUser, onSaved }) {
  const { currentUser: authUser } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);
  const [recurrence, setRecurrence] = useState(defaultRecurrence);
  const [attendees, setAttendees] = useState([]);
  const [selectedDebtors, setSelectedDebtors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [tempAttachments, setTempAttachments] = useState([]);

  const { data: appUsers = [] } = useQuery({
    queryKey: ["appUsers"],
    queryFn: () => base44.entities.AppUser.list(),
    enabled: open
  });
  const { data: templates = [] } = useQuery({
    queryKey: ["taskpro-templates"],
    queryFn: fetchTemplates,
    enabled: open
  });
  const { data: debtors = [] } = useQuery({
    queryKey: ["debtors"],
    queryFn: () => base44.entities.DebtorRecord.list(),
    enabled: open
  });

  const userOptions = appUsers.map((u) => ({
    username: u.username,
    name: u.email === "r@bios.co.il" ? "רונן משולם" : [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username,
    email: u.email
  }));

  useEffect(() => {
    if (!open) return;
    if (task) {
      setForm({
        title: task.title || "",
        task_type: task.task_type || "משימה כללית",
        status: task.status || "פתוחה",
        priority: task.priority || "נמוכה",
        description: task.description || "",
        due_at: task.due_at ? task.due_at.slice(0, 16) : "",
        debtor_record_id: task.debtor_record_id || "",
        apartment_number: task.apartment_number || "",
        owner_name: task.owner_name || "",
        source: task.source || "manual",
        template_id: task.template_id || "",
        is_recurring: false
      });
      fetchAttendees(task.id).then((list) =>
        setAttendees(list.map((a) => ({ username: a.user_username, name: a.user_name, email: a.user_email })))
      );
      fetchComments(task.id).then(setComments);
      fetchAttachments(task.id).then(setAttachments);
      // set selectedDebtors from task
      if (task.debtor_record_id) {
        const d = debtors.find((x) => x.id === task.debtor_record_id);
        if (d) setSelectedDebtors([d]);
      }
    } else {
      setForm(defaultForm);
      setAttendees([]);
      setComments([]);
      setAttachments([]);
      setTempAttachments([]);
      setSelectedDebtors([]);
    }
    setRecurrence(defaultRecurrence);
  }, [open, task?.id]);

  const setF = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setR = (key, val) => setRecurrence((r) => ({ ...r, [key]: val }));

  const handleTemplateChange = (id) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setForm((f) => ({
      ...f,
      template_id: id,
      priority: t.default_priority || f.priority,
      status: t.default_status || f.status,
      description: t.default_description || f.description,
      source: "template",
      due_at: t.due_days_from_now ?
        new Date(Date.now() + t.due_days_from_now * 86400000).toISOString().slice(0, 16) :
        f.due_at
    }));
  };

  const typeError = !form.task_type ? "סוג משימה חובה" : null;

  const handleSave = async () => {
    if (typeError) return;
    setSaving(true);

    const actor = {
      username: currentUser?.username || "",
      name: currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name || ""}`.trim() : currentUser?.username || ""
    };

    const primaryDebtor = selectedDebtors[0];

    const payload = {
      title: form.task_type,
      task_type: form.task_type,
      status: task ? form.status : "פתוחה",
      priority: form.priority,
      description: form.description,
      assigned_by: actor.username,
      assigned_by_name: actor.name,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      debtor_record_id: primaryDebtor?.id || null,
      apartment_number: primaryDebtor?.apartmentNumber || "",
      owner_name: primaryDebtor?.ownerName || "",
      source: form.source,
      template_id: form.template_id || null,
      manual_order: task?.manual_order || 0
    };

    try {
      let saved;
      if (task) {
        // עדכון — במקביל: עדכון + activity
        [saved] = await Promise.all([
          updateTask(task.id, payload),
          logActivity(task.id, "updated", actor, { changes: "עדכון משימה" })
        ]);
        saved = saved || { ...task, ...payload, id: task.id };
      } else {
        saved = await createTask(payload);

        // כל הפעולות הנלוות במקביל
        const parallelOps = [
          logActivity(saved.id, "created", actor),
          replaceAttendees(saved.id, attendees),
        ];

        // התראות לכל משתתף (לא לעצמנו אלא אם רוצים)
        const notifTargets = [...attendees];
        notifTargets.forEach((a) => {
          if (a.username) {
            parallelOps.push(
              base44.entities.Notification.create({
                user_username: a.username,
                type: "task_pro_assigned",
                message: `הוקצתה לך משימה: ${form.task_type}${primaryDebtor?.apartmentNumber ? ` – דירה ${primaryDebtor.apartmentNumber}` : ""}`,
                task_pro_id: saved.id,
                task_type: form.task_type,
                assigner_name: actor.name || actor.username,
                is_read: false
              }).catch(() => {})
            );
          }
        });

        // קובצי temp במקביל
        if (tempAttachments.length > 0) {
          const fileUser = { username: authUser?.username, name: authUser?.first_name ? `${authUser.first_name} ${authUser.last_name || ""}` : authUser?.username };
          tempAttachments.forEach((att) => {
            parallelOps.push(
              uploadAttachment(saved.id, att.file, fileUser).catch((e) => console.error("upload error", e))
            );
          });
        }

        // כלל מחזוריות
        if (form.is_recurring) {
          const startDate = form.due_at ? new Date(form.due_at) : new Date();
          parallelOps.push(
            createRule({
              title: form.task_type,
              frequency: recurrence.frequency,
              interval_value: recurrence.interval_value || 1,
              days_of_week_json: recurrence.frequency === "weekly" ? JSON.stringify(recurrence.days_of_week) : null,
              day_of_month: recurrence.frequency === "monthly" ? recurrence.day_of_month : null,
              starts_at: startDate.toISOString(),
              ends_mode: recurrence.ends_mode,
              ends_at: recurrence.ends_at ? new Date(recurrence.ends_at).toISOString() : null,
              max_occurrences: recurrence.max_occurrences ? parseInt(recurrence.max_occurrences) : null,
              generate_mode: recurrence.generate_mode,
              next_run_at: startDate.toISOString(),
              template_task_title: form.task_type,
              template_priority: form.priority,
              template_description: form.description,
              debtor_record_id: primaryDebtor?.id || null,
              apartment_number: primaryDebtor?.apartmentNumber || "",
              owner_name: primaryDebtor?.ownerName || "",
              created_by: actor.username,
              created_by_name: actor.name
            }).catch((e) => console.error("rule error", e))
          );
        }

        await Promise.all(parallelOps);
        setTempAttachments([]);
      }

      // עדכון משתתפים בעריכה
      if (task) {
        await replaceAttendees(saved.id || task.id, attendees);
      }

      queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["taskpro-rules"] });
      onSaved?.(saved);
      setSaving(false);
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("שגיאה בשמירת המשימה");
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;
    setLoadingComment(true);
    try {
      const c = await createComment(task.id, newComment, {
        username: authUser?.username,
        name: authUser?.first_name ? `${authUser.first_name} ${authUser.last_name || ""}` : authUser?.username
      });
      setComments((prev) => [...prev, c]);
      setNewComment("");
    } catch (e) {
      toast.error("שגיאה בהוספת הערה");
    } finally {
      setLoadingComment(false);
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !task) return;
    setUploadingFile(true);
    try {
      for (const file of files) {
        const att = await uploadAttachment(task.id, file, {
          username: authUser?.username,
          name: authUser?.first_name ? `${authUser.first_name} ${authUser.last_name || ""}` : authUser?.username
        });
        setAttachments((prev) => [...prev, att]);
      }
      toast.success("קבצים צורפו בהצלחה");
    } catch (e) {
      toast.error("שגיאה בצירוף קובץ");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (id) => {
    try {
      await deleteAttachment(id);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      toast.error("שגיאה במחיקת קובץ");
    }
  };

  const isEdit = !!task;
  const MAX_FILES = 5;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[720px] h-[900px] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl" dir="rtl">
        <DialogTitle className="hidden">{isEdit ? "עריכת משימה" : "משימה חדשה"}</DialogTitle>

        {/* Header */}
        <div className="bg-gradient-to-l from-blue-600 to-blue-700 px-6 py-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-white">{isEdit ? "עריכת משימה" : "משימה חדשה"}</h2>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden bg-slate-50 flex flex-col">
          {isEdit ? (
            /* Tabs in Edit Mode */
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-0 border-b border-slate-200 bg-white px-6">
                {["details", "attendees", "comments", "attachments"].map((tab) =>
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-colors relative ${
                      activeTab === tab ? "text-blue-600 border-b-2 border-blue-600 -mb-px" : "text-slate-600 hover:text-slate-900 border-b-2 border-transparent"
                    }`}
                  >
                    {tab === "details" && <><ClipboardList className="w-4 h-4" /> פרטי משימה</>}
                    {tab === "attendees" && <><Users className="w-4 h-4" /> משתתפים</>}
                    {tab === "comments" && <><MessageSquare className="w-4 h-4" /> הערות ({comments.length})</>}
                    {tab === "attachments" && <><Paperclip className="w-4 h-4" /> קבצים ({attachments.length})</>}
                  </button>
                )}
              </div>

              {activeTab === "details" && (
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-blue-500 rounded-full inline-block"></span>
                      פרטי המשימה
                    </p>
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">סוג משימה <span className="text-red-500">*</span></Label>
                      <Select value={form.task_type} onValueChange={(v) => setF("task_type", v)}>
                        <SelectTrigger className="h-10 bg-slate-50"><SelectValue /></SelectTrigger>
                        <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">תיאור <span className="text-slate-400 text-xs font-normal">(אופציונלי)</span></Label>
                      <Textarea className="min-h-[80px] resize-none bg-slate-50 focus:bg-white transition-colors" placeholder="פרט את המשימה..." value={form.description} onChange={(e) => setF("description", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">סטטוס</Label>
                      <Select value={form.status} onValueChange={(v) => setF("status", v)}>
                        <SelectTrigger className="h-10 bg-slate-50"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "attendees" && (
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-indigo-500 rounded-full inline-block"></span>
                      משתתפים נוספים
                    </p>
                    <MultiSelectAttendees users={userOptions} selected={attendees} onChange={setAttendees} />
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-teal-500 rounded-full inline-block"></span>
                      קישור לדירה / דייר
                    </p>
                    <MultiSelectDebtors debtors={debtors} selected={selectedDebtors} onChange={setSelectedDebtors} />
                  </div>
                </div>
              )}

              {activeTab === "comments" && (
                <div className="flex-1 overflow-y-auto p-0">
                  <div className="px-6 py-5 space-y-3 h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto space-y-2">
                      {comments.length === 0 ? <p className="text-xs text-slate-400">אין הערות עדיין</p> :
                        comments.map((c) => (
                          <div key={c.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                            <span className="text-xs font-semibold text-slate-700">{c.created_by_name || c.created_by_username}</span>
                            <p className="text-sm text-slate-700 mt-1">{c.comment_text}</p>
                          </div>
                        ))
                      }
                    </div>
                    <div className="space-y-2 border-t border-slate-200 pt-3">
                      <textarea className="w-full rounded-lg border border-slate-300 p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" rows={2} placeholder="הוסף הערה..." value={newComment} onChange={(e) => setNewComment(e.target.value)} dir="rtl" />
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8 w-full" disabled={!newComment.trim() || loadingComment} onClick={handleAddComment}>
                        {loadingComment ? "שולח..." : "הוסף הערה"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "attachments" && (
                <div className="flex-1 overflow-y-auto p-0">
                  <div className="px-6 py-5 space-y-3 h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto space-y-1">
                      {attachments.length === 0 ? <p className="text-xs text-slate-400">אין קבצים</p> :
                        attachments.map((a) => (
                          <div key={a.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                            <a href={a.file_url} target="_blank" rel="noreferrer" className="flex-1 text-xs text-blue-600 hover:underline truncate">{a.file_display_name || a.file_name}</a>
                            <button onClick={() => handleDeleteAttachment(a.id)} className="text-xs text-red-500 hover:text-red-700">×</button>
                          </div>
                        ))
                      }
                    </div>
                    <div className="border-t border-slate-200 pt-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                        <Paperclip className="w-3 h-3" />
                        {uploadingFile ? "מעלה..." : "צרף קבצים"}
                        <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploadingFile} />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* New task form */
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Template picker */}
              {templates.length > 0 && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                  <Label className="text-sm font-semibold text-violet-700 mb-2 block">בחר תבנית (אופציונלי)</Label>
                  <Select value={form.template_id} onValueChange={handleTemplateChange}>
                    <SelectTrigger className="h-10 bg-white border-violet-200">
                      <SelectValue placeholder="בחר תבנית..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* פרטי משימה */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-blue-500 rounded-full inline-block"></span>
                  פרטי המשימה
                </p>

                {/* סוג משימה - חובה */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5 block">סוג משימה <span className="text-red-500">*</span></Label>
                  <Select value={form.task_type} onValueChange={(v) => setF("task_type", v)}>
                    <SelectTrigger className="h-10 bg-slate-50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* תיאור */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    תיאור <span className="text-slate-400 text-xs font-normal">(אופציונלי)</span>
                  </Label>
                  <Textarea
                    className="min-h-[70px] resize-none bg-slate-50 focus:bg-white transition-colors"
                    placeholder="פרט את המשימה, הערות חשובות..."
                    value={form.description}
                    onChange={(e) => setF("description", e.target.value)}
                  />
                </div>

                {/* עדיפות */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">דחיפות <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setF("priority", p)}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                          form.priority === p ? PRIORITY_STYLES[p].active : PRIORITY_STYLES[p].inactive
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* תאריך יעד */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    תאריך יעד <span className="text-slate-400 text-xs font-normal">(אופציונלי)</span>
                  </Label>
                  <DateTimePicker
                    value={form.due_at}
                    onChange={(val) => setF("due_at", val)}
                  />
                </div>
              </div>

              {/* משתתפים + דיירים */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-500 rounded-full inline-block"></span>
                  משתתפים וקישורים
                </p>
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5 block">משתתפים נוספים</Label>
                  <MultiSelectAttendees users={userOptions} selected={attendees} onChange={setAttendees} />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5 block">קישור לדירה / דייר</Label>
                  <MultiSelectDebtors debtors={debtors} selected={selectedDebtors} onChange={setSelectedDebtors} />
                </div>
              </div>

              {/* קבצים מצורפים */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-cyan-500 rounded-full inline-block"></span>
                  תמונות <span className="text-slate-400 text-xs font-normal">(עד {MAX_FILES})</span>
                </p>

                {tempAttachments.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {tempAttachments.map((att, idx) => (
                      <div key={idx} className="relative group bg-slate-50 rounded-lg border border-slate-200 p-2 flex items-center gap-2">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-xs text-slate-600 truncate flex-1">{att.file.name}</span>
                        <button
                          onClick={() => setTempAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-xs text-red-500 hover:text-red-700 font-bold flex-shrink-0"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}

                {tempAttachments.length < MAX_FILES && (
                  <label className="w-full flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-green-300 rounded-xl py-6 bg-green-50 hover:bg-green-100 transition-colors">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Upload className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-sm font-semibold text-green-700">בחר מגלריה</span>
                    <span className="text-xs text-green-500">{tempAttachments.length}/{MAX_FILES} תמונות</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.xlsx,.xls,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const remaining = MAX_FILES - tempAttachments.length;
                        const toAdd = files.slice(0, remaining).map((f) => ({ file: f, name: f.name }));
                        setTempAttachments((prev) => [...prev, ...toAdd]);
                      }}
                    />
                  </label>
                )}
              </div>

              {/* מחזוריות */}
              <div className={`rounded-xl border p-5 space-y-4 transition-colors ${form.is_recurring ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Repeat2 className={`w-4 h-4 ${form.is_recurring ? "text-blue-600" : "text-slate-400"}`} />
                    <p className={`text-sm font-bold ${form.is_recurring ? "text-blue-700" : "text-slate-700"}`}>משימה מחזורית</p>
                  </div>
                  <Switch checked={form.is_recurring} onCheckedChange={(v) => setF("is_recurring", v)} />
                </div>

                {form.is_recurring && (
                  <div className="space-y-3 pt-1">
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
                        <Input type="number" min={1} className="h-9 bg-white" value={recurrence.interval_value} onChange={(e) => setR("interval_value", parseInt(e.target.value) || 1)} />
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
                                const days = recurrence.days_of_week.includes(d.key) ?
                                  recurrence.days_of_week.filter((x) => x !== d.key) :
                                  [...recurrence.days_of_week, d.key];
                                setR("days_of_week", days);
                              }}
                              className={`w-9 h-9 rounded-full text-xs font-semibold transition-all border ${recurrence.days_of_week.includes(d.key) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-blue-50"}`}
                            >{d.label}</button>
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
                    {recurrence.ends_mode === "on_date" && <Input type="date" className="h-9 bg-white" value={recurrence.ends_at} onChange={(e) => setR("ends_at", e.target.value)} />}
                    {recurrence.ends_mode === "after_count" && <Input type="number" min={1} className="h-9 w-28 bg-white" placeholder="מס' פעמים" value={recurrence.max_occurrences} onChange={(e) => setR("max_occurrences", e.target.value)} />}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-white flex-shrink-0">
          <p className="text-xs text-red-500">{typeError || ""}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving} className="h-10 px-5">ביטול</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6 font-semibold"
              onClick={handleSave}
              disabled={saving || !!typeError}
            >
              {saving ? "שומר..." : isEdit ? "שמור שינויים" : "צור משימה"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}