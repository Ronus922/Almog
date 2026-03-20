import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  AlertCircle, Search, CheckCircle2, Clock, Trash2,
  MapPin, User, Calendar, Upload, Camera, Video, VideoIcon, X, Plus, Filter, GripVertical, Eye, Pencil, ChevronLeft, ChevronRight
} from "lucide-react";
import { format } from "date-fns";

const PRIORITY_MAP = {
  low:    { label: "נמוכה",   dot: "bg-slate-400" },
  medium: { label: "בינונית", dot: "bg-blue-400" },
  high:   { label: "גבוהה",   dot: "bg-orange-400" },
  urgent: { label: "דחוף",    dot: "bg-red-500" },
};

const COLUMNS = [
  { id: "open",        label: "פתוחה",   color: "border-t-blue-400",   headerBg: "bg-blue-50",   count_color: "bg-blue-100 text-blue-700" },
  { id: "in_progress", label: "בטיפול",  color: "border-t-amber-400",  headerBg: "bg-amber-50",  count_color: "bg-amber-100 text-amber-700" },
  { id: "resolved",    label: "הושלמה",  color: "border-t-green-400",  headerBg: "bg-green-50",  count_color: "bg-green-100 text-green-700" },
];

// ---- Dialog Form ----
function ReportIssueDialog({ open, onClose, onSuccess, onNotify }) {
  const [form, setForm] = useState({ target_type: "room", target_id: "", priority: "medium", description: "", assigned_to: [], searchUser: "" });
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: areas = [] } = useQuery({ queryKey: ["areas"], queryFn: () => base44.entities.Area.list() });
  const { data: appUsers = [] } = useQuery({ queryKey: ["appUsers"], queryFn: () => base44.entities.AppUser.list() });

  const rooms = Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1), name: `חדר ${i + 1}` }));
  const targetOptions = form.target_type === "room"
    ? rooms
    : areas.filter((a) => a.active !== false).map((a) => ({ id: a.id, name: a.name }));

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) { setError("ניתן להעלות עד 5 תמונות"); return; }
    setUploadingImages(true); setError("");
    const urls = [];
    for (const file of files) { const { file_url } = await base44.integrations.Core.UploadFile({ file }); urls.push(file_url); }
    setImages((p) => [...p, ...urls]); setUploadingImages(false); e.target.value = "";
  };

  const handleVideoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (videos.length + files.length > 3) { setError("ניתן להעלות עד 3 סרטונים"); return; }
    setUploadingVideos(true); setError("");
    const urls = [];
    for (const file of files) { const { file_url } = await base44.integrations.Core.UploadFile({ file }); urls.push(file_url); }
    setVideos((p) => [...p, ...urls]); setUploadingVideos(false); e.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.target_id || !form.description.trim()) { setError("יש למלא את כל השדות הנדרשים"); return; }
    setSaving(true); setError("");
    const newIssue = await base44.entities.IssueReport.create({ ...form, images, videos, status: "open" });
    if (form.assigned_to?.length > 0) {
      onNotify(`תקלה חדשה בחדר ${form.target_id} שוייכה ל${form.assigned_to.length} משתמשים`);
    }
    setSaving(false);
    setForm({ target_type: "room", target_id: "", priority: "medium", description: "", assigned_to: [], searchUser: "" });
    setImages([]); setVideos([]);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-slate-800">דיווח על תקלה</DialogTitle>
              <p className="text-sm text-slate-400 mt-0.5">דווח על בעיה או תקלה שזקוקה לטיפול</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">סוג מיקום *</label>
              <Select value={form.target_type} onValueChange={(v) => setForm((p) => ({ ...p, target_type: v, target_id: "" }))}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 font-medium"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="room">חדר</SelectItem>
                  <SelectItem value="area">אזור</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">{form.target_type === "room" ? "מספר חדר *" : "אזור *"}</label>
              <Select value={form.target_id} onValueChange={(v) => setForm((p) => ({ ...p, target_id: v }))}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 font-medium">
                  <SelectValue placeholder={form.target_type === "room" ? "...בחר חדר" : "...בחר אזור"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {targetOptions.map((opt) => <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">דחיפות *</label>
              <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 font-medium"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">נמוכה</SelectItem>
                  <SelectItem value="medium">בינונית</SelectItem>
                  <SelectItem value="high">גבוהה</SelectItem>
                  <SelectItem value="urgent">דחוף</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">שתף עם</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-right font-medium text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-between">
                    <span className="text-xs text-slate-400">▼</span>
                    {form.assigned_to?.length > 0 ? (
                      <span className="text-sm">{form.assigned_to.length} משתמשים</span>
                    ) : (
                      <span className="text-sm text-slate-400">בחר משתמשים...</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" dir="rtl">
                  <div className="p-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-700 text-right">משתמשים</h3>
                    <Input
                      placeholder="חפש משתמש..."
                      className="h-10 rounded-lg border-slate-200 bg-slate-50 text-right text-sm"
                      onChange={(e) => setForm((p) => ({ ...p, searchUser: e.target.value }))}
                    />
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {appUsers
                        .filter((u) =>
                          u.first_name?.includes(form.searchUser || "") ||
                          u.username?.includes(form.searchUser || "")
                        )
                        .map((u) => (
                          <div
                            key={u.id}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                            onClick={() =>
                              setForm((p) => ({
                                ...p,
                                assigned_to: form.assigned_to?.includes(u.username)
                                  ? p.assigned_to.filter((x) => x !== u.username)
                                  : [...(p.assigned_to || []), u.username],
                              }))
                            }
                          >
                            <Checkbox
                              checked={form.assigned_to?.includes(u.username) || false}
                              onCheckedChange={() => {
                                setForm((p) => ({
                                  ...p,
                                  assigned_to: form.assigned_to?.includes(u.username)
                                    ? p.assigned_to.filter((x) => x !== u.username)
                                    : [...(p.assigned_to || []), u.username],
                                }));
                              }}
                            />
                            <div className="w-6 h-6 rounded-full bg-blue-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {u.first_name?.[0] || "?"}
                            </div>
                            <div className="flex-1 text-right">
                              <p className="text-sm font-medium text-slate-700">{u.first_name} {u.last_name || ""}</p>
                              <p className="text-xs text-slate-400">{u.username}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                    {form.assigned_to?.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 space-y-1">
                        <p className="text-xs font-semibold text-slate-600 text-right">נבחרו:</p>
                        <div className="flex flex-wrap gap-1">
                          {form.assigned_to.map((username) => {
                            const user = appUsers.find((u) => u.username === username);
                            return (
                              <div key={username} className="flex items-center gap-1 bg-blue-100 rounded-lg px-2 py-1">
                                <span className="text-xs text-blue-700 font-medium">{user?.first_name}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((p) => ({
                                      ...p,
                                      assigned_to: p.assigned_to.filter((u) => u !== username),
                                    }))
                                  }
                                  className="text-blue-400 hover:text-blue-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">תיאור התקלה *</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="תאר את התקלה בפירוט... מה הבעיה? איפה בדיוק?"
              className="rounded-xl border-slate-200 bg-slate-50 min-h-[100px] resize-none text-right text-sm"
              dir="rtl"
            />
          </div>

          {/* תמונות */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">תמונות <span className="font-normal text-slate-400">(עד 5)</span></label>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="w-14 h-14 object-cover rounded-xl border border-slate-200" />
                    <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${images.length >= 5 ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-green-300 hover:bg-green-50/40'}`}>
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center"><Upload className="w-4 h-4 text-green-500" /></div>
                <span className="text-sm font-semibold text-slate-700">בחר מגלריה</span>
                <span className="text-xs text-slate-400">{images.length}/5 תמונות</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImages || images.length >= 5} />
              </label>
              <label className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${images.length >= 5 ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-blue-300 hover:bg-blue-50/40'}`}>
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center"><Camera className="w-4 h-4 text-blue-500" /></div>
                <span className="text-sm font-semibold text-slate-700">צלם תמונה</span>
                <span className="text-xs text-slate-400">פתח מצלמה</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={uploadingImages || images.length >= 5} />
              </label>
            </div>
            {uploadingImages && <p className="text-xs text-blue-500 text-center">מעלה תמונות...</p>}
          </div>

          {/* סרטונים */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">סרטונים <span className="font-normal text-slate-400">(עד 3)</span></label>
            {videos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {videos.map((url, i) => (
                  <div key={i} className="relative w-14 h-14 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center">
                    <VideoIcon className="w-5 h-5 text-slate-400" />
                    <button type="button" onClick={() => setVideos((p) => p.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${videos.length >= 3 ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-purple-300 hover:bg-purple-50/40'}`}>
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center"><Upload className="w-4 h-4 text-purple-500" /></div>
                <span className="text-sm font-semibold text-slate-700">בחר וידאו</span>
                <span className="text-xs text-slate-400">{videos.length}/3 סרטונים</span>
                <input type="file" multiple accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideos || videos.length >= 3} />
              </label>
              <label className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${videos.length >= 3 ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-purple-300 hover:bg-purple-50/40'}`}>
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center"><Video className="w-4 h-4 text-purple-500" /></div>
                <span className="text-sm font-semibold text-slate-700">צלם וידאו</span>
                <span className="text-xs text-slate-400">פתח מצלמה</span>
                <input type="file" accept="video/*" capture="environment" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideos || videos.length >= 3} />
              </label>
            </div>
            {uploadingVideos && <p className="text-xs text-purple-500 text-center">מעלה סרטון...</p>}
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium text-right">{error}</div>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="h-12 px-6 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all">
              ביטול
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-12 text-base bg-gradient-to-l from-red-500 to-orange-400 hover:opacity-90 shadow-lg rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
              <AlertCircle className="w-5 h-5" />
              {saving ? "שולח..." : "שלח דיווח"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Issue Details Dialog ----
function IssueDetailsDialog({ issue, open, onClose, onDelete, onStatusChange }) {
  const [imageIndex, setImageIndex] = useState(0);
  const images = issue?.images || [];
  const hasMultipleImages = images.length > 1;

  if (!issue) return null;

  const targetLabel = issue.target_type === "room" ? `חדר ${issue.target_id}` : `אזור ${issue.target_id}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-400" />
              <DialogTitle className="text-xl font-black text-slate-800">{targetLabel}</DialogTitle>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* תיאור */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-700">תיאור התקלה</h3>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3">
              {issue.description}
            </p>
          </div>

          {/* קבצים */}
          {images.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">קבצים שצורפו</h3>
              <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center gap-2">
                <img src={images[imageIndex]} alt="" className="max-h-64 rounded-lg object-contain" />
                {hasMultipleImages && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setImageIndex((i) => (i - 1 + images.length) % images.length)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-500">{imageIndex + 1} / {images.length}</span>
                    <button
                      onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* מידע */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {issue.reporter_email && (
              <div className="bg-slate-50 rounded-xl p-2 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">מדווח</p>
                  <p className="font-medium text-slate-700 truncate">{issue.reporter_email}</p>
                </div>
              </div>
            )}
            <div className="bg-slate-50 rounded-xl p-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">תאריך</p>
                <p className="font-medium text-slate-700">{format(new Date(issue.created_date), "dd/MM/yy HH:mm")}</p>
              </div>
            </div>
          </div>

          {/* סטטוס */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-700">שינוי סטטוס</h3>
            <Select value={issue.status} onValueChange={(v) => onStatusChange(issue.id, v)}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">פתוחה</SelectItem>
                <SelectItem value="in_progress">בטיפול</SelectItem>
                <SelectItem value="resolved">הושלמה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* כפתורים */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onDelete(issue.id)}
              className="flex-1 h-11 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              מחוק
            </button>
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              סגור
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Kanban Issue Card ----
function KanbanCard({ issue, index, onDelete, onView }) {
  const p = PRIORITY_MAP[issue.priority] || PRIORITY_MAP.medium;
  const targetLabel = issue.target_type === "room" ? `חדר ${issue.target_id}` : `אזור ${issue.target_id}`;
  const isOverdue = issue.priority === "urgent" || issue.priority === "high";

  return (
    <Draggable draggableId={issue.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`bg-white rounded-xl border border-slate-200 shadow-sm mb-2 overflow-hidden transition-shadow ${snapshot.isDragging ? "shadow-xl rotate-1 scale-105" : "hover:shadow-md"}`}
        >
          {/* Drag handle bar */}
          <div
            {...provided.dragHandleProps}
            className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/60 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4 text-slate-300" />
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${p.dot}`}></span>
              <span className="text-xs font-semibold text-slate-500">{p.label}</span>
            </div>
          </div>

          {/* Card body */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="font-bold text-slate-800 text-sm">{targetLabel}</span>
              </div>
              <button
                onClick={() => onDelete(issue.id)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {issue.description && (
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{issue.description}</p>
            )}

            {issue.images?.length > 0 && (
              <button onClick={() => onView(issue)} className="flex gap-1 hover:opacity-80 transition-opacity">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-500 font-medium">{issue.images.length} קבצים</span>
              </button>
            )}

            <div className="flex items-center justify-between pt-0.5">
              {issue.reporter_email && (
                <span className="flex items-center gap-1 text-xs text-slate-400 truncate max-w-[120px]">
                  <User className="w-3 h-3 flex-shrink-0" />{issue.reporter_email}
                </span>
              )}
              <span className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? "text-red-500" : "text-slate-400"}`}>
                <Calendar className="w-3 h-3" />
                {format(new Date(issue.created_date), "dd/MM/yy")}
              </span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ---- Kanban Column ----
function KanbanColumn({ col, issues, onDelete, onView }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* Column header */}
      <div className={`rounded-t-2xl border-t-4 ${col.color} bg-white border border-slate-200 px-4 py-3 flex items-center justify-between mb-0`}>
        <span className="font-black text-slate-700 text-base">{col.label}</span>
        <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${col.count_color}`}>{issues.length}</span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={col.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[300px] rounded-b-2xl border border-t-0 border-slate-200 p-3 transition-colors ${snapshot.isDraggingOver ? "bg-blue-50/40" : "bg-slate-50/60"}`}
          >
            {issues.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center h-24 text-slate-300">
                <AlertCircle className="w-7 h-7 mb-1.5 opacity-40" />
                <p className="text-xs">אין תקלות</p>
              </div>
            )}
            {issues.map((issue, index) => (
              <KanbanCard key={issue.id} issue={issue} index={index} onDelete={onDelete} onView={onView} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// ---- Main Page ----
export default function IssuesManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [notification, setNotification] = useState(null);
  const qc = useQueryClient();

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["issues"],
    queryFn: () => base44.entities.IssueReport.list("-created_date"),
  });

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (filterPriority !== "all" && i.priority !== filterPriority) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!i.target_id?.toLowerCase().includes(q) && !i.description?.toLowerCase().includes(q) && !i.reporter_email?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [issues, filterPriority, search]);

  const columns = useMemo(() => {
    const map = {};
    COLUMNS.forEach((col) => { map[col.id] = filtered.filter((i) => i.status === col.id); });
    return map;
  }, [filtered]);

  const handleDelete = async (id) => {
    if (!window.confirm("האם למחוק תקלה זו?")) return;
    await base44.entities.IssueReport.delete(id);
    qc.invalidateQueries({ queryKey: ["issues"] });
    setDetailsOpen(false);
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    await base44.entities.IssueReport.update(draggableId, { status: newStatus });
    qc.invalidateQueries({ queryKey: ["issues"] });
  };

  const handleStatusChange = async (id, status) => {
    await base44.entities.IssueReport.update(id, { status });
    qc.invalidateQueries({ queryKey: ["issues"] });
    setSelectedIssue({ ...selectedIssue, status });
  };

  const stats = useMemo(() => ({
    open: issues.filter((i) => i.status === "open").length,
    inProgress: issues.filter((i) => i.status === "in_progress").length,
    resolved: issues.filter((i) => i.status === "resolved").length,
    urgent: issues.filter((i) => i.priority === "urgent").length,
  }), [issues]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6" dir="rtl">
      <div className="w-4/5 mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center shadow-sm">
              <AlertCircle className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">ניהול תקלות</h1>
              <p className="text-sm text-slate-400 mt-0.5">גררו תקלות בין עמודות לשינוי סטטוס</p>
            </div>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-l from-red-500 to-orange-400 text-white font-bold shadow-lg hover:opacity-90 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            דווח על תקלה חדשה
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "תקלות פתוחות", count: stats.open, icon: <AlertCircle className="w-5 h-5 text-blue-500" />, bg: "bg-blue-50", accent: "text-blue-600", border: "border-blue-100" },
            { label: "בטיפול",        count: stats.inProgress, icon: <Clock className="w-5 h-5 text-amber-500" />, bg: "bg-amber-50", accent: "text-amber-600", border: "border-amber-100" },
            { label: "הושלמו",        count: stats.resolved, icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, bg: "bg-green-50", accent: "text-green-600", border: "border-green-100" },
            { label: "דחוף",          count: stats.urgent, icon: <AlertCircle className="w-5 h-5 text-red-500" />, bg: "bg-red-50", accent: "text-red-600", border: "border-red-100" },
          ].map(({ label, count, icon, bg, accent, border }) => (
            <div key={label} className={`rounded-2xl border ${border} bg-white p-4 flex items-center justify-between shadow-sm`}>
              <div>
                <p className={`text-3xl font-black ${accent}`}>{count}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${bg}`}>{icon}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="חפש בתיאור, מיקום..."
              className="h-10 pr-9 rounded-xl border-slate-200 bg-slate-50 text-sm" />
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-10 w-36 rounded-xl border-slate-200 bg-slate-50 text-sm"><SelectValue placeholder="דחיפות" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הדחיפויות</SelectItem>
              <SelectItem value="urgent">דחוף</SelectItem>
              <SelectItem value="high">גבוהה</SelectItem>
              <SelectItem value="medium">בינונית</SelectItem>
              <SelectItem value="low">נמוכה</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-400 mr-auto">{filtered.length} תקלות</span>
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-400">טוען...</div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 items-start">
              {COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  issues={columns[col.id] || []}
                  onDelete={handleDelete}
                  onView={(issue) => { setSelectedIssue(issue); setDetailsOpen(true); }}
                />
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      {notification && (
        <div className="fixed top-4 right-4 left-4 max-w-sm mx-auto z-50 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 shadow-lg animate-in">
          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircle className="w-3 h-3 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">{notification}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-blue-400 hover:text-blue-600 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <ReportIssueDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => { setDialogOpen(false); qc.invalidateQueries({ queryKey: ["issues"] }); }}
        onNotify={(msg) => {
          setNotification(msg);
          setTimeout(() => setNotification(null), 5000);
        }}
      />

      <IssueDetailsDialog
        issue={selectedIssue}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}