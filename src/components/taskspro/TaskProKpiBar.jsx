import React from "react";
import { AlertCircle, CheckCircle2, Clock, Zap } from "lucide-react";

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const METRICS = [
  {
    key: "open",
    label: "פתוחה",
    icon: AlertCircle,
    color: "text-red-500",
    bg: "bg-red-50",
    filterColor: "text-red-600",
  },
  {
    key: "done",
    label: "הושלמה",
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-50",
    filterColor: "text-green-600",
  },
  {
    key: "inwork",
    label: "ביטסול",
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-50",
    filterColor: "text-amber-600",
  },
  {
    key: "overdue",
    label: "חקיקה משחוזה",
    icon: Zap,
    color: "text-blue-500",
    bg: "bg-blue-50",
    filterColor: "text-blue-600",
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
    <div className="flex gap-3 overflow-x-auto pb-2" dir="rtl">
      {METRICS.map((m) => {
        const Icon = m.icon;
        const count = counts[m.key];
        const isActive = activeFilter === m.key;

        return (
          <button
            key={m.key}
            onClick={() => onFilterChange(isActive ? null : m.key)}
            className={`flex-shrink-0 flex items-center gap-3 px-5 py-4 rounded-2xl border-2 transition-all duration-200 ${
              isActive
                ? `${m.bg} border-current ${m.filterColor} shadow-md`
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <Icon className={`w-6 h-6 ${m.color}`} />
            <div className="text-right">
              <div className={`text-2xl font-black ${m.filterColor}`}>
                {count}
              </div>
              <div className="text-xs text-slate-600 font-medium">{m.label}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}