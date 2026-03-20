import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Search, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";

const STATUS_MAP = {
  open:        { label: "פתוחה",    color: "bg-red-100 text-red-700" },
  in_progress: { label: "בטיפול",   color: "bg-amber-100 text-amber-700" },
  resolved:    { label: "טופל",     color: "bg-green-100 text-green-700" },
};
const PRIORITY_MAP = {
  low:    { label: "נמוכה",  color: "bg-slate-100 text-slate-600" },
  medium: { label: "בינונית", color: "bg-blue-100 text-blue-700" },
  high:   { label: "גבוהה",  color: "bg-orange-100 text-orange-700" },
  urgent: { label: "דחוף",   color: "bg-red-100 text-red-700" },
};

function IssueRow({ issue, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(issue.notes || "");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const handleStatusChange = async (status) => {
    await base44.entities.IssueReport.update(issue.id, { status });
    qc.invalidateQueries({ queryKey: ["issues"] });
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    await base44.entities.IssueReport.update(issue.id, { notes });
    qc.invalidateQueries({ queryKey: ["issues"] });
    setSaving(false);
  };

  const s = STATUS_MAP[issue.status] || STATUS_MAP.open;
  const p = PRIORITY_MAP[issue.priority] || PRIORITY_MAP.medium;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-slate-800">{issue.target_type === "room" ? "חדר" : "אזור"}: {issue.target_id}</span>
            <Badge className={`${s.color} text-xs`}>{s.label}</Badge>
            <Badge className={`${p.color} text-xs`}>{p.label}</Badge>
          </div>
          <p className="text-sm text-slate-600 line-clamp-2">{issue.description}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
            {issue.reporter_email && <span>{issue.reporter_email}</span>}
            <span>{format(new Date(issue.created_date), "dd/MM/yyyy HH:mm")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Select value={issue.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 text-xs w-28 rounded-lg border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">פתוחה</SelectItem>
              <SelectItem value="in_progress">בטיפול</SelectItem>
              <SelectItem value="resolved">טופל</SelectItem>
            </SelectContent>
          </Select>
          <button onClick={() => onDelete(issue.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/50">
          {issue.images?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">תמונות</p>
              <div className="flex gap-2 flex-wrap">
                {issue.images.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">הערות מנהל</p>
            <div className="flex gap-2">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הוסף הערה..."
                className="h-9 rounded-lg border-slate-200 text-sm flex-1"
              />
              <Button onClick={handleSaveNotes} disabled={saving} size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                {saving ? "..." : "שמור"}
              </Button>
            </div>
            {issue.notes && <p className="text-xs text-slate-500 mt-1">{issue.notes}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function IssuesManagement() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const qc = useQueryClient();

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["issues"],
    queryFn: () => base44.entities.IssueReport.list("-created_date"),
  });

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      if (filterPriority !== "all" && i.priority !== filterPriority) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!i.target_id?.toLowerCase().includes(q) && !i.description?.toLowerCase().includes(q) && !i.reporter_email?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [issues, filterStatus, filterPriority, search]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">ניהול תקלות</h1>
            <p className="text-sm text-slate-500 mt-0.5">מעקב וטיפול בדיווחי תקלות</p>
          </div>
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "פתוחות", count: stats.open, icon: <AlertCircle className="w-5 h-5 text-red-500" />, bg: "bg-red-50" },
            { label: "בטיפול", count: stats.inProgress, icon: <Clock className="w-5 h-5 text-amber-500" />, bg: "bg-amber-50" },
            { label: "טופלו", count: stats.resolved, icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, bg: "bg-green-50" },
            { label: "דחופות", count: stats.urgent, icon: <AlertTriangle className="w-5 h-5 text-orange-500" />, bg: "bg-orange-50" },
          ].map(({ label, count, icon, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{count}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש..." className="h-9 pr-9 rounded-lg border-slate-200" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-32 rounded-lg border-slate-200 text-sm">
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="open">פתוחה</SelectItem>
              <SelectItem value="in_progress">בטיפול</SelectItem>
              <SelectItem value="resolved">טופל</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-9 w-32 rounded-lg border-slate-200 text-sm">
              <SelectValue placeholder="דחיפות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הדחיפויות</SelectItem>
              <SelectItem value="urgent">דחוף</SelectItem>
              <SelectItem value="high">גבוהה</SelectItem>
              <SelectItem value="medium">בינונית</SelectItem>
              <SelectItem value="low">נמוכה</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">טוען...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">לא נמצאו תקלות</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((issue) => (
              <IssueRow key={issue.id} issue={issue} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}