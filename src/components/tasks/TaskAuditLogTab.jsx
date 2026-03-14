import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { History, User, Clock } from "lucide-react";

const FIELD_LABELS = {
  task_type: "סוג משימה",
  status: "סטטוס",
  priority: "עדיפות",
  due_date: "תאריך יעד",
  assigned_to_name: "הוקצה ל",
  description: "תיאור",
  completion_notes: "הערות סגירה",
  file_name: "קובץ",
};

const ACTION_LABELS = {
  created: { label: "משימה נוצרה", color: "bg-green-100 text-green-700" },
  updated: { label: "עדכון", color: "bg-blue-100 text-blue-700" },
  attachment_added: { label: "קובץ צורף", color: "bg-purple-100 text-purple-700" },
  attachment_deleted: { label: "קובץ נמחק", color: "bg-red-100 text-red-700" },
};

function parseChanges(changesStr) {
  try {
    return JSON.parse(changesStr);
  } catch {
    return null;
  }
}

export default function TaskAuditLogTab({ taskId }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["taskAuditLog", taskId],
    queryFn: () => base44.entities.TaskAuditLog.filter({ task_id: taskId }, "-created_date"),
    enabled: !!taskId,
  });

  if (isLoading) {
    return <div className="py-8 text-center text-slate-400 text-sm">טוען היסטוריה...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400">
        <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">אין פעולות מתועדות עדיין</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto pl-1">
      {logs.map(log => {
        const changes = parseChanges(log.changes);
        return (
          <div key={log.id} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <User className="w-3.5 h-3.5 text-blue-500" />
                {log.changed_by_name || log.changed_by_username}
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                {log.created_date ? format(new Date(log.created_date), "dd/MM/yyyy HH:mm") : "-"}
              </div>
            </div>

            <div className="text-xs">
              {(log.action === "created" || log.action === "attachment_added" || log.action === "attachment_deleted") ? (
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${(ACTION_LABELS[log.action] || ACTION_LABELS.updated).color}`}>
                    {(ACTION_LABELS[log.action] || { label: log.action }).label}
                  </span>
                  {(log.action === "attachment_added" || log.action === "attachment_deleted") && changes?.file_name && (
                    <span className="text-slate-500">{changes.file_name}</span>
                  )}
                </div>
              ) : (
                changes && Object.keys(changes).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(changes).map(([field, { from, to }]) => (
                      <div key={field} className="flex flex-wrap items-center gap-1 text-slate-600">
                        <span className="font-medium text-slate-700">{FIELD_LABELS[field] || field}:</span>
                        <span className="line-through text-red-400">{from || "(ריק)"}</span>
                        <span className="text-slate-400">→</span>
                        <span className="text-green-600 font-medium">{to || "(ריק)"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500">עדכון כללי</span>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}