import React from "react";
import { AlertCircle, CheckCircle2, Clock, Zap } from "lucide-react";

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const METRICS = [
  {
    key: "open",
    label: "דחוף",
    icon: AlertCircle,
    color: "text-red-500",
    bg: "bg-red-50",
  },
  {
    key: "done",
    label: "הושלמה",
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-50",
  },
  {
    key: "inwork",
    label: "ביטסול",
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    key: "overdue",
    label: "החזקה משחוזה",
    icon: Zap,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
];

export default function TaskProKpiBar({
  tasks = [],
  currentUsername = "",
  activeFilter = null,
  onFilterChange = () => {},
}) {
  const today = getTodayStr();

  const counts = {
    open: tasks.filter((t) => t.status === "פתוחה").length,
    done: tasks.filter((t) => t.status === "הושלמה").length,
    inwork: tasks.filter((t) => t.status === "בטיפול").length,
    overdue: tasks.filter(
      (t) =>
        t.due_at &&
        t.due_at.slice(0, 10) < today &&
        t.status !== "הושלמה" &&
        t.status !== "בוטלה"
    ).length,
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4" dir="rtl">
      <div className="grid grid-cols-4 gap-4">
        {METRICS.map((m) => {
          const Icon = m.icon;
          const count = counts[m.key];
          const isActive = activeFilter === m.key;

          return (
            <button
              key={m.key}
              onClick={() => onFilterChange(isActive ? null : m.key)}
              className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200 border-2 ${
                isActive
                  ? `${m.bg} border-current`
                  : "bg-white border-transparent hover:border-slate-200"
              }`}
            >
              <Icon className={`w-6 h-6 flex-shrink-0 ${m.color}`} />
              <div className="text-right">
                <div className={`text-2xl font-black ${m.color}`}>
                  {count}
                </div>
                <div className="text-xs text-slate-600 font-semibold">{m.label}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}