import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, LayoutGrid, List, Calendar, Repeat2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthContext";
import { isManagerRole } from "@/components/utils/roles";
import {
  fetchTasks, fetchRules, fetchSavedViews, updateStatus, updatePriority,
  archiveTask, unarchiveTask, bulkUpdateStatus, bulkUpdatePriority, bulkAssign,
  bulkArchive, bulkUnarchive, bulkDelete, createSavedView, deleteSavedView, updateSavedView,
  fetchAttendees
} from "@/components/taskspro/taskProApi";
import TaskProKpiBar from "@/components/taskspro/TaskProKpiBar";
import TaskProFiltersBar from "@/components/taskspro/TaskProFiltersBar";
import TaskProTable from "@/components/taskspro/TaskProTable";
import TaskProKanban from "@/components/taskspro/TaskProKanban";
import TaskProCalendarView from "@/components/taskspro/TaskProCalendarView";
import TaskProBulkBar from "@/components/taskspro/TaskProBulkBar";
import TaskProFormDialog from "@/components/taskspro/TaskProFormDialog";
import TaskProDetailsDialog from "@/components/taskspro/TaskProDetailsDialog";
import { base44 } from "@/api/base44Client";

const DEFAULT_FILTERS = {
  search: "", status: "הכל", priority: "הכל", assigned: "הכל",
  taskType: "הכל", source: "הכל", dueDateFrom: "", dueDateTo: "",
  showArchived: false, attendeeUsername: "",
};

