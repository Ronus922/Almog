import React from "react";

const priorityColors = {
  "גבוהה": "bg-red-100 text-red-700 border-red-200",
  "בינונית": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "נמוכה": "bg-green-100 text-green-700 border-green-200",
};

const statusColors = {
  "פתוחה": "bg-blue-100 text-blue-700 border-blue-200",
  "בטיפול": "bg-orange-100 text-orange-700 border-orange-200",
  "הושלמה": "bg-green-100 text-green-700 border-green-200",
  "בוטלה": "bg-slate-100 text-slate-500 border-slate-200",
};

const taskTypeIcons = {
  "שיחת טלפון": "📞",
  "שליחת מכתב התראה": "✉️",
  "פגישה": "🤝",
  "מעקב תשלום": "💰",
  "הגשת תביעה": "⚖️",
  "אחר": "📋",
};

export function PriorityBadge({ priority }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${priorityColors[priority] || priorityColors["בינונית"]}`}>
      {priority}
    </span>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[status] || statusColors["פתוחה"]}`}>
      {status}
    </span>
  );
}

export function TaskTypeIcon({ type }) {
  return <span className="text-base">{taskTypeIcons[type] || "📋"}</span>;
}