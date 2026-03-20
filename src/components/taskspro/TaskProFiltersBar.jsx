import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";

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

  const handleSearchChange = (value) => {
    onChange({ ...filters, search: value });
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

  const taskCount = 8; // This would be replaced with actual count from parent
  const isFiltered = filters.search;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        {/* Left side - Count and dropdown */}
        <div className="flex items-center gap-2">
          <button className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2">
            <span>טחקלה {taskCount}</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </button>

          <button className="h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
            כל הטקטיקות
          </button>
        </div>

        {/* Right side - Search and filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Input
              type="text"
              placeholder="חיפוש בחזקה, משום..."
              value={filters.search || ""}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 pr-10 bg-white border-slate-200 rounded-xl text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-600"
            title="סננים"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}