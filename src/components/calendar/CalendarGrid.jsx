import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSaturday, isFriday, getDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card } from '@/components/ui/card';

export default function CalendarGrid({ currentMonth, appointments, onDateClick, onAppointmentClick, isHoliday, getHolidayName }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Get all days in the calendar view (including prev/next month days)
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - getDay(monthStart));
  
  const endDate = new Date(monthEnd);
  const daysUntilSunday = 6 - getDay(monthEnd);
  endDate.setDate(endDate.getDate() + daysUntilSunday);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  const getAppointmentsForDay = (date) => {
    return appointments.filter(apt => isSameDay(new Date(apt.date), date));
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const getDayStyles = (date) => {
    const baseStyles = 'p-2 min-h-24 border border-slate-200 text-right cursor-pointer transition-colors';
    
    if (isHoliday(date)) {
      return `${baseStyles} bg-amber-50 hover:bg-amber-100`;
    }
    if (isSaturday(date) || isFriday(date)) {
      return `${baseStyles} bg-red-50 hover:bg-red-100`;
    }
    if (!isCurrentMonth(date)) {
      return `${baseStyles} bg-slate-50 text-slate-400`;
    }
    return `${baseStyles} bg-white hover:bg-blue-50`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200">
      {/* Header with weekday names */}
      <div className="grid grid-cols-7 gap-0 bg-slate-900 text-white font-bold">
        {weekDays.map((day) => (
          <div key={day} className="p-4 text-center text-sm">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0">
        {days.map((date, idx) => {
          const dayAppointments = getAppointmentsForDay(date);
          const holiday = getHolidayName(date);
          const isToday = isSameDay(date, new Date());

          return (
            <div
              key={idx}
              className={getDayStyles(date)}
              onClick={() => isCurrentMonth(date) && onDateClick(date)}
            >
              <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600 text-lg' : ''}`}>
                {format(date, 'd')}
              </div>
              
              {holiday && (
                <div className="text-xs bg-amber-200 text-amber-900 rounded px-1 py-0.5 mb-1 truncate">
                  {holiday}
                </div>
              )}

              <div className="space-y-1">
                {dayAppointments.slice(0, 2).map((apt) => (
                  <div
                    key={apt.id}
                    className="text-xs p-1 rounded text-white truncate cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: apt.event_color || '#3B82F6' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick(apt);
                    }}
                  >
                    {apt.title}
                  </div>
                ))}
                {dayAppointments.length > 2 && (
                  <div className="text-xs text-slate-500 px-1">
                    +{dayAppointments.length - 2} עוד
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}