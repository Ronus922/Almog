import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Scale, MessageSquare, ClipboardList, AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const EVENT_ICONS = {
  status: Scale,
  comment: MessageSquare,
  task: ClipboardList,
};

const EVENT_COLORS = {
  status: 'bg-blue-100 text-blue-700 border-blue-200',
  comment: 'bg-slate-100 text-slate-700 border-slate-200',
  task_open: 'bg-amber-100 text-amber-700 border-amber-200',
  task_done: 'bg-green-100 text-green-700 border-green-200',
  task_cancelled: 'bg-red-100 text-red-700 border-red-200',
};

function TimelineEvent({ event }) {
  const Icon = EVENT_ICONS[event.kind] || Clock;
  const colorClass = event.colorKey ? EVENT_COLORS[event.colorKey] : EVENT_COLORS[event.kind];

  return (
    <div className="flex gap-4 relative" dir="rtl">
      {/* Line connector */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="w-0.5 bg-slate-200 flex-1 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-bold text-slate-800 text-[15px]">{event.title}</p>
              {event.subtitle && (
                <p className="text-sm text-slate-500 mt-0.5">{event.subtitle}</p>
              )}
              {event.body && (
                <p className="text-sm text-slate-700 mt-2 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                  {event.body}
                </p>
              )}
            </div>
            <div className="text-left text-xs text-slate-400 flex-shrink-0 mt-1">
              {formatDate(event.date)}
            </div>
          </div>
          {event.by && (
            <p className="text-xs text-slate-400 mt-2">על ידי: {event.by}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DebtorHistoryPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const recordId = urlParams.get('id');
  const { currentUser } = useAuth();

  const { data: record } = useQuery({
    queryKey: ['debtorRecord', recordId],
    queryFn: () => base44.entities.DebtorRecord.get(recordId),
    enabled: !!recordId,
  });

  const { data: legalHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['legalStatusHistory', recordId],
    queryFn: () => base44.entities.LegalStatusHistory.filter({ debtor_record_id: recordId }, '-changed_at'),
    enabled: !!recordId,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', recordId],
    queryFn: () => base44.entities.Comment.filter({ debtor_record_id: recordId }, '-created_date'),
    enabled: !!recordId,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', recordId],
    queryFn: () => base44.entities.Task.filter({ debtor_record_id: recordId }, '-created_date'),
    enabled: !!recordId,
  });

  const isLoading = historyLoading || commentsLoading || tasksLoading;

  // בניית ציר הזמן המאוחד
  const timelineEvents = [];

  legalHistory.forEach((h) => {
    timelineEvents.push({
      id: `status-${h.id}`,
      kind: 'status',
      colorKey: 'status',
      date: h.changed_at,
      title: `שינוי סטטוס משפטי`,
      subtitle: `${h.old_status_name || 'לא הוגדר'} ← ${h.new_status_name}`,
      by: h.changed_by,
    });
  });

  comments.forEach((c) => {
    timelineEvents.push({
      id: `comment-${c.id}`,
      kind: 'comment',
      colorKey: 'comment',
      date: c.created_date,
      title: 'הערה נרשמה',
      body: c.content,
      by: c.author_name,
    });
  });

  tasks.forEach((t) => {
    let colorKey = 'task_open';
    if (t.status === 'הושלמה') colorKey = 'task_done';
    else if (t.status === 'בוטלה') colorKey = 'task_cancelled';

    timelineEvents.push({
      id: `task-${t.id}`,
      kind: 'task',
      colorKey,
      date: t.created_date || t.due_date,
      title: `משימה: ${t.task_type}`,
      subtitle: `סטטוס: ${t.status} • עדיפות: ${t.priority}`,
      body: t.description || null,
      by: t.assigned_to_name || t.assigned_by || null,
    });
  });

  // מיון לפי תאריך יורד
  timelineEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" dir="rtl">
      {/* כותרת */}
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" size="sm" onClick={handleBack} className="h-9 rounded-xl gap-1.5">
            <ArrowRight className="w-4 h-4" />
            חזרה
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              היסטוריה — דירה {record?.apartmentNumber || '...'}
            </h1>
            {record?.ownerName && (
              <p className="text-sm text-slate-500 mt-0.5">{record.ownerName}</p>
            )}
          </div>
        </div>

        {/* סיכום */}
        {record && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm text-center">
              <p className="text-xs text-slate-500 font-semibold mb-1">אירועים בסה״כ</p>
              <p className="text-2xl font-black text-slate-800">{timelineEvents.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm text-center">
              <p className="text-xs text-slate-500 font-semibold mb-1">שינויי סטטוס</p>
              <p className="text-2xl font-black text-blue-600">{legalHistory.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm text-center">
              <p className="text-xs text-slate-500 font-semibold mb-1">הערות</p>
              <p className="text-2xl font-black text-slate-600">{comments.length}</p>
            </div>
          </div>
        )}

        {/* מקרא */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge className="bg-blue-100 text-blue-700 border border-blue-200 gap-1.5"><Scale className="w-3 h-3" />שינוי סטטוס משפטי</Badge>
          <Badge className="bg-slate-100 text-slate-700 border border-slate-200 gap-1.5"><MessageSquare className="w-3 h-3" />הערה</Badge>
          <Badge className="bg-amber-100 text-amber-700 border border-amber-200 gap-1.5"><ClipboardList className="w-3 h-3" />משימה פתוחה</Badge>
          <Badge className="bg-green-100 text-green-700 border border-green-200 gap-1.5"><CheckCircle2 className="w-3 h-3" />משימה הושלמה</Badge>
          <Badge className="bg-red-100 text-red-700 border border-red-200 gap-1.5"><XCircle className="w-3 h-3" />משימה בוטלה</Badge>
        </div>

        {/* ציר הזמן */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            ציר זמן פעולות
          </h2>

          {isLoading ? (
            <div className="text-center py-12 text-slate-400 font-semibold">טוען נתונים...</div>
          ) : timelineEvents.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">אין אירועים להצגה</p>
              <p className="text-sm text-slate-400 mt-1">לא נמצאו פעולות עבור חייב זה</p>
            </div>
          ) : (
            <div>
              {timelineEvents.map((event) => (
                <TimelineEvent key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}