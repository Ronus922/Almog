import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS_HE = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
const PRIORITY_DOT = { "גבוהה": "bg-red-500", "בינונית": "bg-yellow-400", "נמוכה": "bg-green-400" };

export default function TaskProCalendarView({ tasks = [], onTaskClick }) {
  const [current, setCurrent] = useState(new Date());

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // pad to start on Sunday
  const startDow = monthStart.getDay(); // 0=Sun
  const padded = [...Array(startDow).fill(null), ...days];

  const getTasksForDay = (day) =>
    tasks.filter((t) => t.due_at && isSameDay(new Date(t.due_at), day));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <button onClick={() => setCurrent((d) => subMonths(d, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </button>
        <h3 className="text-base font-bold text-slate-800">
          {format(current, "MMMM yyyy")}
        </h3>
        <button onClick={() => setCurrent((d) => addMonths(d, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
        {DAYS_HE.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {padded.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} className="min-h-24 border-b border-l border-slate-100" />;
          const dayTasks = getTasksForDay(day);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={`min-h-24 p-1.5 border-b border-l border-slate-100 ${isToday ? "bg-blue-50" : ""}`}
            >
              <span className={`inline-flex w-6 h-6 items-center justify-center text-xs font-semibold rounded-full mb-1 ${isToday ? "bg-blue-600 text-white" : "text-slate-600"}`}>
                {format(day, "d")}
              </span>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onTaskClick(t)}
                    className="w-full text-right text-xs truncate px-1.5 py-0.5 rounded flex items-center gap-1 hover:opacity-80 transition-opacity"
                    style={{ background: t.status === "הושלמה" ? "#dcfce7" : t.status === "בוטלה" ? "#f1f5f9" : "#eff6ff" }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority] || "bg-slate-300"}`} />
                    <span className="truncate text-slate-700">{t.title}</span>
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-xs text-slate-400 pr-1">+{dayTasks.length - 3} נוספות</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}