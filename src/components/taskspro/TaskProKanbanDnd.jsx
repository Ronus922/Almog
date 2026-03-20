import React, { useState } from "react";
import { format } from "date-fns";
import { Repeat2, FileText, Edit2, Trash2, Eye } from "lucide-react";
import { updateTask } from "./taskProApi";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const COLUMNS = [
  { key: "פתוחה", label: "פתוחה", color: "border-t-blue-500", bg: "bg-blue-50" },
  { key: "בטיפול", label: "בטיפול", color: "border-t-orange-500", bg: "bg-orange-50" },
  { key: "הושלמה", label: "הושלמה", color: "border-t-green-500", bg: "bg-green-50" },
];

const PRIORITY_DOT = { "דחופה": "bg-red-500", "גבוהה": "bg-yellow-400", "נמוכה": "bg-green-500" };

export default function TaskProKanbanDnd({
  tasks = [],
  onRowClick,
  onEdit,
  onDelete,
  onViewFiles,
  currentUser
}) {
  const queryClient = useQueryClient();
  const [draggedTask, setDraggedTask] = useState(null);
  const [updating, setUpdating] = useState(null);

  const byStatus = {};
  COLUMNS.forEach((c) => {
    byStatus[c.key] = [];
  });
  tasks.forEach((t) => {
    if (byStatus[t.status]) byStatus[t.status].push(t);
  });

  const fmt = (dt) => {
    if (!dt) return null;
    try {
      return format(new Date(dt), "dd/MM/yy");
    } catch {
      return null;
    }
  };

  const canEdit = (task) => task.created_by === currentUser?.username;

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    if (!draggedTask) return;

    if (draggedTask.status === targetStatus) {
      setDraggedTask(null);
      return;
    }

    setUpdating(draggedTask.id);
    try {
      await updateTask(draggedTask.id, { status: targetStatus });
      queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
      toast.success("המשימה הועברה בהצלחה");
    } catch (err) {
      toast.error("שגיאה בהעברת המשימה");
    } finally {
      setUpdating(null);
      setDraggedTask(null);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid grid-cols-3 gap-4 pb-4" dir="rtl">
      {COLUMNS.map(({ key, label, color, bg }) => (
        <div
          key={key}
          className="min-w-0"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, key)}
        >
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
              {byStatus[key].map((task) => {
                const isDueOverdue = task.due_at?.slice(0, 10) < today && task.status !== "הושלמה" && task.status !== "בוטלה";
                const isDueToday = task.due_at?.slice(0, 10) === today;

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onClick={() => onRowClick(task)}
                    className={`bg-white rounded-lg border p-3 space-y-2 cursor-move hover:shadow-md hover:border-blue-300 transition-all ${
                      draggedTask?.id === task.id ? "opacity-50" : ""
                    } ${updating === task.id ? "opacity-75" : ""}`}
                    style={{
                      borderColor: isDueOverdue ? "#ef4444" : isDueToday ? "#f59e0b" : undefined,
                      borderWidth: isDueOverdue || isDueToday ? "2px" : "1px"
                    }}
                  >
                    {/* כותרת */}
                    <div className="flex items-start gap-2">
                      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[task.priority] || "bg-slate-300"}`} />
                      <p className="text-sm font-medium text-slate-800 leading-snug flex-1">{task.title}</p>
                    </div>

                    {/* אייקונים וסימנים */}
                    <div className="flex items-center gap-1.5 flex-wrap text-slate-400">
                      {task.is_recurring_instance && <Repeat2 className="w-3.5 h-3.5 text-blue-500" title="משימה מחזורית" />}
                      {task.source === "template" && <FileText className="w-3 h-3 text-violet-400" />}
                    </div>

                    {/* דירה */}
                    {task.apartment_number && (
                      <p className="text-xs text-slate-400">דירה {task.apartment_number}</p>
                    )}

                    {/* תאריך ומידע בתחתית */}
                    <div className="flex items-center justify-between text-xs gap-1">
                      <span className="text-slate-400 truncate">{task.assigned_to_name || "—"}</span>
                      {task.due_at && (
                        <span
                          className={`flex-shrink-0 font-semibold ${
                            isDueOverdue ? "text-red-500" : isDueToday ? "text-amber-500" : "text-slate-400"
                          }`}
                        >
                          {fmt(task.due_at)}
                        </span>
                      )}
                    </div>

                    {/* כפתורים פעולה */}
                    <div className="flex gap-1.5 pt-1 border-t border-slate-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewFiles?.(task);
                        }}
                        className="flex-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      {canEdit(task) && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit?.(task);
                            }}
                            className="flex-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("למחוק משימה זו לצמיתות?")) {
                                onDelete?.(task.id);
                              }
                            }}
                            className="flex-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}