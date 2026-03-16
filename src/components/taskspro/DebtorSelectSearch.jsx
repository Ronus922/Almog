import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X } from "lucide-react";

export default function DebtorSelectSearch({ debtors, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  const selected = debtors.find((d) => d.id === value);

  const filtered = debtors.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.apartmentNumber?.toString().includes(q) ||
      d.ownerName?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (d) => {
    onChange(d ? d.id : null);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm hover:border-slate-300 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selected ? (
            <span className="truncate text-slate-800 font-medium">
              דירה {selected.apartmentNumber} – {selected.ownerName}
            </span>
          ) : (
            <span className="text-slate-400">חיפוש דירה / דייר...</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <span
              onClick={(e) => { e.stopPropagation(); handleSelect(null); }}
              className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש לפי דירה או שם..."
                className="w-full pr-8 pl-3 py-2 text-sm bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full text-right px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50 transition-colors border-b border-slate-50"
            >
              ללא קישור
            </button>
            {filtered.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">לא נמצאו תוצאות</p>
            ) : (
              filtered.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleSelect(d)}
                  className={`w-full text-right px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between group ${value === d.id ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"}`}
                >
                  <span>דירה {d.apartmentNumber} – {d.ownerName}</span>
                  {value === d.id && <span className="text-blue-500 text-xs">✓</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}