import React, { useState, useRef, useEffect } from "react";
import { Search, X, UserPlus, Check } from "lucide-react";

export default function MultiSelectAttendees({ users = [], selected = [], onChange, placeholder = "הוסף משתתפים..." }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const isSelected = (u) => selected.some((s) => s.username === u.username);

  const toggle = (u) => {
    if (isSelected(u)) {
      onChange(selected.filter((s) => s.username !== u.username));
    } else {
      onChange([...selected, u]);
    }
  };

  const remove = (username) => onChange(selected.filter((s) => s.username !== username));

  return (
    <div className="relative" ref={ref} dir="rtl">
      {/* Tags + trigger */}
      <div
        className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 flex flex-wrap gap-1.5 cursor-text focus-within:ring-1 focus-within:ring-blue-400 focus-within:border-blue-400 transition-all"
        onClick={() => setOpen(true)}
      >
        {selected.map((u) => (
          <span
            key={u.username}
            className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full"
          >
            {u.name || u.username}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(u.username); }}
              className="hover:text-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {selected.length === 0 && (
          <span className="text-slate-400 text-sm flex items-center gap-1.5">
            <UserPlus className="w-4 h-4" />
            {placeholder}
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 right-0 left-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                className="w-full pr-8 pl-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="חפש משתמש..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">לא נמצאו משתמשים</p>
            ) : (
              filtered.map((u) => {
                const sel = isSelected(u);
                return (
                  <button
                    key={u.username}
                    type="button"
                    onClick={() => toggle(u)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-right hover:bg-slate-50 transition-colors ${sel ? "bg-blue-50" : ""}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${sel ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                      {sel && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{u.name || u.username}</p>
                      {u.email && <p className="text-xs text-slate-400 truncate">{u.email}</p>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-slate-100 text-xs text-slate-500 text-center">
              {selected.length} משתתפים נבחרו
            </div>
          )}
        </div>
      )}
    </div>
  );
}