import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

// ─── utils ────────────────────────────────────────────────────────────────────
const HE_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const HE_DAYS   = ["א","ב","ג","ד","ה","ו","ש"];

function pad(n) { return String(n).padStart(2, "0"); }
function fmt(dt) {
  if (!dt) return "--:-- --/--/----";
  return `${pad(dt.getHours())}:${pad(dt.getMinutes())} ${pad(dt.getDate())}-${pad(dt.getMonth()+1)}-${dt.getFullYear()}`;
}
function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfWeek(year, month) {
  // 0=Sun…6=Sat. We want Sunday=0 → col 0 in our grid (א=Sun)
  return new Date(year, month, 1).getDay();
}

// ─── TimeColumn ───────────────────────────────────────────────────────────────
function TimeColumn({ selectedHour, selectedMinute, onSelect }) {
  const MINUTES = [0, 15, 30, 45];
  // שעות: 1,2,...,23,0 (00 בסוף)
  const HOURS = [...Array.from({ length: 23 }, (_, i) => i + 1), 0];
  const listRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "center" });
    }
  }, [selectedHour, selectedMinute]);

  const rows = [];
  for (let hi = 0; hi < HOURS.length; hi++) {
    const h = HOURS[hi];
    for (let mi = 0; mi < MINUTES.length; mi++) {
      const m = MINUTES[mi];
      const active = h === selectedHour && m === selectedMinute;
      rows.push(
        <div
          key={`${h}-${m}`}
          ref={active ? activeRef : null}
          onClick={() => onSelect(h, m)}
          style={{
            display:"flex", height:30, alignItems:"center", cursor:"pointer",
            background: active ? "#3b82f6" : "transparent",
            borderRadius: active ? 6 : 0,
            margin: active ? "0 4px" : 0,
            width: active ? "calc(100% - 8px)" : "100%",
            transition: "background 0.1s",
          }}
        >
          <span style={{ flex:1, textAlign:"center", fontSize:13, fontWeight: active ? 600 : 400, color: active ? "#fff" : "#1e293b" }}>{pad(m)}</span>
          <span style={{ flex:1, textAlign:"center", fontSize:13, fontWeight: active ? 600 : 400, color: active ? "#dbeafe" : "#475569" }}>{pad(h)}</span>
        </div>
      );
    }
  }

  return (
    <div
      ref={listRef}
      style={{ width: 120, height: 280, overflowY: "auto", borderRight: "1px solid #e5e7eb", flexShrink: 0 }}
    >
      {/* header: דקות מימין, שעה משמאל */}
      <div style={{ display:"flex", height:32, alignItems:"center", borderBottom:"1px solid #e5e7eb", background:"#f8fafc", position:"sticky", top:0, zIndex:1 }}>
        <span style={{ flex:1, textAlign:"center", fontSize:11, fontWeight:600, color:"#64748b" }}>דקות</span>
        <span style={{ flex:1, textAlign:"center", fontSize:11, fontWeight:600, color:"#64748b" }}>שעה</span>
      </div>
      {rows}
    </div>
  );
}

// ─── CalendarHeader ───────────────────────────────────────────────────────────
function CalendarHeader({ year, month, onPrev, onNext }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", height:36, paddingBottom:4 }}>
      <button onClick={onPrev} style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:6, border:"none", background:"transparent", cursor:"pointer", color:"#64748b" }}>
        <ChevronRight size={16} />
      </button>
      <span style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>
        {HE_MONTHS[month]} {year}
      </span>
      <button onClick={onNext} style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:6, border:"none", background:"transparent", cursor:"pointer", color:"#64748b" }}>
        <ChevronLeft size={16} />
      </button>
    </div>
  );
}

