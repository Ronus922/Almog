import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X, ClipboardList, Repeat2, MessageSquare, Paperclip } from "lucide-react";
import MultiSelectAttendees from "./MultiSelectAttendees";
import DebtorSelectSearch from "./DebtorSelectSearch";
import { createTask, updateTask, replaceAttendees, fetchTemplates, fetchAttendees, logActivity, createRule, fetchComments, createComment, fetchAttachments, uploadAttachment, deleteAttachment } from "./taskProApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthContext";

const TASK_TYPES = ["שיחת טלפון", "שליחת מכתב התראה", "פגישה", "מעקב תשלום", "הגשת תביעה", "משימה כללית", "אחר"];
const PRIORITIES = ["גבוהה", "בינונית", "נמוכה"];
const STATUSES = ["פתוחה", "בטיפול", "ממתינה", "הושלמה", "בוטלה"];
const FREQ_LABELS = { daily: "יומי", weekly: "שבועי", monthly: "חודשי", yearly: "שנתי" };
const DAYS_HE = [
  { key: "sunday", label: "א'" }, { key: "monday", label: "ב'" }, { key: "tuesday", label: "ג'" },
  { key: "wednesday", label: "ד'" }, { key: "thursday", label: "ה'" }, { key: "friday", label: "ו'" }, { key: "saturday", label: "ש'" },
];

const defaultForm = {
  title: "", task_type: "שיחת טלפון", status: "פתוחה", priority: "בינונית",
  description: "", due_at: "",
  debtor_record_id: "", apartment_number: "", owner_name: "",
  source: "manual", template_id: "", is_recurring: false,
};

const defaultRecurrence = {
  frequency: "weekly", interval_value: 1, generate_mode: "fixed_schedule",
  days_of_week: [], day_of_month: 1, ends_mode: "never", ends_at: "", max_occurrences: "",
};

const PRIORITY_COLOR = { "גבוהה": "bg-red-100 text-red-700", "בינונית": "bg-yellow-100 text-yellow-700", "נמוכה": "bg-green-100 text-green-700" };
const STATUS_COLOR = { "פתוחה": "bg-blue-100 text-blue-700", "בטיפול": "bg-orange-100 text-orange-700", "הושלמה": "bg-green-100 text-green-700", "בוטלה": "bg-slate-100 text-slate-600", "ממתינה": "bg-purple-100 text-purple-700" };

