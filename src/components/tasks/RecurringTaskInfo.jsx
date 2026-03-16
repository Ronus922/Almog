import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Repeat2, AlertCircle, Pause, Play, Square } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

const FREQ_LABELS = { daily: 'יומי', weekly: 'שבועי', monthly: 'חודשי', yearly: 'שנתי' };
const GEN_LABELS = { on_completion: 'לאחר השלמה', on_due_date: 'בתאריך יעד', fixed_schedule: 'לפי לוח זמנים' };

export default function RecurringTaskInfo({ task }) {
  const [rule, setRule] = useState(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (task?.recurrence_rule_id) {
      setLoading(true);
      base44.entities.TaskRecurrenceRule.get(task.recurrence_rule_id)
        .then(r => setRule(r))
        .catch(() => setRule(null))
        .finally(() => setLoading(false));
    }
  }, [task?.recurrence_rule_id]);

  if (!task?.is_recurring_instance && !task?.recurrence_rule_id) return null;

  const handlePause = async () => {
    if (!rule) return;
    await base44.entities.TaskRecurrenceRule.update(rule.id, { is_paused: true });
    setRule(r => ({ ...r, is_paused: true }));
    queryClient.invalidateQueries({ queryKey: ['recurrence-rules'] });
  };
  const handleResume = async () => {
    if (!rule) return;
    await base44.entities.TaskRecurrenceRule.update(rule.id, { is_paused: false });
    setRule(r => ({ ...r, is_paused: false }));
    queryClient.invalidateQueries({ queryKey: ['recurrence-rules'] });
  };
  const handleStop = async () => {
    if (!rule || !window.confirm('לעצור לצמיתות את כלל המחזוריות?')) return;
    await base44.entities.TaskRecurrenceRule.update(rule.id, { is_active: false });
    setRule(r => ({ ...r, is_active: false }));
    queryClient.invalidateQueries({ queryKey: ['recurrence-rules'] });
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-2" dir="rtl">
      <div className="flex items-start gap-3">
        <Repeat2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <h4 className="font-bold text-blue-900 text-sm">משימה מחזורית</h4>
            {rule?.is_active !== false && (
              <div className="flex items-center gap-1">
                {!rule?.is_paused ? (
                  <button onClick={handlePause} title="השהה" className="p-1 rounded text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors">
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button onClick={handleResume} title="המשך" className="p-1 rounded text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={handleStop} title="עצור" className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Square className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {task.recurrence_instance_index && (
              <div className="text-blue-700"><span className="font-semibold">מופע:</span> #{task.recurrence_instance_index}</div>
            )}
            {loading && <div className="text-blue-500 col-span-2">טוען...</div>}
            {rule && (
              <>
                <div className="text-blue-700 col-span-2"><span className="font-semibold">כלל:</span> {rule.title}</div>
                <div className="text-blue-700"><span className="font-semibold">תדירות:</span> {FREQ_LABELS[rule.frequency] || rule.frequency}{rule.interval_value > 1 ? ` (כל ${rule.interval_value})` : ''}</div>
                <div className="text-blue-700"><span className="font-semibold">אופן יצירה:</span> {GEN_LABELS[rule.generate_mode] || rule.generate_mode}</div>
                <div className="text-blue-700"><span className="font-semibold">נוצרו:</span> {rule.generated_count || 0} מופעים</div>
                {rule.next_run_at && rule.is_active !== false && !rule.is_paused && (
                  <div className="text-blue-700"><span className="font-semibold">הבא:</span> {format(new Date(rule.next_run_at), 'dd/MM/yyyy')}</div>
                )}
                {rule.is_active === false && (
                  <div className="col-span-2 flex items-center gap-1 text-slate-500 bg-slate-100 rounded px-2 py-1 mt-1">
                    <Square className="w-3 h-3" /><span>כלל זה הופסק</span>
                  </div>
                )}
                {rule.is_paused && rule.is_active !== false && (
                  <div className="col-span-2 flex items-center gap-1 text-orange-600 bg-orange-50 rounded px-2 py-1 mt-1 border border-orange-200">
                    <AlertCircle className="w-3 h-3" /><span className="font-medium">כלל מושהה — לא יוצרו מופעים חדשים</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}