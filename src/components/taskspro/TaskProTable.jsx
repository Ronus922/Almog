import React from "react";
import { format } from "date-fns";
import { Pencil, Trash2, Archive, RotateCcw, ChevronUp, ChevronDown, ChevronsUpDown, Repeat2, FileText, ClipboardList } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const PRIORITY_STYLE = {
  "גבוהה": "bg-red-100 text-red-700 border-red-200",
  "בינונית": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "נמוכה": "bg-green-100 text-green-700 border-green-200",
};
const STATUS_STYLE = {
  "פתוחה": "bg-blue-100 text-blue-700 border-blue-200",
  "בטיפול": "bg-orange-100 text-orange-700 border-orange-200",
  "הושלמה": "bg-green-100 text-green-700 border-green-200",
  "בוטלה": "bg-slate-100 text-slate-600 border-slate-200",
  "ממתינה": "bg-purple-100 text-purple-700 border-purple-200",
};
const SOURCE_ICON = {
  "manual": null,
  "template": <FileText className="w-3.5 h-3.5 text-violet-500" title="מתבנית" />,
  "recurring": <Repeat2 className="w-3.5 h-3.5 text-blue-500" title="מחזורית" />,
};

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <th
      className="text-right px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:bg-slate-100 transition-colors whitespace-nowrap"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
          : <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300" />}
      </span>
    </th>
  );
}

const ASSIGNED_BY_DISPLAY = (name, email) => {
  if (email === "r@bios.co.il" || name === "r@bios.co.il") return "רונן משולם";
  return name || email || "—";
};

export default function TaskProTable({
  tasks = [], isLoading, sortField, sortDir, onSort,
  onRowClick, onEdit, onDelete, onArchive, onUnarchive,
  onUpdateStatus, onUpdatePriority,
  selectedIds, onToggleSelect, onToggleSelectAll,
  isAdmin, attendeesMap = {}, currentUsername = ""
}) {
  const today = getTodayStr();

  const dueDateStyle = (t) => {
    if (t.status === "הושלמה" || t.status === "בוטלה") return "text-slate-400";
    if (!t.due_at) return "text-slate-500";
    const d = t.due_at.slice(0, 10);
    if (d < today) return "text-red-600 font-semibold";
    if (d === today) return "text-orange-500 font-semibold";
    return "text-slate-600";
  };

  const fmt = (dt) => {
    if (!dt) return "—";
    try { return format(new Date(dt), "dd/MM/yyyy"); } catch { return "—"; }
  };

  const allSelected = tasks.length > 0 && tasks.every((t) => selectedIds.has(t.id));

  if (isLoading) return <div className="py-20 text-center text-slate-400">טוען משימות...</div>;

  if (tasks.length === 0) return (
    <div className="py-20 text-center text-slate-400">
      <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">אין משימות להצגה</p>
    </div>
  );

  return (
    <div className="overflow-x-auto" dir="rtl">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gradient-to-l from-slate-100 to-slate-50 border-b-2 border-slate-200">
            <th className="px-4 py-3.5 w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => onToggleSelectAll(v)}
              />
            </th>
            <SortHeader label="כותרת / משימה" field="title" sortField={sortField} sortDir={sortDir} onSort={onSort} />
            <SortHeader label="משויך" field="assigned_to_name" sortField={sortField} sortDir={sortDir} onSort={onSort} />
            <th className="text-right px-4 py-3.5 font-semibold text-slate-600 whitespace-nowrap text-xs uppercase tracking-wide">משתתפים</th>
            <SortHeader label="תאריך יעד" field="due_at" sortField={sortField} sortDir={sortDir} onSort={onSort} />
            <SortHeader label="עדיפות" field="priority" sortField={sortField} sortDir={sortDir} onSort={onSort} />
            <SortHeader label="סטטוס" field="status" sortField={sortField} sortDir={sortDir} onSort={onSort} />
            <th className="text-right px-4 py-3.5 font-semibold text-slate-600 whitespace-nowrap text-xs uppercase tracking-wide">מקור</th>
            <th className="text-right px-4 py-3.5 font-semibold text-slate-600 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((task, idx) => {
            const isOverdue = task.due_at && task.due_at.slice(0,10) < today && task.status !== "הושלמה" && task.status !== "בוטלה";
            const attendees = attendeesMap[task.id] || [];
            const canEditPriority = task.created_by === currentUsername || !task.created_by;

            return (
              <tr
                key={task.id}
                className={`transition-all cursor-pointer group ${
                  task.is_archived ? "opacity-50 bg-slate-50/80" :
                  isOverdue ? "bg-red-50/40 hover:bg-red-50/70" :
                  idx % 2 === 0 ? "bg-white hover:bg-blue-50/30" : "bg-slate-50/40 hover:bg-blue-50/30"
                } ${selectedIds.has(task.id) ? "!bg-blue-50 ring-1 ring-inset ring-blue-200" : ""}`}
                onClick={() => onRowClick(task)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(task.id)}
                    onCheckedChange={() => onToggleSelect(task.id)}
                  />
                </td>

                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-800">{task.title}</span>
                      {SOURCE_ICON[task.source]}
                    </div>
                    <div className="text-xs text-slate-500">{task.task_type}</div>
                    {task.apartment_number && (
                      <div className="text-xs text-slate-400">דירה {task.apartment_number}{task.owner_name ? ` – ${task.owner_name}` : ""}</div>
                    )}
                    {task.description && (
                      <div className="text-xs text-slate-400 truncate max-w-xs">{task.description}</div>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-slate-700 text-sm">
                      {ASSIGNED_BY_DISPLAY(task.assigned_to_name, task.assigned_to)}
                    </span>
                    {task.assigned_by && (
                      <span className="text-xs text-slate-400">
                        ע"י {ASSIGNED_BY_DISPLAY(task.assigned_by_name, task.assigned_by)}
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3">
                  {attendees.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {attendees.slice(0, 3).map((a) => (
                        <span key={a.id} className="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                          {a.user_name || a.user_username}
                        </span>
                      ))}
                      {attendees.length > 3 && (
                        <span className="text-xs text-slate-400">+{attendees.length - 3}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>

                <td className={`px-4 py-3 whitespace-nowrap ${dueDateStyle(task)}`}>
                  {fmt(task.due_at)}
                </td>

                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <Select value={task.priority} onValueChange={(v) => onUpdatePriority(task.id, v)}>
                    <SelectTrigger className={`w-24 h-7 text-xs font-semibold border ${PRIORITY_STYLE[task.priority] || ""}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["גבוהה","בינונית","נמוכה"].map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <Select value={task.status} onValueChange={(v) => onUpdateStatus(task.id, v)}>
                    <SelectTrigger className={`w-28 h-7 text-xs font-semibold border ${STATUS_STYLE[task.status] || ""}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["פתוחה","בטיפול","הושלמה","בוטלה","ממתינה"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                <td className="px-4 py-3">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    {SOURCE_ICON[task.source]}
                    {{ manual: "ידנית", template: "מתבנית", recurring: "מחזורית" }[task.source] || "ידנית"}
                  </span>
                </td>

                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5 justify-end">
                    <button onClick={() => onEdit(task)} className="text-slate-300 hover:text-blue-600 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {task.is_archived ? (
                      <button onClick={() => onUnarchive(task)} className="text-slate-300 hover:text-green-600 transition-colors">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={() => onArchive(task)} className="text-slate-300 hover:text-orange-500 transition-colors">
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => onDelete(task.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}