export default function TaskProFormDialog({ open, onClose, task, currentUser, onSaved }) {
  const { currentUser: authUser } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);
  const [recurrence, setRecurrence] = useState(defaultRecurrence);
  const [attendees, setAttendees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

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
      fetchComments(task.id).then(setComments);
      fetchAttachments(task.id).then(setAttachments);
    } else {
      setForm(defaultForm);
      setAttendees([]);
      setComments([]);
      setAttachments([]);
    }
    setRecurrence(defaultRecurrence);
  }, [open, task?.id]);

  const setF = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setR = (key, val) => setRecurrence((r) => ({ ...r, [key]: val }));

  const handleDebtorChange = (id) => {
    const d = debtors.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      debtor_record_id: id || "",
      apartment_number: d?.apartmentNumber || "",
      owner_name: d?.ownerName || "",
    }));
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
      status: task ? form.status : "פתוחה",
      priority: form.priority,
      description: form.description,
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

    await replaceAttendees(saved.id, attendees);

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

  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;
    setLoadingComment(true);
    try {
      const c = await createComment(task.id, newComment, {
        username: authUser?.username,
        name: authUser?.first_name ? `${authUser.first_name} ${authUser.last_name || ""}` : authUser?.username,
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
    const file = e.target.files?.[0];
    if (!file || !task) return;
    setUploadingFile(true);
    try {
      const att = await uploadAttachment(task.id, file, {
        username: authUser?.username,
        name: authUser?.first_name ? `${authUser.first_name} ${authUser.last_name || ""}` : authUser?.username,
      });
      setAttachments((prev) => [...prev, att]);
      toast.success("קובץ צורף בהצלחה");
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl" dir="rtl">
        
        {/* Header */}
        <div className="bg-gradient-to-l from-blue-600 to-blue-700 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{isEdit ? "עריכת משימה" : "משימה חדשה"}</h2>
                {isEdit && form.title && (
                  <p className="text-blue-200 text-sm mt-0.5 truncate max-w-xs">{form.title}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEdit && (
                <>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[form.status]}`}>{form.status}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PRIORITY_COLOR[form.priority]}`}>{form.priority}</span>
                </>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 transition-colors flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden bg-slate-50 flex flex-col">
          {isEdit ? (
            /* Tabs in Edit Mode */
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start gap-1 bg-white border-b border-slate-200 p-0 h-auto rounded-none px-6">
                <TabsTrigger value="details" className="rounded-t-lg gap-1.5">
                  <ClipboardList className="w-4 h-4" />
                  פרטי משימה
                </TabsTrigger>
                <TabsTrigger value="comments" className="rounded-t-lg gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  הערות ({comments.length})
                </TabsTrigger>
                <TabsTrigger value="attachments" className="rounded-t-lg gap-1.5">
                  <Paperclip className="w-4 h-4" />
                  קבצים ({attachments.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex-1 overflow-y-auto px-6 py-5 space-y-5 m-0">
                {/* Content in details tab */}
                <div className="space-y-5">
                  {/* פרטי משימה */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-blue-500 rounded-full inline-block"></span>
                      פרטי המשימה
                    </p>

                    {/* כותרת - חובה */}
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                        כותרת המשימה <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        className="h-10 bg-slate-50 focus:bg-white transition-colors"
                        placeholder="הזן כותרת מתארת..."
                        value={form.title}
                        onChange={(e) => setF("title", e.target.value)}
                      />
                    </div>

                    {/* תיאור */}
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                        תיאור <span className="text-slate-400 text-xs font-normal">(אופציונלי)</span>
                      </Label>
                      <Textarea
                        className="min-h-[80px] resize-none bg-slate-50 focus:bg-white transition-colors"
                        placeholder="פרט את המשימה, הערות חשובות..."
                        value={form.description}
                        onChange={(e) => setF("description", e.target.value)}
                      />
                    </div>

                    {/* סוג משימה */}
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">סוג משימה <span className="text-red-500">*</span></Label>
                      <Select value={form.task_type} onValueChange={(v) => setF("task_type", v)}>
                        <SelectTrigger className="h-10 bg-slate-50"><SelectValue /></SelectTrigger>
                        <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    {/* עדיפות - תגית בלבד */}
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-2 block">עדיפות</Label>
                      <Badge className={`text-xs font-semibold px-3 py-1.5 ${PRIORITY_COLOR[form.priority]}`}>
                        {form.priority}
                      </Badge>
                    </div>

                    {/* סטטוס */}
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">סטטוס</Label>
                      <Select value={form.status} onValueChange={(v) => setF("status", v)}>
                        <SelectTrigger className="h-10 bg-slate-50"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    {/* תאריך יעד */}
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                        תאריך יעד <span className="text-slate-400 text-xs font-normal">(אופציונלי)</span>
                      </Label>
                      <Input
                        type="datetime-local"
                        className="h-10 bg-slate-50 focus:bg-white transition-colors"
                        value={form.due_at}
                        onChange={(e) => setF("due_at", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* משתתפים */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-indigo-500 rounded-full inline-block"></span>
                      משתתפים
                    </p>
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">משתתפים נוספים</Label>
                      <MultiSelectAttendees
                        users={userOptions}
                        selected={attendees}
                        onChange={setAttendees}
                      />
                    </div>
                  </div>

                  {/* קישור לדייר */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-teal-500 rounded-full inline-block"></span>
                      קישור לדירה / דייר
                    </p>
                    <DebtorSelectSearch
                      debtors={debtors}
                      value={form.debtor_record_id}
                      onChange={handleDebtorChange}
                    />
                    {form.apartment_number && (
                      <div className="flex items-center gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                        <span className="font-semibold">דירה {form.apartment_number}</span>
                        {form.owner_name && <span className="text-teal-500">– {form.owner_name}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="comments" className="flex-1 overflow-y-auto p-0 m-0">
                <div className="px-6 py-5 space-y-3 h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {comments.length === 0 ? (
                      <p className="text-xs text-slate-400">אין הערות עדיין</p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-700">{c.created_by_name || c.created_by_username}</span>
                          </div>
                          <p className="text-sm text-slate-700">{c.comment_text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add comment */}
                  <div className="space-y-2 border-t border-slate-200 pt-3">
                    <textarea
                      className="w-full rounded-lg border border-slate-300 p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                      rows={2}
                      placeholder="הוסף הערה..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      dir="rtl"
                    />
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white h-8 w-full"
                      disabled={!newComment.trim() || loadingComment}
                      onClick={handleAddComment}
                    >
                      {loadingComment ? "שולח..." : "הוסף הערה"}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="attachments" className="flex-1 overflow-y-auto p-0 m-0">
                <div className="px-6 py-5 space-y-3 h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto space-y-1">
                    {attachments.length === 0 ? (
                      <p className="text-xs text-slate-400">אין קבצים</p>
                    ) : (
                      attachments.map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                          <a
                            href={a.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 text-xs text-blue-600 hover:underline truncate"
                          >
                            {a.file_display_name || a.file_name}
                          </a>
                          <button
                            onClick={() => handleDeleteAttachment(a.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Upload file */}
                  <div className="border-t border-slate-200 pt-3">
                    <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                      <Paperclip className="w-3 h-3" />
                      {uploadingFile ? "מעלה..." : "צרף קובץ"}
                      <input type="file" className="hidden" onChange={handleUpload} disabled={uploadingFile} />
                    </label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            /* Non-Edit Mode - Original Layout */
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Template picker */}
          {!isEdit && templates.length > 0 && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <Label className="text-sm font-semibold text-violet-700 mb-2 block">בחר תבנית (אופציונלי)</Label>
              <Select value={form.template_id} onValueChange={handleTemplateChange}>
                <SelectTrigger className="h-10 bg-white border-violet-200">
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

          {/* פרטי משימה */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-500 rounded-full inline-block"></span>
              פרטי המשימה
            </p>

            {/* כותרת - חובה */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                כותרת המשימה <span className="text-red-500">*</span>
              </Label>
              <Input
                className="h-10 bg-slate-50 focus:bg-white transition-colors"
                placeholder="הזן כותרת מתארת..."
                value={form.title}
                onChange={(e) => setF("title", e.target.value)}
              />
            </div>

            {/* תיאור - לא חובה */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                תיאור <span className="text-slate-400 text-xs font-normal">(אופציונלי)</span>
              </Label>
              <Textarea
                className="min-h-[80px] resize-none bg-slate-50 focus:bg-white transition-colors"
                placeholder="פרט את המשימה, הערות חשובות..."
                value={form.description}
                onChange={(e) => setF("description", e.target.value)}
              />
            </div>

            {/* סוג משימה */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">סוג משימה <span className="text-red-500">*</span></Label>
              <Select value={form.task_type} onValueChange={(v) => setF("task_type", v)}>
                <SelectTrigger className="h-10 bg-slate-50"><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* עדיפות - תגית בלבד */}
            {!isEdit && (
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">עדיפות</Label>
                <div className="flex gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      onClick={() => setF("priority", p)}
                      className={`transition-all px-3 py-1.5 rounded-lg text-xs font-semibold border-2 ${
                        form.priority === p
                          ? PRIORITY_COLOR[p] + " border-current"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isEdit && (
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">עדיפות</Label>
                <Badge className={`text-xs font-semibold px-3 py-1.5 ${PRIORITY_COLOR[form.priority]}`}>
                  {form.priority}
                </Badge>
              </div>
            )}

            {/* סטטוס - רק בעריכה */}
            {isEdit && (
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">סטטוס</Label>
                <Select value={form.status} onValueChange={(v) => setF("status", v)}>
                  <SelectTrigger className="h-10 bg-slate-50"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {/* תאריך יעד */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                תאריך יעד <span className="text-slate-400 text-xs font-normal">(אופציונלי)</span>
              </Label>
              <Input
                type="datetime-local"
                className="h-10 bg-slate-50 focus:bg-white transition-colors"
                value={form.due_at}
                onChange={(e) => setF("due_at", e.target.value)}
              />
            </div>
          </div>

          {/* משתתפים */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-500 rounded-full inline-block"></span>
              משתתפים
            </p>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-1.5 block">משתתפים נוספים</Label>
              <MultiSelectAttendees
                users={userOptions}
                selected={attendees}
                onChange={setAttendees}
              />
            </div>
          </div>

          {/* קישור לדייר */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-teal-500 rounded-full inline-block"></span>
              קישור לדירה / דייר
            </p>
            <DebtorSelectSearch
              debtors={debtors}
              value={form.debtor_record_id}
              onChange={handleDebtorChange}
            />
            {form.apartment_number && (
              <div className="flex items-center gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                <span className="font-semibold">דירה {form.apartment_number}</span>
                {form.owner_name && <span className="text-teal-500">– {form.owner_name}</span>}
              </div>
            )}
          </div>

          {/* מחזוריות (רק ביצירה) */}
          {!isEdit && (
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-white flex-shrink-0">
          <p className="text-xs text-slate-400">
            {!form.title.trim() ? "נדרשת כותרת למשימה" : ""}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving} className="h-10 px-5">
              ביטול
            </Button>
            {isEdit && form.status !== "הושלמה" && (
              <Button
                variant="outline"
                className="h-10 px-5 text-green-600 border-green-300 hover:bg-green-50"
                onClick={async () => {
                  setSaving(true);
                  try {
                    await updateTask(task.id, { status: "הושלמה", completed_at: new Date().toISOString() });
                    const actor = {
                      username: currentUser?.username || "",
                      name: currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name || ""}`.trim() : currentUser?.username || "",
                    };
                    await logActivity(task.id, "completed", actor);
                    queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
                    setSaving(false);
                    onClose();
                  } catch (e) {
                    setSaving(false);
                    toast.error("שגיאה בסימון כהושלמה");
                  }
                }}
                disabled={saving}
              >
                סמן כהושלמה
              </Button>
            )}
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6 font-semibold"
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
            >
              {saving ? "שומר..." : isEdit ? "שמור שינויים" : "צור משימה"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}