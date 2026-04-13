import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { format } from "date-fns";
import { Repeat2, GripVertical, Eye, Pencil, Trash2, MapPin, AlertCircle } from "lucide-react";
import { updateTask } from "./taskProApi";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const COLUMNS = [
  { id: "פתוחה",  label: "פתוחה",  color: "border-t-blue-400",  count_color: "bg-blue-100 text-blue-700" },
  { id: "בטיפול", label: "בטיפול", color: "border-t-amber-400", count_color: "bg-amber-100 text-amber-700" },
  { id: "הושלמה", label: "הושלמה", color: "border-t-green-400", count_color: "bg-green-100 text-green-700" },
];

const PRIORITY_MAP = {
  "דחופה": { dot: "bg-red-500",    label: "דחופה" },
  "גבוהה": { dot: "bg-orange-400", label: "גבוהה" },
  "נמוכה": { dot: "bg-blue-400",   label: "נמוכה" },
};

function TaskCard({ task, index, onRowClick, onEdit, onDelete, currentUser }) {
  const p = PRIORITY_MAP[task.priority] || PRIORITY_MAP["נמוכה"];
  const canEdit = task.created_by === currentUser?.username || currentUser?.role === "SUPER_ADMIN";
  const today = new Date().toISOString().slice(0, 10);
  const dueStr = task.due_at?.slice(0, 10);
  const isOverdue = dueStr && dueStr < today && task.status !== "הושלמה" && task.status !== "בוטלה";

  const fmtDate = (dt) => {
    try { return format(new Date(dt), "dd/MM/yy"); } catch { return ""; }
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={() => onRowClick(task)}
          className={`bg-white rounded-xl border border-slate-200 shadow-sm mb-2 overflow-hidden transition-shadow cursor-pointer ${snapshot.isDragging ? "shadow-xl rotate-1 scale-105" : "hover:shadow-md"}`}
        >
          <div
            {...provided.dragHandleProps}
            className="flex flex-row-reverse items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/60 cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${p.dot}`}></span>
              <span className="text-xs font-semibold text-slate-500">{p.label}</span>
            </div>
            <GripVertical className="w-4 h-4 text-slate-300" />
          </div>

          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {task.apartment_number && <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                <span className="font-bold text-slate-800 text-sm">
                  {task.apartment_number ? `חדר ${task.apartment_number}` : task.title}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); onRowClick(task); }} className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-blue-400 hover:bg-blue-50 transition-colors" title="צפה בפרטים">
                  <Eye className="w-3.5 h-3.5" />
                </button>
                {canEdit && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-colors" title="עריכה">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(task.id, task.title || task.task_type); }} className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors" title="מחוק">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {task.apartment_number && (
              <p className="text-xs text-slate-600 leading-relaxed font-medium">{task.title}</p>
            )}

            {task.description && (
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{task.description}</p>
            )}

            {task.is_recurring_instance && (
              <div className="flex items-center gap-1">
                <Repeat2 className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-blue-400">מחזורית</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-0.5 text-xs text-slate-400">
              <span>מדווח: {task.assigned_by_name || task.assigned_by || "לא צוין"}</span>
              <span className={isOverdue ? "text-red-500 font-semibold" : ""}>
                {dueStr ? fmtDate(task.due_at) : (task.created_date ? fmtDate(task.created_date) : "")}
              </span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

function KanbanColumn({ col, tasks, onRowClick, onEdit, onDelete, currentUser }) {
  return (
    <div className="w-full flex-shrink-0 md:flex-1 md:min-w-0 flex flex-col">
      <div className={`rounded-t-2xl border-t-4 ${col.color} bg-white border border-slate-200 px-4 py-3 flex items-center justify-between`}>
        <span className="font-black text-slate-700 text-base">{col.label}</span>
        <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${col.count_color}`}>{tasks.length}</span>
      </div>
      <Droppable droppableId={col.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[300px] rounded-b-2xl border border-t-0 border-slate-200 p-3 transition-colors ${snapshot.isDraggingOver ? "bg-blue-50/40" : "bg-slate-50/60"}`}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center h-24 text-slate-300">
                <AlertCircle className="w-7 h-7 mb-1.5 opacity-40" />
                <p className="text-xs">אין משימות</p>
              </div>
            )}
            {tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} onRowClick={onRowClick} onEdit={onEdit} onDelete={onDelete} currentUser={currentUser} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function TaskProKanbanDnd({ tasks = [], onRowClick, onEdit, onDelete, currentUser }) {
  const queryClient = useQueryClient();
  const [mobileTab, setMobileTab] = useState("פתוחה");

  const byStatus = {};
  COLUMNS.forEach((c) => { byStatus[c.id] = []; });
  tasks.forEach((t) => {
    if (byStatus[t.status]) byStatus[t.status].push(t);
  });

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    try {
      await updateTask(draggableId, { status: destination.droppableId });
      queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
      toast.success("המשימה הועברה בהצלחה");
    } catch {
      toast.error("שגיאה בהעברת המשימה");
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div dir="rtl">
        <div className="md:hidden">
          <div className="flex bg-white rounded-t-2xl border border-slate-200 overflow-hidden">
            {COLUMNS.map(col => (
              <button
                key={col.id}
                onClick={() => setMobileTab(col.id)}
                className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${mobileTab === col.id ? "border-blue-500 text-blue-600 bg-blue-50/30" : "border-transparent text-slate-500"}`}
              >
                {col.label}
                <span className={`mr-1 px-1.5 rounded-full text-[10px] ${col.count_color}`}>
                  {(byStatus[col.id] || []).length}
                </span>
              </button>
            ))}
          </div>
          {COLUMNS.filter(c => c.id === mobileTab).map(col => (
            <KanbanColumn key={col.id} col={col} tasks={byStatus[col.id] || []} onRowClick={onRowClick} onEdit={onEdit} onDelete={onDelete} currentUser={currentUser} />
          ))}
        </div>
        <div className="hidden md:flex gap-3 items-start pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn key={col.id} col={col} tasks={byStatus[col.id] || []} onRowClick={onRowClick} onEdit={onEdit} onDelete={onDelete} currentUser={currentUser} />
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}