// ─── CalendarGrid ─────────────────────────────────────────────────────────────
function CalendarGrid({ year, month, selectedDate, onSelectDay }) {
  const today     = new Date();
  const firstDay  = getFirstDayOfWeek(year, month);   // 0=Sun
  const daysCount = getDaysInMonth(year, month);
  const prevDays  = getDaysInMonth(year, month - 1);

  const cells = [];
  // prev month filler
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevDays - i, inMonth: false, isPrev: true });
  }
  // current month
  for (let d = 1; d <= daysCount; d++) {
    const isSelected = selectedDate &&
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth()    === month &&
      selectedDate.getDate()     === d;
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    cells.push({ day: d, inMonth: true, isSelected, isToday });
  }
  // next month filler
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, inMonth: false, isNext: true });
  }

  return (
    <div>
      {/* day-of-week header */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", marginBottom:2 }}>
        {HE_DAYS.map(d => (
          <div key={d} style={{ height:28, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:600, color:"#94a3b8" }}>{d}</div>
        ))}
      </div>
      {/* days grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:1 }}>
        {cells.map((c, i) => (
          <div
            key={i}
            onClick={() => c.inMonth && onSelectDay(c.day)}
            style={{
              width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center",
              borderRadius:6, fontSize:12, fontWeight: c.isSelected ? 700 : 400, cursor: c.inMonth ? "pointer" : "default",
              background: c.isSelected ? "#3b82f6" : "transparent",
              color: c.isSelected ? "#fff" : c.inMonth ? (c.isToday ? "#3b82f6" : "#1e293b") : "#d1d5db",
              boxShadow: c.isToday && !c.isSelected ? "inset 0 0 0 1px #3b82f6" : "none",
              transition: "background 0.1s",
            }}
          >
            {c.day}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CalendarPanel ────────────────────────────────────────────────────────────
function CalendarPanel({ selectedDate, onSelectDay }) {
  const base  = selectedDate || new Date();
  const [view, setView] = useState({ year: base.getFullYear(), month: base.getMonth() });

  const prev = () => setView(v => {
    const d = new Date(v.year, v.month - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const next = () => setView(v => {
    const d = new Date(v.year, v.month + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <div style={{ width:280, height:280, padding:"8px 10px", flexShrink:0, boxSizing:"border-box" }}>
      <CalendarHeader year={view.year} month={view.month} onPrev={prev} onNext={next} />
      <CalendarGrid year={view.year} month={view.month} selectedDate={selectedDate} onSelectDay={(d) => onSelectDay(view.year, view.month, d)} />
    </div>
  );
}

// ─── DateTimeHeader ───────────────────────────────────────────────────────────
function DateTimeHeader({ value, open, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        height:40, padding:"0 12px", cursor:"pointer",
        borderBottom: open ? "1px solid #e5e7eb" : "none",
        userSelect:"none",
      }}
    >
      <ChevronDown size={16} style={{ color:"#64748b", transform: open ? "rotate(180deg)" : "none", transition:"transform 0.2s", flexShrink:0 }} />
      <span style={{ fontSize:14, fontWeight:600, color:"#1e293b", letterSpacing:"0.02em" }}>{fmt(value)}</span>
    </div>
  );
}

// ─── DateTimeFooter ───────────────────────────────────────────────────────────
function DateTimeFooter({ onConfirm }) {
  return (
    <div style={{ height:52, display:"flex", alignItems:"center", justifyContent:"flex-start", padding:"0 12px", borderTop:"1px solid #e5e7eb" }}>
      <button
        onClick={onConfirm}
        style={{
          height:32, paddingInline:16, background:"#3b82f6", color:"#fff",
          border:"none", borderRadius:8, fontSize:13, fontWeight:600,
          cursor:"pointer", transition:"background 0.15s",
        }}
        onMouseOver={e => e.target.style.background="#2563eb"}
        onMouseOut={e  => e.target.style.background="#3b82f6"}
      >
        אישור
      </button>
    </div>
  );
}

// ─── DateTimePicker (main) ────────────────────────────────────────────────────
export default function DateTimePicker({ value, onChange, placeholder }) {
  const [open,    setOpen]    = useState(false);
  const [internal, setInternal] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef(null);

  // sync external value
  useEffect(() => { if (value) setInternal(new Date(value)); }, [value]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelectTime = (h, m) => {
    setInternal(prev => { const d = new Date(prev); d.setHours(h, m, 0, 0); return d; });
  };

  const handleSelectDay = (year, month, day) => {
    setInternal(prev => { const d = new Date(prev); d.setFullYear(year); d.setMonth(month); d.setDate(day); return d; });
  };

  const handleConfirm = () => {
    onChange && onChange(internal);
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position:"relative", display:"block", width:"100%" }} dir="rtl">
      {/* trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display:"flex", alignItems:"center", gap:8, height:40, padding:"0 12px",
          border:"1px solid #e2e8f0", borderRadius:8, background:"#fff", cursor:"pointer",
          fontSize:13, color: value ? "#1e293b" : "#94a3b8", userSelect:"none",
          width:"100%", boxSizing:"border-box",
        }}
      >
        <span style={{ flex:1 }}>{value ? fmt(new Date(value)) : (placeholder || "בחר תאריך ושעה")}</span>
        <ChevronDown size={14} style={{ color:"#64748b", transform: open ? "rotate(180deg)" : "none", transition:"transform 0.2s", flexShrink:0 }} />
      </div>

      {/* popup */}
      {open && (
        <div
          style={{
            position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:9999,
            width:400, maxWidth:400, background:"#fff",
            borderRadius:10, border:"1px solid #e2e8f0",
            boxShadow:"0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)",
            overflow:"hidden",
          }}
        >
          <DateTimeHeader value={internal} open={true} onToggle={() => setOpen(false)} />

          {/* body: calendar right | time left */}
          <div style={{ display:"flex", flexDirection:"row", height:280 }}>
            <CalendarPanel selectedDate={internal} onSelectDay={handleSelectDay} />
            <TimeColumn selectedHour={internal.getHours()} selectedMinute={Math.round(internal.getMinutes() / 15) * 15 % 60} onSelect={handleSelectTime} />
          </div>

          <DateTimeFooter onConfirm={handleConfirm} />
        </div>
      )}
    </div>
  );
}