import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, getDay } from 'date-fns';
import { he } from 'date-fns/locale';

export default function CalendarHeader({
  currentDate,
  viewMode,
  onViewModeChange,
  onNavigate,
  customDateRange,
  onOpenDateRangePicker,
}) {
  const getDisplayRange = () => {
    if (customDateRange?.start && customDateRange?.end) {
      return `${format(customDateRange.start, 'dd/MM/yyyy')} - ${format(customDateRange.end, 'dd/MM/yyyy')}`;
    }

    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return `${format(monthStart, 'dd/MM/yyyy')} - ${format(monthEnd, 'dd/MM/yyyy')}`;
    }

    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(weekStart, 'dd/MM/yyyy')} - ${format(weekEnd, 'dd/MM/yyyy')}`;
    }

    if (viewMode === 'day') {
      return format(currentDate, 'dd/MM/yyyy');
    }
  };

  const getMonthLabel = () => {
    return format(currentDate, 'MMMM yyyy', { locale: he });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6" dir="rtl">
      <div className="flex items-center justify-between gap-4">
        {/* Right: View Mode Selector */}
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 flex-shrink-0">
          {[
            { mode: 'day', label: 'יום' },
            { mode: 'week', label: 'שבוע' },
            { mode: 'month', label: 'חודש' },
          ].map((item) => (
            <Button
              key={item.mode}
              variant={viewMode === item.mode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange(item.mode)}
              className={`text-xs font-bold px-4 py-2 h-auto rounded-md transition-all ${
                viewMode === item.mode
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {/* Center: Date Range */}
        <div className="flex-1 text-center">
          <button
            onClick={onOpenDateRangePicker}
            className="inline-block px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200"
          >
            <p className="text-sm font-semibold text-slate-900">{getDisplayRange()}</p>
            <p className="text-xs text-slate-600 mt-2 font-medium">{getMonthLabel()}</p>
          </button>
        </div>

        {/* Left: Navigation Arrows */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate('next')}
            className="h-9 w-9 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            title="חודש הבא"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            onClick={() => onNavigate('prev')}
            className="h-10 w-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:scale-105 transition-all rounded-lg"
            title="חודש קודם"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}