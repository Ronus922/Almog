import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Repeat2, AlertCircle } from 'lucide-react';

export default function RecurringTaskInfo({ task }) {
  const [rule, setRule] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task?.recurrence_rule_id) {
      setLoading(true);
      base44.entities.TaskRecurrenceRule.get(task.recurrence_rule_id)
        .then(r => setRule(r))
        .catch(() => setRule(null))
        .finally(() => setLoading(false));
    }
  }, [task?.recurrence_rule_id]);

  if (!task?.is_recurring_instance && !task?.recurrence_rule_id) {
    return null;
  }

  const frequencyLabel = {
    daily: 'יומית',
    weekly: 'שבועית',
    monthly: 'חודשית',
    yearly: 'שנתית'
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4" dir="rtl">
      <div className="flex items-start gap-3">
        <Repeat2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-blue-900 mb-2">משימה מחזורית</h4>
          <div className="space-y-1.5 text-sm">
            {task.is_recurring_instance && (
              <div className="text-blue-700">
                <strong>מספר מופע:</strong> #{task.recurrence_instance_index || '?'}
              </div>
            )}
            
            {rule && (
              <>
                <div className="text-blue-700">
                  <strong>כלל מחזוריות:</strong> {rule.title}
                </div>
                <div className="text-blue-700">
                  <strong>תדירות:</strong> {frequencyLabel[rule.frequency] || rule.frequency}
                  {rule.interval_value > 1 && ` (כל ${rule.interval_value})`}
                </div>
                {rule.is_paused && (
                  <div className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200 mt-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">כלל מושהה</span>
                  </div>
                )}
              </>
            )}
            
            {loading && (
              <div className="text-blue-600 text-xs">טוען מידע כלל...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}