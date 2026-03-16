import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Repeat2, Info } from 'lucide-react';

const WEEKDAYS = [
  { key: 'sunday', label: 'א׳' },
  { key: 'monday', label: 'ב׳' },
  { key: 'tuesday', label: 'ג׳' },
  { key: 'wednesday', label: 'ד׳' },
  { key: 'thursday', label: 'ה׳' },
  { key: 'friday', label: 'ו׳' },
  { key: 'saturday', label: 'ש׳' },
];

const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

function buildSummary(rule) {
  if (!rule.is_recurring) return '';
  const { frequency, interval_value, days_of_week, day_of_month, month_of_year } = rule;
  const interval = interval_value || 1;

  if (frequency === 'daily') {
    return interval === 1 ? 'כל יום' : `כל ${interval} ימים`;
  }
  if (frequency === 'weekly') {
    const days = (days_of_week || []).map(d => WEEKDAYS.find(w => w.key === d)?.label).filter(Boolean);
    const daysStr = days.length > 0 ? `בימים ${days.join(', ')}` : '';
    return interval === 1 ? `כל שבוע ${daysStr}`.trim() : `כל ${interval} שבועות ${daysStr}`.trim();
  }
  if (frequency === 'monthly') {
    const dayStr = day_of_month ? `ב-${day_of_month} לחודש` : '';
    if (interval === 1) return `כל חודש ${dayStr}`.trim();
    if (interval === 6) return `כל 6 חודשים ${dayStr}`.trim();
    return `כל ${interval} חודשים ${dayStr}`.trim();
  }
  if (frequency === 'yearly') {
    const monthStr = month_of_year ? MONTHS_HE[(month_of_year - 1)] : '';
    const dayStr = day_of_month ? `${day_of_month} ב` : '';
    return `כל שנה ב-${dayStr}${monthStr}`.trim();
  }
  return '';
}

const DEFAULT_RULE = {
  is_recurring: false,
  frequency: 'monthly',
  interval_value: 1,
  days_of_week: [],
  day_of_month: 1,
  month_of_year: 1,
  starts_at: '',
  ends_mode: 'never',
  ends_at: '',
  max_occurrences: '',
  generate_mode: 'on_completion',
};

export default function RecurrenceSection({ value, onChange }) {
  const rule = value || DEFAULT_RULE;

  const set = (field, val) => onChange({ ...rule, [field]: val });

  const toggleWeekday = (day) => {
    const days = rule.days_of_week || [];
    const newDays = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
    set('days_of_week', newDays);
  };

  const summary = buildSummary(rule);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden" dir="rtl">
      {/* כותרת עם toggle */}
      <div
        className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${rule.is_recurring ? 'bg-blue-50 border-b border-blue-200' : 'bg-slate-50'}`}
        onClick={() => set('is_recurring', !rule.is_recurring)}
      >
        <div className="flex items-center gap-2.5">
          <Repeat2 className={`w-4 h-4 ${rule.is_recurring ? 'text-blue-600' : 'text-slate-400'}`} />
          <span className={`text-sm font-semibold ${rule.is_recurring ? 'text-blue-700' : 'text-slate-600'}`}>
            משימה מחזורית
          </span>
          {rule.is_recurring && summary && (
            <span className="text-xs text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">{summary}</span>
          )}
        </div>
        <Switch checked={rule.is_recurring} onCheckedChange={(v) => set('is_recurring', v)} />
      </div>

      {rule.is_recurring && (
        <div className="p-4 space-y-4 bg-white">

          {/* תדירות + אינטרוול */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">תדירות</Label>
              <Select value={rule.frequency} onValueChange={(v) => set('frequency', v)}>
                <SelectTrigger className="h-9 text-sm border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">יומי</SelectItem>
                  <SelectItem value="weekly">שבועי</SelectItem>
                  <SelectItem value="monthly">חודשי</SelectItem>
                  <SelectItem value="yearly">שנתי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {rule.frequency === 'monthly' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">כל כמה חודשים</Label>
                <Select value={String(rule.interval_value || 1)} onValueChange={(v) => set('interval_value', Number(v))}>
                  <SelectTrigger className="h-9 text-sm border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">כל חודש</SelectItem>
                    <SelectItem value="2">כל 2 חודשים</SelectItem>
                    <SelectItem value="3">כל 3 חודשים</SelectItem>
                    <SelectItem value="6">כל 6 חודשים</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {rule.frequency === 'daily' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">כל כמה ימים</Label>
                <Select value={String(rule.interval_value || 1)} onValueChange={(v) => set('interval_value', Number(v))}>
                  <SelectTrigger className="h-9 text-sm border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,7,14,30].map(n => <SelectItem key={n} value={String(n)}>{n === 1 ? 'כל יום' : `כל ${n} ימים`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* ימי שבוע */}
          {rule.frequency === 'weekly' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">ימי שבוע</Label>
              <div className="flex gap-1.5 flex-wrap">
                {WEEKDAYS.map(d => {
                  const active = (rule.days_of_week || []).includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleWeekday(d.key)}
                      className={`w-9 h-9 rounded-lg text-xs font-bold transition-all border ${
                        active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* יום בחודש */}
          {(rule.frequency === 'monthly' || rule.frequency === 'yearly') && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">יום בחודש</Label>
              <Select value={String(rule.day_of_month || 1)} onValueChange={(v) => set('day_of_month', Number(v))}>
                <SelectTrigger className="h-9 text-sm border-slate-200 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* חודש בשנה */}
          {rule.frequency === 'yearly' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">חודש</Label>
              <Select value={String(rule.month_of_year || 1)} onValueChange={(v) => set('month_of_year', Number(v))}>
                <SelectTrigger className="h-9 text-sm border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS_HE.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* אופן יצירה */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">מתי ליצור משימה חדשה</Label>
            <Select value={rule.generate_mode} onValueChange={(v) => set('generate_mode', v)}>
              <SelectTrigger className="h-9 text-sm border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="on_completion">רק לאחר השלמת המשימה הנוכחית</SelectItem>
                <SelectItem value="on_due_date">בהגיע תאריך היעד</SelectItem>
                <SelectItem value="fixed_schedule">לפי לוח זמנים קבוע</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* תנאי סיום */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-600">תנאי סיום</Label>
            <div className="flex gap-2">
              {[
                { val: 'never', label: 'ללא הגבלה' },
                { val: 'on_date', label: 'עד תאריך' },
                { val: 'after_count', label: 'מספר חזרות' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => set('ends_mode', opt.val)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    rule.ends_mode === opt.val
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {rule.ends_mode === 'on_date' && (
              <Input
                type="date"
                value={rule.ends_at || ''}
                onChange={(e) => set('ends_at', e.target.value)}
                className="h-9 text-sm border-slate-200"
              />
            )}
            {rule.ends_mode === 'after_count' && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={rule.max_occurrences || ''}
                  onChange={(e) => set('max_occurrences', Number(e.target.value))}
                  placeholder="מספר חזרות"
                  className="h-9 text-sm border-slate-200 w-32"
                />
                <span className="text-xs text-slate-500">חזרות</span>
              </div>
            )}
          </div>

          {/* סיכום */}
          {summary && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 font-medium">{summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}