import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, CheckCircle2, Clock, AlertTriangle, ClipboardList, Trash2, Pencil, UserPlus, Filter, X, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { isManagerRole } from "@/components/utils/roles";
import { StatusBadge } from "@/components/tasks/TaskBadge";
import TaskFormDialog from "@/components/tasks/TaskFormDialog";
import { format, isPast, isToday } from "date-fns";

function SortableHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <th
      className="text-right px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:bg-slate-100 transition-colors"
      onClick={() => onSort(field)}>

      <span className="inline-flex items-center gap-1">
        {label}
        {active ?
        sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" /> :

        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300" />
        }
      </span>
    </th>);

}

export default function Tasks() {
  const { currentUser } = useAuth();
  const isAdmin = isManagerRole(currentUser);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("הכל");
  const [filterPriority, setFilterPriority] = useState("הכל");
  const [filterAssigned, setFilterAssigned] = useState("הכל");
  const [filterDueDate, setFilterDueDate] = useState("");
  const [filterTaskType, setFilterTaskType] = useState("הכל");
  const [showFilters, setShowFilters] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-created_date")
  });

  const { data: appUsers = [] } = useQuery({
    queryKey: ["appUsers"],
    queryFn: () => base44.entities.AppUser.list()
  });

  const userNameMap = useMemo(() => {
    const map = {};
    appUsers.forEach((u) => {
      const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ");
      if (u.username) map[u.username] = fullName;
      if (u.email) map[u.email] = fullName;
    });
    return map;
  }, [appUsers]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] })
  });

  const quickComplete = useMutation({
    mutationFn: (task) => base44.entities.Task.update(task.id, { status: "הושלמה", completed_at: new Date().toISOString() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] })
  });

  const updateStatus = useMutation({
    mutationFn: ({ taskId, status }) => base44.entities.Task.update(taskId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] })
  });

  const updatePriority = useMutation({
    mutationFn: ({ taskId, priority }) => base44.entities.Task.update(taskId, { priority }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] })
  });

  // סינון לפי המשתמש המחובר - רואה רק משימות שיצר או שהוקצו אליו
  const myTasks = useMemo(() => {
    const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
    if (isSuperAdmin) return tasks; // סופר אדמין רואה הכל
    const username = currentUser?.username;
    if (!username) return [];
    return tasks.filter((t) => t.assigned_to === username);
  }, [tasks, currentUser]);

  const assignedOptions = useMemo(() => {
    const names = [...new Set(myTasks.map((t) => t.assigned_to_name || t.assigned_to).filter(Boolean))];
    return names.sort();
  }, [myTasks]);

  const filtered = useMemo(() => {
    return myTasks.filter((t) => {
      if (filterStatus !== "הכל" && t.status !== filterStatus) return false;
      if (filterPriority !== "הכל" && t.priority !== filterPriority) return false;
      if (filterAssigned !== "הכל" && (t.assigned_to_name || t.assigned_to) !== filterAssigned) return false;
      if (filterTaskType !== "הכל" && t.task_type !== filterTaskType) return false;
      if (filterDueDate && t.due_date !== filterDueDate) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          t.apartment_number?.includes(s) ||
          t.owner_name?.toLowerCase().includes(s) ||
          t.description?.toLowerCase().includes(s) ||
          t.task_type?.includes(s) ||
          t.assigned_to_name?.toLowerCase().includes(s));

      }
      return true;
    });
  }, [myTasks, filterStatus, filterPriority, filterAssigned, filterDueDate, filterTaskType, search]);

  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      let av, bv;
      if (sortField === "task_type") {av = a.task_type || "";bv = b.task_type || "";} else
      if (sortField === "assigned") {av = a.assigned_to_name || a.assigned_to || "";bv = b.assigned_to_name || b.assigned_to || "";} else
      if (sortField === "due_date") {av = a.due_date || "";bv = b.due_date || "";} else
      if (sortField === "status") {av = a.status || "";bv = b.status || "";} else
      if (sortField === "priority") {
        const order = { "גבוהה": 1, "בינונית": 2, "נמוכה": 3 };
        av = order[a.priority] || 9;bv = order[b.priority] || 9;
        return sortDir === "asc" ? av - bv : bv - av;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  const openTasks = myTasks.filter((t) => t.status === "פתוחה" || t.status === "בטיפול");
  const overdue = openTasks.filter((t) => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
  const dueToday = openTasks.filter((t) => t.due_date && isToday(new Date(t.due_date)));

  const getDueDateStyle = (task) => {
    if (task.status === "הושלמה" || task.status === "בוטלה") return "text-slate-400";
    if (!task.due_date) return "text-slate-600";
    const d = new Date(task.due_date);
    if (isPast(d) && !isToday(d)) return "text-red-600 font-semibold";
    if (isToday(d)) return "text-orange-500 font-semibold";
    return "text-slate-600";
  };

  const formatDateTime = (dt) => {
    if (!dt) return "-";
    try {return format(new Date(dt), "dd-MM-yyyy HH:mm");} catch {return "-";}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">משימות לטיפול</h1>
            <p className="text-sm text-slate-500 mt-1">{openTasks.length} משימות פתוחות</p>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-4">
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
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pr-9"
                  placeholder="חיפוש"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)} />

              </div>
              <Button
                variant="outline" size="sm"
                className={`gap-1.5 ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
                onClick={() => setShowFilters((v) => !v)}>

                <Filter className="w-4 h-4" />
              </Button>
              <Button 
                onClick={() => {setEditTask(null);setShowDialog(true);}} 
                className="bg-[#3563d0] text-primary-foreground px-4 py-2 text-sm font-medium rounded-md ] inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90 h-9 gap-2"
              >
                <Plus className="w-4 h-4" />
                צור חדש
              </Button>
            </div>

            {showFilters &&
            <div className="flex flex-wrap gap-3 items-center pt-2 border-t border-slate-100">
                <Select value={filterTaskType} onValueChange={setFilterTaskType}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="תיאור משימה" /></SelectTrigger>
                  <SelectContent>
                    {["הכל", "שיחת טלפון", "שליחת מכתב התראה", "פגישה", "מעקב תשלום", "הגשת תביעה", "אחר"].map((s) =>
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                  )}
                  </SelectContent>
                </Select>

                <Select value={filterAssigned} onValueChange={setFilterAssigned}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="עובד" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="הכל">כל העובדים</SelectItem>
                    {assignedOptions.map((name) =>
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                  )}
                  </SelectContent>
                </Select>

                <Input
                type="date"
                className="w-44"
                value={filterDueDate}
                onChange={(e) => setFilterDueDate(e.target.value)} />


                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="סטטוס" /></SelectTrigger>
                  <SelectContent>
                    {["הכל", "פתוחה", "בטיפול", "הושלמה", "בוטלה"].map((s) =>
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                  )}
                  </SelectContent>
                </Select>

                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="עדיפות" /></SelectTrigger>
                  <SelectContent>
                    {["הכל", "גבוהה", "בינונית", "נמוכה"].map((p) =>
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                  )}
                  </SelectContent>
                </Select>

                {(filterStatus !== "הכל" || filterPriority !== "הכל" || filterAssigned !== "הכל" || filterDueDate || filterTaskType !== "הכל") &&
              <Button variant="ghost" size="sm" className="text-slate-400 gap-1" onClick={() => {
                setFilterStatus("הכל");setFilterPriority("הכל");
                setFilterAssigned("הכל");setFilterDueDate("");setFilterTaskType("הכל");
              }}>
                    <X className="w-3.5 h-3.5" /> נקה
                  </Button>
              }
              </div>
            }
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-0">
            {isLoading ?
            <div className="py-16 text-center text-slate-400">טוען משימות...</div> :
            sorted.length === 0 ?
            <div className="py-16 text-center text-slate-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>אין משימות להצגה</p>
              </div> :

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-right px-4 py-3 font-semibold text-slate-600 w-10"></th>
                      <SortableHeader label="תיאור המשימה" field="task_type" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <SortableHeader label="עובד" field="assigned" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <SortableHeader label="תאריך לביצוע" field="due_date" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <SortableHeader label="עדיפות" field="priority" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <SortableHeader label="סטטוס" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">תאריך יצירה</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sorted.map((task) =>
                  <tr
                    key={task.id}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                    onClick={() => {setEditTask(task);setShowDialog(true);}}>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                          onClick={() => {setEditTask(task);setShowDialog(true);}}
                          className="text-slate-400 hover:text-blue-600 transition-colors">

                              <Pencil className="w-4 h-4" />
                            </button>
                            {(task.assigned_by === currentUser?.username || task.assigned_by === currentUser?.email) &&
                        <button
                          onClick={() => {if (window.confirm("למחוק משימה זו?")) deleteMutation.mutate(task.id);}}
                          className="text-slate-300 hover:text-red-500 transition-colors">

                                <Trash2 className="w-4 h-4" />
                              </button>
                        }
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{task.task_type}</div>
                          {task.owner_name &&
                      <div className="text-xs text-slate-400 mt-0.5">
                              דירה {task.apartment_number} – {task.owner_name}
                            </div>
                      }
                          {task.description &&
                      <div className="text-xs text-slate-400 truncate max-w-xs">{task.description}</div>
                      }
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-slate-700">
                            {task.assigned_to_name || task.assigned_to || "-"}
                          </div>
                          {task.assigned_by &&
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <UserPlus className="w-3 h-3" />
                              {userNameMap[task.assigned_by] || task.assigned_by}
                            </div>
                      }
                        </td>

                        <td className={`px-4 py-3 ${getDueDateStyle(task)}`}>
                          {task.due_date ? formatDateTime(task.due_date + "T00:00:00") : "-"}
                        </td>

                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                           <Select value={task.priority} onValueChange={(value) => updatePriority.mutate({ taskId: task.id, priority: value })}>
                             <SelectTrigger className={`w-28 h-8 text-xs font-semibold ${
                               task.priority === "גבוהה" ? "bg-red-100 text-red-700 border-red-300" :
                               task.priority === "בינונית" ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                               "bg-green-100 text-green-700 border-green-300"
                             }`}>
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="גבוהה"><span className="text-red-700 font-semibold">● גבוהה</span></SelectItem>
                               <SelectItem value="בינונית"><span className="text-yellow-700 font-semibold">● בינונית</span></SelectItem>
                               <SelectItem value="נמוכה"><span className="text-green-700 font-semibold">● נמוכה</span></SelectItem>
                             </SelectContent>
                           </Select>
                         </td>

                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                           <Select value={task.status} onValueChange={(value) => updateStatus.mutate({ taskId: task.id, status: value })}>
                             <SelectTrigger className={`w-28 h-8 text-xs font-semibold ${
                               task.status === "פתוחה" ? "bg-blue-100 text-blue-700 border-blue-300" :
                               task.status === "בטיפול" ? "bg-orange-100 text-orange-700 border-orange-300" :
                               task.status === "הושלמה" ? "bg-green-100 text-green-700 border-green-300" :
                               "bg-slate-100 text-slate-700 border-slate-300"
                             }`}>
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="פתוחה"><span className="text-blue-700 font-semibold">● פתוחה</span></SelectItem>
                               <SelectItem value="בטיפול"><span className="text-orange-700 font-semibold">● בטיפול</span></SelectItem>
                               <SelectItem value="הושלמה"><span className="text-green-700 font-semibold">● הושלמה</span></SelectItem>
                               <SelectItem value="בוטלה"><span className="text-slate-700 font-semibold">● בוטלה</span></SelectItem>
                             </SelectContent>
                           </Select>
                         </td>

                        <td className="px-4 py-3 text-slate-500">
                          {formatDateTime(task.created_date)}
                        </td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div>
            }
          </CardContent>
        </Card>
      </div>

      <TaskFormDialog
        open={showDialog}
        onClose={() => {setShowDialog(false);setEditTask(null);}}
        task={editTask}
        debtorRecord={null}
        currentUser={currentUser}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })} />

    </div>);

}