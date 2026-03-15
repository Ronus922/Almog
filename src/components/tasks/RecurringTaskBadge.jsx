import React from 'react';
import { Repeat2 } from 'lucide-react';

export default function RecurringTaskBadge({ task }) {
  if (!task?.is_recurring_instance && !task?.recurrence_rule_id) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-md" dir="rtl">
      <Repeat2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
      <span className="text-xs font-medium text-amber-700">משימה מחזורית</span>
    </div>
  );
}