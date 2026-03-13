import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSaturday, isFriday, getDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { Repeat2 } from 'lucide-react';

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
  
  const weekDays = ['יום א׳', 'יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת'];

  const getAppointmentsForDay = (date) => {
    return appointments.filter(apt => isSameDay(new Date(apt.date), date));
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const isPastDate = (date) => {
    // השוואה לפי תאריך בלבד, בלי שעה וללא תלות בtimezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    return compareDate < today;
  };

  const getIsraeliHolidayName = (date) => {
    const holidayName = getHolidayName(date);
    if (!holidayName) return null;
    
    // Categorize holiday
    if (holidayName.includes('חול המועד')) return { name: holidayName, type: 'chol_hamoed' };
    if (['ראש השנה', 'יום כיפור', 'סוכות', 'שמחת תורה', 'הושנא רבה', 'פסח', 'שבועות', 'לג בעומר', 'חנוכה'].some(h => holidayName.includes(h))) {
      return { name: holidayName, type: 'yom_tov' };
    }
    return { name: holidayName, type: 'yom_tov' };
  };

  const getDayStyles = (date) => {
    const holiday = getIsraeliHolidayName(date);
    const isShabat = isSaturday(date) || isFriday(date);
    const isPast = isPastDate(date);
    const isToday = isSameDay(date, new Date());

    // Base styles
    const baseStyles = 'p-4 min-h-40 border-r border-b border-slate-200 transition-all cursor-pointer hover:shadow-sm';
    
    // Holiday type styles (highest priority)
    if (holiday?.type === 'yom_tov') {
      return `${baseStyles} bg-gradient-to-b from-yellow-50 to-yellow-25 hover:from-yellow-100 hover:to-yellow-50`;
    }
    if (holiday?.type === 'chol_hamoed') {
      return `${baseStyles} bg-gradient-to-b from-green-50 to-green-25 hover:from-green-100 hover:to-green-50`;
    }

    // Shabbat style (priority after holidays)
    if (isShabat && !holiday) {
      return `${baseStyles} bg-slate-100 hover:bg-slate-200`;
    }

    // Past date (only by date, regardless of month)
    if (isPast) {
      return `${baseStyles} bg-slate-100 text-slate-500 opacity-60 cursor-not-allowed`;
    }

    // Today highlight
    if (isToday) {
      return `${baseStyles} bg-gradient-to-b from-blue-100 to-blue-50 border-r-2 border-b-2 border-blue-400 shadow-sm`;
    }

    // Default - future dates
    return `${baseStyles} bg-white hover:bg-slate-50`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200 w-full h-full flex flex-col" dir="rtl">
      {/* Header with weekday names */}
      <div className="grid grid-cols-7 gap-0 bg-slate-50 border-b border-slate-300">
        {weekDays.map((day, idx) => (
          <div key={day} className={`p-4 text-center text-sm font-bold text-slate-800 ${idx > 0 ? 'border-r border-slate-200' : ''}`}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0 flex-1 overflow-y-auto" dir="rtl">
        {days.map((date, idx) => {
           const dayAppointments = getAppointmentsForDay(date);
           const holiday = getIsraeliHolidayName(date);
           const isToday = isSameDay(date, new Date());
           const isPast = isPastDate(date);

          return (
            <div
              key={idx}
              className={getDayStyles(date)}
              onClick={() => {
                if (!isPast) {
                  onDateClick(date);
                }
              }}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-2">
                <div className={`text-sm font-bold ${
                  isToday 
                    ? 'text-white bg-blue-600 rounded-lg w-8 h-8 flex items-center justify-center' 
                    : isPast 
                    ? 'text-slate-500' 
                    : 'text-slate-900'
                }`}>
                  {format(date, 'd')}
                </div>
              </div>
              
              {/* Holiday Name */}
              {holiday && (
                <div className={`text-xs font-semibold rounded px-2 py-1 mb-2 truncate ${
                  holiday.type === 'yom_tov'
                    ? 'bg-yellow-200 text-yellow-900'
                    : 'bg-green-200 text-green-900'
                }`}>
                  {holiday.name}
                </div>
              )}

              {/* Appointments */}
              <div className="space-y-1">
                {dayAppointments.slice(0, 2).map((apt) => (
                    <div
                      key={apt.id}
                      className="text-xs p-2 rounded text-white truncate cursor-pointer hover:shadow-lg transition-shadow font-medium border border-opacity-20 border-white flex items-center gap-1"
                      style={{ 
                        backgroundColor: apt.event_color || '#3B82F6',
                        opacity: isPast ? 0.6 : 1
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isPast) {
                          onAppointmentClick(apt);
                        }
                      }}
                      title={apt.is_recurring ? `${apt.title} (אירוע מחזורי)` : apt.title}
                    >
                      {apt.is_recurring && <Repeat2 className="w-3 h-3 flex-shrink-0" />}
                      <span className="truncate">{apt.title}</span>
                    </div>
                  ))}
                {dayAppointments.length > 2 && (
                  <div className="text-xs text-blue-600 px-2 font-semibold">
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