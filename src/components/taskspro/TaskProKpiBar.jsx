import React from "react";
import { ClipboardList, AlertTriangle, Clock, CheckCircle2, Loader2 } from "lucide-react";

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function TaskProKpiBar({ tasks = [], currentUsername, activeFilter, onFilterChange }) {
  const today = getTodayStr();

  const open    = tasks.filter((t) => !t.is_archived && t.status === "פתוחה").length;
  const inWork  = tasks.filter((t) => !t.is_archived && t.status === "בטיפול").length;
  const done    = tasks.filter((t) => !t.is_archived && t.status === "הושלמה").length;
  const overdue = tasks.filter((t) => !t.is_archived && t.due_at && t.due_at.slice(0,10) < today && t.status !== "הושלמה" && t.status !== "בוטלה").length;
  const dueToday = tasks.filter((t) => !t.is_archived && t.due_at && t.due_at.slice(0,10) === today && t.status !== "הושלמה" && t.status !== "בוטלה").length;

  const cards = [
    { key: "open",    label: "פתוחות",   count: open,     icon: <ClipboardList className="w-5 h-5 text-blue-600" />,    bg: "bg-blue-50",   border: "border-blue-500",   count_color: "text-blue-700" },
    { key: "inwork",  label: "בטיפול",   count: inWork,   icon: <Loader2 className="w-5 h-5 text-orange-500" />,        bg: "bg-orange-50", border: "border-orange-500", count_color: "text-orange-600" },
    { key: "done",    label: "הושלמה",   count: done,     icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,    bg: "bg-green-50",  border: "border-green-500",  count_color: "text-green-700" },
    { key: "overdue", label: "באיחור",   count: overdue,  icon: <AlertTriangle className="w-5 h-5 text-red-500" />,     bg: "bg-red-50",    border: "border-red-500",    count_color: "text-red-600" },
    { key: "today",   label: "להיום",    count: dueToday, icon: <Clock className="w-5 h-5 text-violet-600" />,          bg: "bg-violet-50", border: "border-violet-500", count_color: "text-violet-700" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map(({ key, label, count, icon, bg, border, count_color }) => (
        <div
          key={key}
          className="text-right rounded-xl p-4 flex items-center gap-3 border border-slate-200 shadow-sm bg-white w-full"
        >
          <div className={`p-2 rounded-lg ${bg} flex-shrink-0`}>{icon}</div>
          <div>
            <p className={`text-2xl font-bold ${count_color}`}>{count}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}