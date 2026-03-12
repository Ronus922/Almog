import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, CheckCircle2, Clock, AlertTriangle, ClipboardList, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { isManagerRole } from "@/components/utils/roles";
import { PriorityBadge, StatusBadge, TaskTypeIcon } from "@/components/tasks/TaskBadge";
import TaskFormDialog from "@/components/tasks/TaskFormDialog";
import { format, isPast, isToday } from "date-fns";

export default function Tasks() {
  const { currentUser } = useAuth();
  const isAdmin = isManagerRole(currentUser);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("פתוחה");
  const [filterPriority, setFilterPriority] = useState("הכל");
  const [showDialog, setShowDialog] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-due_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const quickComplete = useMutation({
    mutationFn: (task) => base44.entities.Task.update(task.id, { status: "הושלמה", completed_at: new Date().toISOString() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterStatus !== "הכל" && t.status !== filterStatus) return false;
      if (filterPriority !== "הכל" && t.priority !== filterPriority) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          t.apartment_number?.includes(s) ||
          t.owner_name?.toLowerCase().includes(s) ||
          t.description?.toLowerCase().includes(s) ||
          t.task_type?.includes(s) ||
          t.assigned_to?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [tasks, filterStatus, filterPriority, search]);

  // KPI
  const openTasks = tasks.filter(t => t.status === "פתוחה" || t.status === "בטיפול");
  const overdue = openTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
  const dueToday = openTasks.filter(t => t.due_date && isToday(new Date(t.due_date)));
  const highPriority = openTasks.filter(t => t.priority === "גבוהה");

  const getDueDateStyle = (task) => {
    if (task.status === "הושלמה" || task.status === "בוטלה") return "text-slate-400";
    if (!task.due_date) return "";
    const d = new Date(task.due_date);
    if (isPast(d) && !isToday(d)) return "text-red-600 font-semibold";
    if (isToday(d)) return "text-orange-500 font-semibold";
    return "text-slate-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">משימות לטיפול</h1>
            <p className="text-sm text-slate-500 mt-1">{openTasks.length} משימות פתוחות</p>
          </div>
          {isAdmin && (
            <Button onClick={() => { setEditTask(null); setShowDialog(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              משימה חדשה
            </Button>
          )}
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg"><ClipboardList className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{openTasks.length}</p>
                <p className="text-xs text-slate-500">משימות פתוחות</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
              <div>
                <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
                <p className="text-xs text-slate-500">באיחור</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg"><Clock className="w-5 h-5 text-orange-500" /></div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{dueToday.length}</p>
                <p className="text-xs text-slate-500">ליום זה</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg"><AlertTriangle className="w-5 h-5 text-purple-500" /></div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{highPriority.length}</p>
                <p className="text-xs text-slate-500">עדיפות גבוהה</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pr-9"
                  placeholder="חיפוש לפי דירה, שם, תיאור..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["הכל", "פתוחה", "בטיפול", "הושלמה", "בוטלה"].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["הכל", "גבוהה", "בינונית", "נמוכה"].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Task List */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400">טוען משימות...</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>אין משימות להצגה</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map(task => (
                  <div key={task.id} className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors">
                    {/* Complete button */}
                    {isAdmin && (task.status === "פתוחה" || task.status === "בטיפול") && (
                      <button
                        onClick={() => quickComplete.mutate(task)}
                        title="סמן כהושלם"
                        className="mt-0.5 text-slate-300 hover:text-green-500 transition-colors flex-shrink-0"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <TaskTypeIcon type={task.task_type} />
                        <span className="font-semibold text-slate-800">{task.task_type}</span>
                        <StatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} />
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-1">
                        <span className="font-medium">דירה {task.apartment_number}</span>
                        {task.owner_name && <span className="text-slate-500">– {task.owner_name}</span>}
                        {task.assigned_to && <span className="text-blue-600">👤 {task.assigned_to}</span>}
                      </div>
                      {task.description && (
                        <p className="text-sm text-slate-500 truncate">{task.description}</p>
                      )}
                    </div>

                    {/* Due date + actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {task.due_date && (
                        <span className={`text-sm ${getDueDateStyle(task)}`}>
                          {format(new Date(task.due_date), "dd/MM/yyyy")}
                        </span>
                      )}
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button onClick={() => { setEditTask(task); setShowDialog(true); }} className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteMutation.mutate(task.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TaskFormDialog
        open={showDialog}
        onClose={() => { setShowDialog(false); setEditTask(null); }}
        task={editTask}
        debtorRecord={null}
        currentUser={currentUser}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
      />
    </div>
  );
}