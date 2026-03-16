import React, { useState } from "react";
import { Search, Filter, X, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUSES = ["הכל", "פתוחה", "בטיפול", "הושלמה", "בוטלה", "ממתינה"];
const PRIORITIES = ["הכל", "גבוהה", "בינונית", "נמוכה"];
const SOURCES = ["הכל", "ידנית", "מתבנית", "מחזורית"];
const TASK_TYPES = ["הכל", "שיחת טלפון", "שליחת מכתב התראה", "פגישה", "מעקב תשלום", "הגשת תביעה", "משימה כללית", "אחר"];

export default function TaskProFiltersBar({ filters, onChange, assignedOptions = [], savedViews = [], onSaveView, onLoadView, onDeleteView, currentUsername }) {
  const [showFilters, setShowFilters] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const set = (key, val) => onChange({ ...filters, [key]: val });

  const hasActiveFilters = filters.status !== "הכל" || filters.priority !== "הכל" ||
    filters.assigned !== "הכל" || filters.taskType !== "הכל" ||
    filters.source !== "הכל" || filters.search || filters.dueDateFrom || filters.dueDateTo || filters.showArchived;

  const clearAll = () => onChange({
    search: "", status: "הכל", priority: "הכל", assigned: "הכל",
    taskType: "הכל", source: "הכל", dueDateFrom: "", dueDateTo: "", showArchived: false,
    attendeeUsername: ""
  });

  const handleSaveView = () => {
    if (!saveViewName.trim()) return;
    onSaveView({ name: saveViewName.trim(), filters_json: JSON.stringify(filters), view_mode: filters.viewMode || "table" });
    setSaveViewName("");
    setShowSaveInput(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3" dir="rtl">
      {/* Row 1: Search + Buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pr-9 h-10"
            placeholder="חיפוש לפי כותרת, דירה, בעל..."
            value={filters.search || ""}
            onChange={(e) => set("search", e.target.value)}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 h-10 ${showFilters ? "bg-blue-50 border-blue-300 text-blue-700" : ""}`}
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter className="w-4 h-4" />
          פילטרים
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-600 mr-1" />}
        </Button>

        {/* Saved Views dropdown */}
        {savedViews.length > 0 && (
          <Select onValueChange={(id) => onLoadView(id)}>
            <SelectTrigger className="w-40 h-10"><SelectValue placeholder="תצוגה שמורה" /></SelectTrigger>
            <SelectContent>
              {savedViews.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Save current view */}
        {showSaveInput ? (
          <div className="flex gap-1.5 items-center">
            <Input
              className="h-10 w-36 text-sm"
              placeholder="שם התצוגה"
              value={saveViewName}
              onChange={(e) => setSaveViewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveView()}
            />
            <Button size="sm" className="h-10 bg-blue-600 text-white" onClick={handleSaveView}>שמור</Button>
            <Button size="sm" variant="ghost" className="h-10" onClick={() => setShowSaveInput(false)}><X className="w-4 h-4" /></Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="h-10 gap-1.5 text-slate-500" onClick={() => setShowSaveInput(true)}>
            <Save className="w-4 h-4" />
            שמור תצוגה
          </Button>
        )}
      </div>

      {/* Row 2: Expanded Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-slate-100">
          <Select value={filters.status || "הכל"} onValueChange={(v) => set("status", v)}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="סטטוס" /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>

          <Select value={filters.priority || "הכל"} onValueChange={(v) => set("priority", v)}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="עדיפות" /></SelectTrigger>
            <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>

          <Select value={filters.taskType || "הכל"} onValueChange={(v) => set("taskType", v)}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="סוג משימה" /></SelectTrigger>
            <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>

          <Select value={filters.source || "הכל"} onValueChange={(v) => set("source", v)}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="מקור" /></SelectTrigger>
            <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>

          <Select value={filters.assigned || "הכל"} onValueChange={(v) => set("assigned", v)}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="עובד" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="הכל">כל העובדים</SelectItem>
              <SelectItem value={`__me__${currentUsername}`}>שלי בלבד</SelectItem>
              {assignedOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={filters.dueDateFrom || ""}
              onChange={(e) => set("dueDateFrom", e.target.value)}
            />
            <span className="text-slate-400 text-sm">עד</span>
            <input
              type="date"
              className="h-9 rounded-lg border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={filters.dueDateTo || ""}
              onChange={(e) => set("dueDateTo", e.target.value)}
            />
          </div>

          {/* Show archived */}
          <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-blue-600"
              checked={!!filters.showArchived}
              onChange={(e) => set("showArchived", e.target.checked)}
            />
            כולל מאורכבים
          </label>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9 text-slate-400 gap-1" onClick={clearAll}>
              <X className="w-3.5 h-3.5" /> נקה הכל
            </Button>
          )}
        </div>
      )}
    </div>
  );
}