const SOURCE_MAP = { manual: "ידנית", template: "מתבנית", recurring: "מחזורית" };

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function TasksProPage() {
  const { currentUser } = useAuth();
  const isAdmin = isManagerRole(currentUser);
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState("table"); // table | kanban | calendar
  const [activeView, setActiveView] = useState("tasks"); // tasks | rules
  const [kpiFilter, setKpiFilter] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortField, setSortField] = useState("due_at");
  const [sortDir, setSortDir] = useState("asc");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [attendeesMap, setAttendeesMap] = useState({});

  // Queries
  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ["taskpro-tasks"],
    queryFn: fetchTasks,
    refetchInterval: 60000,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["taskpro-rules"],
    queryFn: fetchRules,
  });

  const { data: appUsers = [] } = useQuery({
    queryKey: ["appUsers"],
    queryFn: () => base44.entities.AppUser.list(),
  });

  const { data: savedViews = [] } = useQuery({
    queryKey: ["taskpro-saved-views", currentUser?.username],
    queryFn: () => currentUser?.username ? fetchSavedViews(currentUser.username) : Promise.resolve([]),
    enabled: !!currentUser?.username,
  });

  // Load attendees for visible tasks
  useEffect(() => {
    if (allTasks.length === 0) return;
    const missing = allTasks.filter((t) => !(t.id in attendeesMap)).map((t) => t.id);
    if (missing.length === 0) return;
    Promise.all(missing.map((id) => fetchAttendees(id).then((list) => ({ id, list })))).then((results) => {
      setAttendeesMap((prev) => {
        const next = { ...prev };
        results.forEach(({ id, list }) => { next[id] = list; });
        return next;
      });
    });
  }, [allTasks]);

  const userOptions = useMemo(() => appUsers.map((u) => ({
    username: u.username,
    name: u.email === "r@bios.co.il" ? "רונן משולם" : [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username,
    email: u.email,
  })), [appUsers]);

  const assignedOptions = useMemo(() => {
    const names = [...new Set(allTasks.map((t) => t.assigned_to_name || t.assigned_to).filter(Boolean))];
    return names.sort();
  }, [allTasks]);

  // Tasks visible to current user
  const myTasks = useMemo(() => {
    const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
    if (isSuperAdmin) return allTasks;
    const username = currentUser?.username;
    if (!username) return [];
    return allTasks.filter((t) => {
      if (t.assigned_to === username || t.assigned_by === username) return true;
      const attendees = attendeesMap[t.id] || [];
      return attendees.some((a) => a.user_username === username);
    });
  }, [allTasks, currentUser, attendeesMap]);

  const today = getTodayStr();

  // Apply filters
  const filtered = useMemo(() => {
    let r = myTasks;

    // archived
    if (!filters.showArchived) r = r.filter((t) => !t.is_archived);

    // kpi override
    if (kpiFilter === "open") r = r.filter((t) => t.status === "פתוחה" || t.status === "בטיפול");
    else if (kpiFilter === "overdue") r = r.filter((t) => t.due_at && t.due_at.slice(0,10) < today && t.status !== "הושלמה" && t.status !== "בוטלה");
    else if (kpiFilter === "today") r = r.filter((t) => t.due_at && t.due_at.slice(0,10) === today && t.status !== "הושלמה" && t.status !== "בוטלה");
    else if (kpiFilter === "mine") r = r.filter((t) => t.assigned_to === currentUser?.username);

    // manual filters
    if (filters.status !== "הכל") r = r.filter((t) => t.status === filters.status);
    if (filters.priority !== "הכל") r = r.filter((t) => t.priority === filters.priority);
    if (filters.taskType !== "הכל") r = r.filter((t) => t.task_type === filters.taskType);
    if (filters.source !== "הכל") {
      const srcKey = Object.entries(SOURCE_MAP).find(([, v]) => v === filters.source)?.[0];
      if (srcKey) r = r.filter((t) => t.source === srcKey);
    }
    if (filters.assigned !== "הכל") {
      if (filters.assigned.startsWith("__me__")) {
        r = r.filter((t) => t.assigned_to === currentUser?.username);
      } else {
        r = r.filter((t) => (t.assigned_to_name || t.assigned_to) === filters.assigned);
      }
    }
    if (filters.dueDateFrom) r = r.filter((t) => t.due_at && t.due_at.slice(0,10) >= filters.dueDateFrom);
    if (filters.dueDateTo) r = r.filter((t) => t.due_at && t.due_at.slice(0,10) <= filters.dueDateTo);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      r = r.filter((t) =>
        t.title?.toLowerCase().includes(q) ||
        t.apartment_number?.includes(q) ||
        t.owner_name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.task_type?.includes(q) ||
        t.assigned_to_name?.toLowerCase().includes(q)
      );
    }

    return r;
  }, [myTasks, filters, kpiFilter, today, currentUser]);

  // Sort
  const sorted = useMemo(() => {
    const PRIO = { "גבוהה": 1, "בינונית": 2, "נמוכה": 3 };
    return [...filtered].sort((a, b) => {
      let av = a[sortField] ?? "";
      let bv = b[sortField] ?? "";
      if (sortField === "priority") { av = PRIO[a.priority] || 9; bv = PRIO[b.priority] || 9; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  // Mutations
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] }),
  });
  const priorityMutation = useMutation({
    mutationFn: ({ id, priority }) => updatePriority(id, priority),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] }),
  });

  const doArchive = async (task) => {
    await archiveTask(task.id, "", currentUser?.username);
    queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
  };
  const doUnarchive = async (task) => {
    await unarchiveTask(task.id);
    queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
  };
  const doDelete = async (id) => {
    if (!window.confirm("למחוק משימה זו לצמיתות?")) return;
    await base44.entities.TaskPro.delete(id);
    queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
  };

  // Bulk
  const handleBulkStatus = async (status) => {
    await bulkUpdateStatus([...selectedIds], status);
    queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
    setSelectedIds(new Set());
  };
  const handleBulkPriority = async (priority) => {
    await bulkUpdatePriority([...selectedIds], priority);
    queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
    setSelectedIds(new Set());
  };
  const handleBulkAssign = async (username) => {
    const u = userOptions.find((x) => x.username === username);
    await bulkAssign([...selectedIds], username, u?.name || username);
    queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
    setSelectedIds(new Set());
  };
  const handleBulkArchive = async () => {
    await bulkArchive([...selectedIds], "", currentUser?.username);
    queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
    setSelectedIds(new Set());
  };
  const handleBulkUnarchive = async () => {
    await bulkUnarchive([...selectedIds]);
    queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
    setSelectedIds(new Set());
  };
  const handleBulkDelete = async () => {
    if (!window.confirm(`למחוק ${selectedIds.size} משימות?`)) return;
    await bulkDelete([...selectedIds]);
    queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
    setSelectedIds(new Set());
  };

  // Selection
  const toggleSelect = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? new Set(sorted.map((t) => t.id)) : new Set());
  };

  // Saved Views
  const handleSaveView = async (data) => {
    await createSavedView({ ...data, owner_username: currentUser?.username, filters_json: data.filters_json, view_mode: viewMode });
    queryClient.invalidateQueries({ queryKey: ["taskpro-saved-views", currentUser?.username] });
  };
  const handleLoadView = (id) => {
    const v = savedViews.find((x) => x.id === id);
    if (!v) return;
    try {
      const f = JSON.parse(v.filters_json || "{}");
      setFilters({ ...DEFAULT_FILTERS, ...f });
      if (v.view_mode) setViewMode(v.view_mode);
    } catch {}
  };

  const openNew = () => { setEditTask(null); setShowForm(true); };
  const openEdit = (task) => { setEditTask(task); setShowForm(true); setDetailTask(null); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:p-6" dir="rtl">
      <div className="max-w-screen-xl mx-auto space-y-5">

        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">ניהול משימות</h1>
            <p className="text-sm text-slate-500 mt-0.5">{filtered.length} משימות מוצגות</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View tabs - צמודים לימין */}
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 shadow-sm">
              {[
                { key: "tasks", label: "משימות" },
                { key: "rules", label: "מחזוריות" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveView(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeView === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-700"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Display mode (only on tasks) */}
            {activeView === "tasks" && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === "table" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                  title="טבלה"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("kanban")}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === "kanban" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                  title="קנבן"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === "calendar" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                  title="לוח שנה"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            )}

            <Button
              onClick={openNew}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-10"
            >
              <Plus className="w-4 h-4" /> משימה חדשה
            </Button>
          </div>
        </div>

        {/* ─── Tasks View ─────────────────────────────────── */}
        {activeView === "tasks" && (
          <>
            {/* KPI Bar */}
            <TaskProKpiBar
              tasks={myTasks}
              currentUsername={currentUser?.username}
              activeFilter={kpiFilter}
              onFilterChange={setKpiFilter}
            />

            {/* Reset KPI */}
            {kpiFilter && (
              <div className="flex justify-end">
                <button
                  onClick={() => setKpiFilter(null)}
                  className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 bg-white hover:bg-slate-50 transition-all gap-1 flex items-center"
                >
                  ✕ איפוס פילטר KPI
                </button>
              </div>
            )}

            {/* Filters */}
            <TaskProFiltersBar
              filters={filters}
              onChange={setFilters}
              assignedOptions={assignedOptions}
              savedViews={savedViews}
              onSaveView={handleSaveView}
              onLoadView={handleLoadView}
              currentUsername={currentUser?.username}
            />

            {/* Main content by view mode */}
            {viewMode === "table" && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <TaskProTable
                  tasks={sorted}
                  isLoading={isLoading}
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                  onRowClick={(t) => setDetailTask(t)}
                  onEdit={openEdit}
                  onDelete={doDelete}
                  onArchive={doArchive}
                  onUnarchive={doUnarchive}
                  onUpdateStatus={(id, status) => statusMutation.mutate({ id, status })}
                  onUpdatePriority={(id, priority) => priorityMutation.mutate({ id, priority })}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={toggleSelectAll}
                  isAdmin={isAdmin}
                  attendeesMap={attendeesMap}
                  currentUsername={currentUser?.username}
                />
              </div>
            )}

            {viewMode === "kanban" && (
              <TaskProKanban
                tasks={sorted}
                onRowClick={(t) => setDetailTask(t)}
              />
            )}

            {viewMode === "calendar" && (
              <TaskProCalendarView
                tasks={sorted}
                onTaskClick={(t) => setDetailTask(t)}
              />
            )}
          </>
        )}

        {/* ─── Rules View ─────────────────────────────────── */}
        {activeView === "rules" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Repeat2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-800">כללי מחזוריות פעילים</h2>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{rules.filter(r => r.is_active).length}</span>
            </div>
            {rules.length === 0 ? (
              <p className="text-center text-slate-400 py-10">אין כללי מחזוריות. צור משימה עם "הפוך למחזורית".</p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className={`border rounded-xl p-4 ${rule.is_active && !rule.is_paused ? "border-blue-200 bg-blue-50/30" : "border-slate-200 bg-slate-50 opacity-70"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-slate-800">{rule.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rule.is_active && !rule.is_paused ? "bg-green-100 text-green-700" : rule.is_paused ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-500"}`}>
                            {!rule.is_active ? "הופסק" : rule.is_paused ? "מושהה" : "פעיל"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span>{{ daily: "יומי", weekly: "שבועי", monthly: "חודשי", yearly: "שנתי" }[rule.frequency]} · כל {rule.interval_value}</span>
                          <span>נוצרו: {rule.generated_count || 0}</span>
                          {rule.assigned_to_name && <span>משויך: {rule.assigned_to_name}</span>}
                          {rule.apartment_number && <span>דירה {rule.apartment_number}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {rule.is_active && !rule.is_paused && (
                          <button
                            onClick={async () => { await base44.entities.TaskProRecurrenceRule.update(rule.id, { is_paused: true }); queryClient.invalidateQueries({ queryKey: ["taskpro-rules"] }); }}
                            className="text-xs px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors font-medium"
                          >
                            השהה
                          </button>
                        )}
                        {rule.is_active && rule.is_paused && (
                          <button
                            onClick={async () => { await base44.entities.TaskProRecurrenceRule.update(rule.id, { is_paused: false }); queryClient.invalidateQueries({ queryKey: ["taskpro-rules"] }); }}
                            className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors font-medium"
                          >
                            חדש
                          </button>
                        )}
                        {rule.is_active && (
                          <button
                            onClick={async () => { if (!window.confirm("להפסיק כלל זה לצמיתות?")) return; await base44.entities.TaskProRecurrenceRule.update(rule.id, { is_active: false }); queryClient.invalidateQueries({ queryKey: ["taskpro-rules"] }); }}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors font-medium"
                          >
                            הפסק
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bulk Bar */}
        <TaskProBulkBar
          selectedIds={selectedIds}
          onClear={() => setSelectedIds(new Set())}
          onBulkStatus={handleBulkStatus}
          onBulkPriority={handleBulkPriority}
          onBulkAssign={handleBulkAssign}
          onBulkArchive={handleBulkArchive}
          onBulkUnarchive={handleBulkUnarchive}
          onBulkDelete={handleBulkDelete}
          assignedOptions={userOptions}
          isAdmin={isAdmin}
        />

        {/* Dialogs */}
        <TaskProFormDialog
          open={showForm}
          onClose={() => setShowForm(false)}
          task={editTask}
          currentUser={currentUser}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] })}
        />

        <TaskProDetailsDialog
          task={detailTask}
          open={!!detailTask}
          onClose={() => setDetailTask(null)}
          onEdit={openEdit}
          onArchive={doArchive}
          onUnarchive={doUnarchive}
        />
      </div>
    </div>
  );
}