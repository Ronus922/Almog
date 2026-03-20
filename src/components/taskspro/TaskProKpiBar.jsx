import React, { useMemo } from "react";
import { AlertCircle, Clock, RefreshCw } from "lucide-react";

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const METRICS = [
  {
    key: "open",
    label: "משימות פתוחות",
    icon: AlertCircle,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    key: "inwork",
    label: "בטיפול",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    key: "urgent",
    label: "דחוף",
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-100",
  },
  {
    key: "recurring",
    label: "משימות מחזוריות",
    icon: RefreshCw,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-100",
  },
];

export default function TaskProKpiBar({
  tasks = [],
  currentUsername = "",
  activeFilter = null,
  onFilterChange = () => {},
}) {
  const today = getTodayStr();

  const counts = useMemo(() => ({
    open: tasks.filter((t) => t.status === "פתוחה").length,
    inwork: tasks.filter((t) => t.status === "בטיפול").length,
    urgent: tasks.filter((t) => t.priority === "דחופה" && (t.status === "פתוחה" || t.status === "בטיפול")).length,
    recurring: tasks.filter((t) => t.recurrence_rule_id !== null && t.recurrence_rule_id !== undefined).length,
  }), [tasks]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" dir="rtl">
      {METRICS.map((m) => {
        const Icon = m.icon;
        const count = counts[m.key];

        return (
          <div
            key={m.key}
            onClick={() => onFilterChange(m.key)}
            className={`rounded-2xl border ${m.border} bg-white p-4 cursor-pointer hover:shadow-md transition-all flex items-center justify-between shadow-sm`}
          >
            <div>
              <p className={`text-3xl font-black ${m.color}`}>{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{m.label}</p>
            </div>
            <div className={`p-2.5 rounded-xl ${m.bg}`}>
              <Icon className={`w-5 h-5 ${m.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}