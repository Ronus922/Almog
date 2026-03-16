import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Repeat2, Pause, Play, Square, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const FREQ_LABELS = {
  daily: 'יומי', weekly: 'שבועי', monthly: 'חודשי', yearly: 'שנתי'
};

const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const WEEKDAYS_HE = { sunday: 'א׳', monday: 'ב׳', tuesday: 'ג׳', wednesday: 'ד׳', thursday: 'ה׳', friday: 'ו׳', saturday: 'ש׳' };

function buildRuleSummary(rule) {
  const interval = rule.interval_value || 1;
  if (rule.frequency === 'daily') return interval === 1 ? 'כל יום' : `כל ${interval} ימים`;
  if (rule.frequency === 'weekly') {
    const days = rule.days_of_week_json ? JSON.parse(rule.days_of_week_json).map(d => WEEKDAYS_HE[d]).join(', ') : '';
    return `כל ${interval === 1 ? '' : interval + ' '}שבוע${days ? ` (${days})` : ''}`.trim();
  }
  if (rule.frequency === 'monthly') {
    const dayStr = rule.day_of_month ? `ב-${rule.day_of_month}` : '';
    return interval === 6 ? `כל 6 חודשים ${dayStr}`.trim() : `כל ${interval} חודש${dayStr ? ' ' + dayStr : ''}`.trim();
  }
  if (rule.frequency === 'yearly') {
    const m = rule.month_of_year ? MONTHS_HE[rule.month_of_year - 1] : '';
    return `כל שנה ב-${rule.day_of_month || 1} ${m}`.trim();
  }
  return rule.frequency;
}

export default function RecurringRuleManager() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['recurrence-rules'],
    queryFn: () => base44.entities.TaskRecurrenceRule.list('-created_date'),
    staleTime: 1000 * 30
  });

  const updateRule = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TaskRecurrenceRule.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurrence-rules'] })
  });

  const handlePause = (rule) => {
    updateRule.mutate({ id: rule.id, data: { is_paused: true } });
  };
  const handleResume = (rule) => {
    updateRule.mutate({ id: rule.id, data: { is_paused: false } });
  };
  const handleStop = (rule) => {
    if (window.confirm('לעצור לצמיתות את כלל המחזוריות הזה?')) {
      updateRule.mutate({ id: rule.id, data: { is_active: false } });
    }
  };

  if (isLoading) return (
    <div className="py-6 text-center text-slate-400 text-sm">טוען כללי מחזוריות...</div>
  );

  if (rules.length === 0) return (
    <div className="py-8 text-center text-slate-400">
      <Repeat2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">אין כללי מחזוריות פעילים</p>
    </div>
  );

  return (
    <div className="space-y-2" dir="rtl">
      {rules.map(rule => {
        const isExpanded = expanded === rule.id;
        const isActive = rule.is_active !== false;
        const isPaused = rule.is_paused === true;
        const summary = buildRuleSummary(rule);

        return (
          <div key={rule.id} className={`border rounded-xl overflow-hidden transition-all ${!isActive ? 'opacity-60' : ''}`}>
            <div
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'border-b border-slate-100' : ''}`}
              onClick={() => setExpanded(isExpanded ? null : rule.id)}
            >
              <Repeat2 className={`w-4 h-4 flex-shrink-0 ${isPaused ? 'text-orange-400' : isActive ? 'text-blue-500' : 'text-slate-300'}`} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800 truncate">{rule.title}</span>
                  {!isActive && <Badge variant="secondary" className="text-xs">הופסק</Badge>}
                  {isPaused && isActive && <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">מושהה</Badge>}
                  {isActive && !isPaused && <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">פעיל</Badge>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{summary} · יוצר #{rule.generated_count || 0}</p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isActive && !isPaused && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handlePause(rule); }}
                    title="השהה"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                )}
                {isActive && isPaused && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleResume(rule); }}
                    title="המשך"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}
                {isActive && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleStop(rule); }}
                    title="עצור לצמיתות"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>
                )}
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 py-3 bg-slate-50 space-y-2 text-xs text-slate-600">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-semibold">תדירות:</span> {FREQ_LABELS[rule.frequency] || rule.frequency}</div>
                  <div><span className="font-semibold">אינטרוול:</span> {rule.interval_value || 1}</div>
                  <div><span className="font-semibold">אופן יצירה:</span> {
                    rule.generate_mode === 'on_completion' ? 'לאחר השלמה' :
                    rule.generate_mode === 'on_due_date' ? 'בתאריך יעד' : 'לפי לוח זמנים'
                  }</div>
                  <div><span className="font-semibold">נוצר:</span> {rule.generated_count || 0} מופעים</div>
                  {rule.next_run_at && isActive && !isPaused && (
                    <div className="col-span-2"><span className="font-semibold">ריצה הבאה:</span> {format(new Date(rule.next_run_at), 'dd/MM/yyyy')}</div>
                  )}
                  {rule.assigned_to_name && (
                    <div className="col-span-2"><span className="font-semibold">מוקצה ל:</span> {rule.assigned_to_name}</div>
                  )}
                  {rule.apartment_number && (
                    <div className="col-span-2"><span className="font-semibold">דירה:</span> {rule.apartment_number} {rule.owner_name ? `– ${rule.owner_name}` : ''}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}