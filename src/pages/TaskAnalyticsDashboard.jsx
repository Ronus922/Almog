import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, CheckCircle2, Clock, TrendingUp, MessageCircle, Calendar, Bell } from 'lucide-react';

export default function TaskAnalyticsDashboard() {
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // קבל את כל המשימות
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasksPro'],
    queryFn: async () => {
      const result = await base44.entities.TaskPro.list('-due_date', 1000);
      return result || [];
    }
  });

  // קבל את כל הדירות לחישוב סך החובות
  const { data: debtors = [], isLoading: debtorsLoading } = useQuery({
    queryKey: ['debtors'],
    queryFn: async () => {
      const result = await base44.entities.DebtorRecord.list('-updated_date', 10000);
      return result || [];
    }
  });

  // קבל את הפגישות הפעילות
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const result = await base44.entities.Appointment.list('-updated_date', 1000);
      return result || [];
    }
  });

  // קבל תזכורות פתוחות
  const { data: todoItems = [] } = useQuery({
    queryKey: ['todoItems'],
    queryFn: async () => {
      const result = await base44.entities.TodoItem.list('-created_date', 100);
      return result || [];
    }
  });

  // קבל את הודעות הווטסאפ שטרם נקראו
  const { data: chatMessages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: async () => {
      const result = await base44.entities.ChatMessage.list('-updated_date', 10000);
      return result || [];
    }
  });

  // סינון משימות לפי תאריכים וסטטוס
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filterStartDate && task.due_date && new Date(task.due_date) < new Date(filterStartDate)) {
        return false;
      }
      if (filterEndDate && task.due_date && new Date(task.due_date) > new Date(filterEndDate)) {
        return false;
      }
      if (filterStatus !== 'all' && task.status !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [tasks, filterStartDate, filterEndDate, filterStatus]);

  // חישובי סטטיסטיקות
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active = filteredTasks.filter((t) => t.status !== 'הושלמה' && t.status !== 'בוטלה').length;
    const overdue = filteredTasks.filter((t) => {
      if (!t.due_date || t.status === 'הושלמה') return false;
      return new Date(t.due_date) < today;
    }).length;
    const completed = filteredTasks.filter((t) => t.status === 'הושלמה').length;
    const dueToday = filteredTasks.filter((t) => {
      if (!t.due_date || t.status === 'הושלמה') return false;
      const tDate = new Date(t.due_date);
      tDate.setHours(0, 0, 0, 0);
      return tDate.getTime() === today.getTime();
    }).length;

    return { active, overdue, completed, dueToday, total: filteredTasks.length };
  }, [filteredTasks]);

  // התפלגות לפי סטטוס
  const statusDistribution = useMemo(() => {
    const dist = {};
    filteredTasks.forEach((t) => {
      dist[t.status] = (dist[t.status] || 0) + 1;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [filteredTasks]);

  // התפלגות לפי עדיפות
  const priorityDistribution = useMemo(() => {
    const dist = {};
    filteredTasks.forEach((t) => {
      dist[t.priority || 'ללא'] = (dist[t.priority || 'ללא'] || 0) + 1;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [filteredTasks]);

  // משימות לפי מחוקק
  const tasksByAssignee = useMemo(() => {
    const dist = {};
    filteredTasks.forEach((t) => {
      const assignee = t.assigned_to_name || 'לא הוקצה';
      dist[assignee] = (dist[assignee] || 0) + 1;
    });
    return Object.entries(dist).
    map(([name, value]) => ({ name, value })).
    sort((a, b) => b.value - a.value).
    slice(0, 8);
  }, [filteredTasks]);

  const COLORS = ['#3563d0', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // חישוב KPI חדשים
  const buildingMetrics = useMemo(() => {
    const totalDebt = debtors.reduce((sum, d) => sum + (d.totalDebt || 0), 0);
    const activeAppointments = appointments.filter((a) => {
      const apptDate = new Date(a.date);
      const today = new Date();
      return apptDate >= today;
    }).length;
    const pendingMessages = chatMessages.filter((m) => m.direction === 'received' && m.link_status === 'unlinked').length;

    return { totalDebt, activeAppointments, pendingMessages };
  }, [debtors, appointments, chatMessages]);

  // תרשים מגמת חובות (אחרונות 30 ימים)
  const debtTrendData = useMemo(() => {
    const today = new Date();
    const days = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('he-IL');

      const dayDebtors = debtors.filter((d) => {
        if (!d.lastImportAt) return false;
        const importDate = new Date(d.lastImportAt);
        return importDate.toLocaleDateString('he-IL') === dateStr;
      });

      const dayTotal = dayDebtors.reduce((sum, d) => sum + (d.totalDebt || 0), 0);
      days.push({
        date: date.toLocaleDateString('he-IL', { month: 'short', day: 'numeric' }),
        סך_חוב: dayTotal || null
      });
    }

    return days.filter((d) => d.סך_חוב !== null).length > 0 ? days : [];
  }, [debtors]);

  if (tasksLoading || debtorsLoading || appointmentsLoading || messagesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 mx-auto mb-4 animate-spin"></div>
          <p className="text-slate-600 font-medium">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* כותרת */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">לוח מחוונים משימות</h1>
          <p className="text-slate-600">סקירה בזמן אמת של משימות, ביצוע וסטטיסטיקות</p>
        </div>

        {/* סינונים */}
        <Card className="mb-6 bg-white border-slate-200 rounded-xl shadow-sm">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">מתאריך</label>
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="h-9 rounded-lg border-slate-200" />

              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">עד תאריך</label>
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="h-9 rounded-lg border-slate-200" />

              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">סטטוס</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9 rounded-lg border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    <SelectItem value="פתוחה">פתוחה</SelectItem>
                    <SelectItem value="בטיפול">בטיפול</SelectItem>
                    <SelectItem value="הושלמה">הושלמה</SelectItem>
                    <SelectItem value="בוטלה">בוטלה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">&nbsp;</label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setFilterStatus('all');
                  }}
                  className="h-9 w-full rounded-lg">

                  איפוס סינונים
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards - Building Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 mb-1">סך הכל חובות בבניין</p>
                  <p className="text-3xl font-bold text-purple-900">₪{(buildingMetrics.totalDebt / 1000).toFixed(0)}K</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-purple-200 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-cyan-700 mb-1">פגישות פעילות</p>
                  <p className="text-3xl font-bold text-cyan-900">{buildingMetrics.activeAppointments}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-cyan-200 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-cyan-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">הודעות וואטסאפ ממתינות</p>
                  <p className="text-3xl font-bold text-green-900">{buildingMetrics.pendingMessages}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-200 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">משימות פעילות</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.active}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-200 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700 mb-1">משימות באיחור</p>
                  <p className="text-3xl font-bold text-red-900">{stats.overdue}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-red-200 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">משימות הושלמו</p>
                  <p className="text-3xl font-bold text-green-900">{stats.completed}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-200 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700 mb-1">סה״כ משימות</p>
                  <p className="text-3xl font-bold text-amber-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-amber-200 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* תרשים מגמת חובות */}
        {debtTrendData.length > 0 &&
        <Card className="bg-white border-slate-200 rounded-xl shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">מגמת חובות בבניין (30 ימים אחרונים)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={debtTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₪${value.toLocaleString('he-IL')}`} />
                  <Legend />
                  <Line type="monotone" dataKey="סך_חוב" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        }

        {/* גרפים */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* התפלגות לפי סטטוס */}
          <Card className="bg-white border-slate-200 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">התפלגות לפי סטטוס</CardTitle>
            </CardHeader>
            <CardContent>
              {statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">אין נתונים</div>
              )}
            </CardContent>
          </Card>

          {/* התפלגות לפי עדיפות */}
          <Card className="bg-white border-slate-200 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">התפלגות לפי עדיפות</CardTitle>
            </CardHeader>
            <CardContent>
              {priorityDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={priorityDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3563d0" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">אין נתונים</div>
              )}
            </CardContent>
          </Card>
        </div>





















































        {/* משימות לפי מחוקק */}
        <Card className="bg-white border-slate-200 rounded-xl shadow-sm mb-6">
          


          


















        </Card>

        {/* שורה תחתונה: משימות + תזכורות / פגישות + וואטסאפ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* משימות פתוחות בטיפול */}
          <Card className="bg-white border-slate-200 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">משימות פתוחות בטיפול</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-right py-2.5 px-4 font-semibold text-slate-700">כותרת</th>
                      <th className="text-right py-2.5 px-4 font-semibold text-slate-700">תאריך יעד</th>
                      <th className="text-right py-2.5 px-4 font-semibold text-slate-700">עדיפות</th>
                      <th className="text-right py-2.5 px-4 font-semibold text-slate-700">מוקצה ל</th>
                      <th className="text-right py-2.5 px-4 font-semibold text-slate-700">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks
                      .filter((t) => t.status !== 'הושלמה' && t.status !== 'בוטלה')
                      .sort((a, b) => {
                        if (!a.due_date) return 1;
                        if (!b.due_date) return -1;
                        return new Date(a.due_date) - new Date(b.due_date);
                      })
                      .slice(0, 10)
                      .map((task) => {
                        const isOverdue = task.due_date && !['הושלמה', 'בוטלה'].includes(task.status) && new Date(task.due_date) < new Date();
                        return (
                          <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-4 text-slate-900 font-medium truncate max-w-[140px]">{task.title}</td>
                            <td className={`py-2.5 px-4 whitespace-nowrap ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                              {task.due_date ? new Date(task.due_date).toLocaleDateString('he-IL') : '—'}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                task.priority === 'גבוהה' ? 'bg-red-100 text-red-700' :
                                task.priority === 'בינונית' ? 'bg-amber-100 text-amber-700' :
                                'bg-green-100 text-green-700'}`}>
                                {task.priority || 'ללא'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 text-xs">{task.assigned_to_name || '—'}</td>
                            <td className="py-2.5 px-4">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                task.status === 'פתוחה' ? 'bg-blue-100 text-blue-700' :
                                task.status === 'בטיפול' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-700'}`}>
                                {task.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {filteredTasks.filter((t) => t.status !== 'הושלמה' && t.status !== 'בוטלה').length === 0 && (
                  <div className="text-center py-10 text-slate-500">אין משימות פעילות</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* תזכורות פתוחות */}
          {(() => {
            const openTodos = todoItems.filter((t) => t.status === 'open').slice(0, 8);
            return (
              <Card className="bg-white border-slate-200 rounded-xl shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Bell className="w-5 h-5 text-amber-500" />
                      תזכורות פתוחות
                      {openTodos.length > 0 && (
                        <span className="mr-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          {openTodos.length}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {openTodos.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {openTodos.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                            <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-800 font-medium truncate">{item.title}</p>
                              {item.description && (
                                <p className="text-xs text-slate-500 truncate mt-0.5">{item.description}</p>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 whitespace-nowrap">
                              {item.owner_user_id || '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500 text-sm">אין תזכורות פתוחות</div>
                    )}
                  </CardContent>
                </Card>
            );
          })()}

          {/* פגישות פעילות */}
          <Card className="bg-white border-slate-200 rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-600" />
                  פגישות פעילות
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {appointments
                  .filter((a) => new Date(a.date) >= new Date())
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .slice(0, 5)
                  .length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {appointments
                      .filter((a) => new Date(a.date) >= new Date())
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .slice(0, 5)
                      .map((appt) => (
                        <div key={appt.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 text-sm truncate">{appt.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{appt.location || '—'}</p>
                          </div>
                          <div className="text-left flex flex-col items-end mr-3">
                            <span className="text-xs font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full">
                              {new Date(appt.date).toLocaleDateString('he-IL')}
                            </span>
                            {appt.start_time && (
                              <span className="text-xs text-slate-500 mt-1">{appt.start_time}</span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm">אין פגישות קרובות</div>
                )}
              </CardContent>
            </Card>

          {/* הודעות וואטסאפ שלא נענו */}
          <Card className="bg-white border-slate-200 rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  הודעות וואטסאפ שלא נענו
                  {buildingMetrics.pendingMessages > 0 && (
                    <span className="mr-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {buildingMetrics.pendingMessages}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {chatMessages
                  .filter((m) => m.direction === 'received' && m.link_status === 'unlinked')
                  .sort((a, b) => new Date(b.timestamp || b.created_date) - new Date(a.timestamp || a.created_date))
                  .slice(0, 6)
                  .length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {chatMessages
                      .filter((m) => m.direction === 'received' && m.link_status === 'unlinked')
                      .sort((a, b) => new Date(b.timestamp || b.created_date) - new Date(a.timestamp || a.created_date))
                      .slice(0, 6)
                      .map((msg) => (
                        <div key={msg.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <MessageCircle className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700">{msg.contact_phone || '—'}</p>
                            <p className="text-sm text-slate-800 truncate mt-0.5">{msg.content || '(הודעה ללא תוכן)'}</p>
                          </div>
                          <span className="text-xs text-slate-400 whitespace-nowrap mt-1">
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleDateString('he-IL') : '—'}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm">אין הודעות שלא נענו</div>
                )}
              </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}