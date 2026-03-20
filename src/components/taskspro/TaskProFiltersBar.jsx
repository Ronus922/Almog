import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, ChevronDown, Save, Trash2 } from "lucide-react";

const STATUS_OPTIONS = ["הכל", "פתוחה", "בטיפול", "הושלמה", "בוטלה", "ממתינה"];
const PRIORITY_OPTIONS = ["הכל", "דחופה", "גבוהה", "נמוכה"];
const SOURCE_OPTIONS = ["הכל", "ידנית", "מתבנית", "מחזורית"];

export default function TaskProFiltersBar({
  filters = {},
  onChange = () => {},
  assignedOptions = [],
  savedViews = [],
  onSaveView = () => {},
  onLoadView = () => {},
  currentUsername = "",
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  const handleSearchChange = (value) => {
    onChange({ ...filters, search: value });
  };

  const handleStatusChange = (value) => {
    onChange({ ...filters, status: value });
  };

  const handlePriorityChange = (value) => {
    onChange({ ...filters, priority: value });
  };

  const handleSourceChange = (value) => {
    onChange({ ...filters, source: value });
  };

  const handleAssignedChange = (value) => {
    onChange({ ...filters, assigned: value });
  };

  const handleClearAll = () => {
    onChange({
      search: "",
      status: "הכל",
      priority: "הכל",
      source: "הכל",
      assigned: "הכל",
      dueDateFrom: "",
      dueDateTo: "",
      showArchived: false,
      attendeeUsername: "",
    });
  };

  const handleSaveView = () => {
    if (!newViewName.trim()) return;
    onSaveView({
      name: newViewName,
      filters_json: JSON.stringify(filters),
    });
    setNewViewName("");
  };

  const isFiltered =
    filters.search ||
    filters.status !== "הכל" ||
    filters.priority !== "הכל" ||
    filters.source !== "הכל" ||
    filters.assigned !== "הכל";

  return (
    <div className="space-y-3" dir="rtl">
      {/* Main filter bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 flex-wrap shadow-sm">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Input
            type="text"
            placeholder="חיפוש משימות..."
            value={filters.search || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-10 pr-10 bg-slate-50 border-slate-200 rounded-xl focus:bg-white"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        {/* Status */}
        <Select value={filters.status || "הכל"} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-32 h-10 rounded-xl bg-slate-50 border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select
          value={filters.priority || "הכל"}
          onValueChange={handlePriorityChange}
        >
          <SelectTrigger className="w-32 h-10 rounded-xl bg-slate-50 border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Advanced filters toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="h-10 rounded-xl gap-2 border-slate-200"
        >
          <Filter className="w-4 h-4" />
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              showAdvanced ? "rotate-180" : ""
            }`}
          />
        </Button>

        {/* Clear all */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-10 text-slate-400 hover:text-slate-600"
          >
            ✕ איפוס
          </Button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-sm">
          {/* Source */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-600 min-w-20">
              מקור:
            </label>
            <Select
              value={filters.source || "הכל"}
              onValueChange={handleSourceChange}
            >
              <SelectTrigger className="w-40 h-9 rounded-xl bg-slate-50 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assigned to */}
          {assignedOptions.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600 min-w-20">
                משויך:
              </label>
              <Select
                value={filters.assigned || "הכל"}
                onValueChange={handleAssignedChange}
              >
                <SelectTrigger className="w-40 h-9 rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="הכל">הכל</SelectItem>
                  <SelectItem value="__me__">שלי</SelectItem>
                  {assignedOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date range */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-600 min-w-20">
              תאריך:
            </label>
            <input
              type="date"
              value={filters.dueDateFrom || ""}
              onChange={(e) =>
                onChange({ ...filters, dueDateFrom: e.target.value })
              }
              className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
            />
            <span className="text-slate-400">עד</span>
            <input
              type="date"
              value={filters.dueDateTo || ""}
              onChange={(e) =>
                onChange({ ...filters, dueDateTo: e.target.value })
              }
              className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
            />
          </div>

          {/* Save view */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              placeholder="שם התצוגה החדשה..."
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm flex-1"
            />
            <Button
              size="sm"
              onClick={handleSaveView}
              disabled={!newViewName.trim()}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              <Save className="w-4 h-4 ml-1" /> שמור
            </Button>
          </div>

          {/* Saved views */}
          {savedViews.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
              <span className="text-xs text-slate-500">תצוגות שמורות:</span>
              {savedViews.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1"
                >
                  <button
                    onClick={() => onLoadView(view.id)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {view.name}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}