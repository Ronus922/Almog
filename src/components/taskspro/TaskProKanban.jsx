import React from "react";
import { format } from "date-fns";
import { Repeat2, FileText } from "lucide-react";

const COLUMNS = [
  { key: "פתוחה",  label: "פתוחה",  color: "border-t-blue-500",   bg: "bg-blue-50" },
  { key: "בטיפול", label: "בטיפול", color: "border-t-orange-500", bg: "bg-orange-50" },
  { key: "ממתינה", label: "ממתינה", color: "border-t-purple-500", bg: "bg-purple-50" },
  { key: "הושלמה", label: "הושלמה", color: "border-t-green-500",  bg: "bg-green-50" },
  { key: "בוטלה",  label: "בוטלה",  color: "border-t-slate-400",  bg: "bg-slate-50" },
];

const PRIORITY_DOT = { "גבוהה": "bg-red-500", "בינונית": "bg-yellow-400", "נמוכה": "bg-green-500" };

export default function TaskProKanban({ tasks = [], onRowClick }) {
  const byStatus = {};
  COLUMNS.forEach((c) => { byStatus[c.key] = []; });
  tasks.forEach((t) => {
    if (byStatus[t.status]) byStatus[t.status].push(t);
  });

  const fmt = (dt) => {
    if (!dt) return null;
    try { return format(new Date(dt), "dd/MM/yy"); } catch { return null; }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" dir="rtl">
      {COLUMNS.map(({ key, label, color, bg }) => (
        <div key={key} className="flex-shrink-0 w-64">
          <div className={`rounded-xl border-2 border-t-4 ${color} border-slate-200 bg-white shadow-sm overflow-hidden`}>
            <div className={`px-3 py-2 ${bg} border-b border-slate-100 flex items-center justify-between`}>
              <span className="text-sm font-bold text-slate-700">{label}</span>
              <span className="text-xs bg-white border border-slate-200 text-slate-500 rounded-full px-2 py-0.5 font-semibold">
                {byStatus[key].length}
              </span>
            </div>
            <div className="p-2 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {byStatus[key].length === 0 && (
                <p className="text-center text-xs text-slate-300 py-4">אין משימות</p>
              )}
              {byStatus[key].map((task) => (
                <div
                  key={task.id}
                  onClick={() => onRowClick(task)}
                  className="bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[task.priority] || "bg-slate-300"}`} />
                    <p className="text-sm font-medium text-slate-800 leading-snug">{task.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-400">{task.task_type}</span>
                    {task.source === "recurring" && <Repeat2 className="w-3 h-3 text-blue-400" />}
                    {task.source === "template" && <FileText className="w-3 h-3 text-violet-400" />}
                  </div>
                  {task.apartment_number && (
                    <p className="text-xs text-slate-400">דירה {task.apartment_number}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{task.assigned_to_name || "—"}</span>
                    {task.due_at && <span className={task.due_at.slice(0,10) < new Date().toISOString().slice(0,10) ? "text-red-500 font-semibold" : ""}>{fmt(task.due_at)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}