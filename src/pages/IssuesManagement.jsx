import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle, Search, CheckCircle2, Clock, Trash2,
  MapPin, User, Calendar, Upload, Camera, Video, VideoIcon, X, Plus, Pencil, Filter
} from "lucide-react";
import { format } from "date-fns";

const STATUS_MAP = {
  open:        { label: "פתוח",    color: "bg-red-100 text-red-600 border-red-200" },
  in_progress: { label: "בטיפול",  color: "bg-amber-100 text-amber-700 border-amber-200" },
  resolved:    { label: "טופל",    color: "bg-green-100 text-green-700 border-green-200" },
};
const PRIORITY_MAP = {
  low:    { label: "נמוכה",   color: "bg-slate-100 text-slate-600 border-slate-200" },
  medium: { label: "בינונית", color: "bg-blue-100 text-blue-700 border-blue-200" },
  high:   { label: "גבוהה",   color: "bg-orange-100 text-orange-700 border-orange-200" },
  urgent: { label: "דחוף",    color: "bg-red-100 text-red-700 border-red-200" },
};

const SORT_OPTIONS = [
  { value: "newest", label: "חדש ביותר" },
  { value: "oldest", label: "ישן ביותר" },
  { value: "priority", label: "עדיפויות" },
];

// ---- Dialog Form ----
function ReportIssueDialog({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({ target_type: "room", target_id: "", priority: "medium", description: "", assigned_to: "" });
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
    await base44.entities.IssueReport.create({ ...form, images, videos, status: "open" });
    setSaving(false);
    setForm({ target_type: "room", target_id: "", priority: "medium", description: "", assigned_to: "" });
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

          {/* שורה 1: סוג מיקום + מספר חדר/אזור */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">סוג מיקום *</label>
              <Select value={form.target_type} onValueChange={(v) => setForm((p) => ({ ...p, target_type: v, target_id: "" }))}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 font-medium">
                  <SelectValue />
                </SelectTrigger>
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

          {/* שורה 2: דחיפות + שתף עם */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">דחיפות *</label>
              <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 font-medium">
                  <SelectValue />
                </SelectTrigger>
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
              <Select value={form.assigned_to} onValueChange={(v) => setForm((p) => ({ ...p, assigned_to: v }))}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 font-medium">
                  <SelectValue placeholder="...בחר משתמש" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {appUsers.map((u) => <SelectItem key={u.id} value={u.username}>{u.first_name} {u.last_name || ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* תיאור */}
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

          {/* כפתורים */}
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

// ---- Issue Card Row ----
function IssueCard({ issue, onDelete, onStatusChange }) {
  const s = STATUS_MAP[issue.status] || STATUS_MAP.open;
  const p = PRIORITY_MAP[issue.priority] || PRIORITY_MAP.medium;
  const targetLabel = issue.target_type === "room" ? `חדר ${issue.target_id}` : `אזור ${issue.target_id}`;

  // card bg per priority
  const cardBg = issue.priority === "urgent"
    ? "bg-red-50/60 border-red-200"
    : issue.priority === "high"
    ? "bg-orange-50/60 border-orange-200"
    : issue.priority === "medium"
    ? "bg-amber-50/40 border-amber-100"
    : "bg-white border-slate-100";

  return (
    <div className={`rounded-2xl border shadow-sm p-5 ${cardBg}`}>
      <div className="flex items-start justify-between gap-3">
        {/* Right: info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="font-bold text-slate-800 text-base">{targetLabel}</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.color}`}>{s.label}</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${p.color}`}>{p.label}</span>
          </div>
          <p className="text-sm text-slate-700">{issue.description}</p>
          {issue.images?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-1">
              {issue.images.slice(0, 3).map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
                </a>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
            {issue.reporter_email && (
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />מדווח: {issue.reporter_email}</span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(issue.created_date), "dd/MM/yyyy HH:mm")}
            </span>
          </div>
        </div>

        {/* Left: actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Select value={issue.status} onValueChange={(v) => onStatusChange(issue.id, v)}>
            <SelectTrigger className="h-8 text-xs w-28 rounded-lg border-slate-200 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">פתוח</SelectItem>
              <SelectItem value="in_progress">בטיפול</SelectItem>
              <SelectItem value="resolved">טופל</SelectItem>
            </SelectContent>
          </Select>
          <button onClick={() => onDelete(issue.id)} className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function IssuesManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const qc = useQueryClient();

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["issues"],
    queryFn: () => base44.entities.IssueReport.list("-created_date"),
  });

  const { data: appUsers = [] } = useQuery({
    queryKey: ["appUsers"],
    queryFn: () => base44.entities.AppUser.list(),
  });

  const filtered = useMemo(() => {
    let list = issues.filter((i) => {
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      if (filterPriority !== "all" && i.priority !== filterPriority) return false;
      if (filterUser !== "all" && i.assigned_to !== filterUser) return false;
      if (dateFrom && new Date(i.created_date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(i.created_date) > new Date(dateTo + "T23:59:59")) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!i.target_id?.toLowerCase().includes(q) && !i.description?.toLowerCase().includes(q) && !i.reporter_email?.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    if (sortBy === "oldest") list = [...list].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    else if (sortBy === "priority") {
      const ord = { urgent: 0, high: 1, medium: 2, low: 3 };
      list = [...list].sort((a, b) => (ord[a.priority] ?? 2) - (ord[b.priority] ?? 2));
    }
    return list;
  }, [issues, filterStatus, filterPriority, filterUser, dateFrom, dateTo, search, sortBy]);

  const stats = useMemo(() => ({
    open: issues.filter((i) => i.status === "open").length,
    inProgress: issues.filter((i) => i.status === "in_progress").length,
    resolved: issues.filter((i) => i.status === "resolved").length,
    urgent: issues.filter((i) => i.priority === "urgent").length,
  }), [issues]);

  const handleDelete = async (id) => {
    if (!window.confirm("האם למחוק תקלה זו?")) return;
    await base44.entities.IssueReport.delete(id);
    qc.invalidateQueries({ queryKey: ["issues"] });
  };

  const handleStatusChange = async (id, status) => {
    await base44.entities.IssueReport.update(id, { status });
    qc.invalidateQueries({ queryKey: ["issues"] });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center shadow-sm">
              <AlertCircle className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">ניהול תקלות</h1>
              <p className="text-sm text-slate-400 mt-0.5">כל הדיווחים על תקלות ובעיות</p>
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

        {/* Filters card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-600">סינון וחיפוש</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* חיפוש חופשי */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="חפש בתיאור, הערות או מיקום..."
                className="h-11 pr-9 rounded-xl border-slate-200 bg-slate-50 text-sm" />
            </div>
            {/* סטטוס */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm"><SelectValue placeholder="סטטוס" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="open">פתוח</SelectItem>
                <SelectItem value="in_progress">בטיפול</SelectItem>
                <SelectItem value="resolved">טופל</SelectItem>
              </SelectContent>
            </Select>
            {/* דחיפות */}
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm"><SelectValue placeholder="דחיפות" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הדחיפויות</SelectItem>
                <SelectItem value="urgent">דחוף</SelectItem>
                <SelectItem value="high">גבוהה</SelectItem>
                <SelectItem value="medium">בינונית</SelectItem>
                <SelectItem value="low">נמוכה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* עובד אחראי */}
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm"><SelectValue placeholder="עובד אחראי" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל העובדים</SelectItem>
                {appUsers.map((u) => <SelectItem key={u.id} value={u.username}>{u.first_name} {u.last_name || ""}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* מתאריך */}
            <div className="relative">
              <label className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">מתאריך</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full h-11 pr-16 pl-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-300" />
            </div>
            {/* עד תאריך */}
            <div className="relative">
              <label className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">עד תאריך</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full h-11 pr-16 pl-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 outline-none focus:ring-1 focus:ring-blue-300" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-slate-500">נמצאו <span className="font-bold text-slate-700">{filtered.length}</span> תקלות</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">מיין לפי:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 w-32 rounded-lg border-slate-200 bg-slate-50 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "תקלות פתוחות", count: stats.open, icon: <AlertCircle className="w-6 h-6 text-red-500" />, bg: "bg-red-50", accent: "text-red-600", border: "border-red-100" },
            { label: "בטיפול", count: stats.inProgress, icon: <Clock className="w-6 h-6 text-amber-500" />, bg: "bg-amber-50", accent: "text-amber-600", border: "border-amber-100" },
            { label: "טופל", count: stats.resolved, icon: <CheckCircle2 className="w-6 h-6 text-green-500" />, bg: "bg-green-50", accent: "text-green-600", border: "border-green-100" },
            { label: "דחוף", count: stats.urgent, icon: <AlertCircle className="w-6 h-6 text-red-600" />, bg: "bg-red-100", accent: "text-red-700", border: "border-red-200", highlight: true },
          ].map(({ label, count, icon, bg, accent, border, highlight }) => (
            <div key={label} className={`rounded-2xl border ${border} ${highlight ? bg + ' shadow-sm' : 'bg-white'} p-4 flex items-center justify-between`}>
              <div>
                <p className={`text-3xl font-black ${accent}`}>{count}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${bg}`}>{icon}</div>
            </div>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-400">טוען...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">לא נמצאו תקלות</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((issue) => (
              <IssueCard key={issue.id} issue={issue} onDelete={handleDelete} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </div>

      <ReportIssueDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => { setDialogOpen(false); qc.invalidateQueries({ queryKey: ["issues"] }); }}
      />
    </div>
  );
}