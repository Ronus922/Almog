import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSaturday, isFriday, getDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { Repeat2, Info } from 'lucide-react';

export default function CalendarGrid({ 
  currentMonth, 
  appointments, 
  onDateClick, 
  onAppointmentClick, 
  isHoliday, 
  getHolidayName,
  onDragDrop = null,
  draggedAppointment = null,
  onDragStart = null,
  onDragEnd = null,
}) {
  const [mobileTooltipId, setMobileTooltipId] = useState(null);
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
    return appointments.filter((apt) => isSameDay(new Date(apt.date), date));
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
    if (['ראש השנה', 'יום כיפור', 'סוכות', 'שמחת תורה', 'הושנא רבה', 'פסח', 'שבועות', 'לג בעומר', 'חנוכה'].some((h) => holidayName.includes(h))) {
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
        {weekDays.map((day, idx) =>
        <div key={day} className="bg-slate-100 text-slate-800 p-4 text-sm font-bold text-center border-r border-slate-200">
            {day}
          </div>
        )}
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
              draggable={false}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedAppointment && onDragDrop) {
                  e.currentTarget.classList.add('bg-blue-100');
                }
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('bg-blue-100');
              }}
              onDrop={(e) => {
                e.currentTarget.classList.remove('bg-blue-100');
                if (draggedAppointment && onDragDrop) {
                  onDragDrop(e, date);
                }
              }}
              onClick={() => {
                if (!isPast) {
                  onDateClick(date);
                }
              }}>

              {/* Day Number */}
              <div className="flex items-center justify-between mb-2">
                <div className={`text-sm font-bold ${
                isToday ?
                'text-white bg-blue-600 rounded-lg w-8 h-8 flex items-center justify-center' :
                isPast ?
                'text-slate-500' :
                'text-slate-900'}`
                }>
                  {format(date, 'd')}
                </div>
              </div>
              
              {/* Holiday Name */}
              {holiday &&
              <div className={`text-xs font-semibold rounded px-2 py-1 mb-2 truncate ${
              holiday.type === 'yom_tov' ?
              'bg-yellow-200 text-yellow-900' :
              'bg-green-200 text-green-900'}`
              }>
                  {holiday.name}
                </div>
              }

              {/* Appointments */}
              <div className="space-y-1">
                {dayAppointments.slice(0, 2).map((apt) => (
                  <div
                    key={apt.id}
                    className="text-xs p-2 rounded text-white cursor-pointer hover:shadow-lg transition-all font-medium border border-opacity-20 border-white flex flex-col gap-0.5 group relative"
                    style={{
                      backgroundColor: apt.event_color || '#3B82F6',
                      opacity: isPast ? 0.6 : 1,
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isPast) {
                        onAppointmentClick(apt);
                      }
                    }}>
                    {/* Main content */}
                    <div className="flex items-center gap-1 min-w-0">
                      {apt.is_recurring && <Repeat2 className="w-3 h-3 flex-shrink-0" />}
                      <span className="truncate">{apt.title}</span>
                    </div>

                    {/* Time and Location (compact) */}
                    <div className="text-xs opacity-90 truncate">
                      {apt.start_datetime && format(new Date(apt.start_datetime), 'HH:mm')}
                      {apt.location && ` • ${apt.location}`}
                    </div>

                    {/* Desktop Tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-white text-slate-900 text-xs p-4 rounded-lg shadow-md whitespace-normal w-56 z-50 border border-slate-200" dir="rtl">
                      <div className="font-bold text-sm mb-3 text-slate-900">{apt.title}</div>
                      
                      {apt.start_datetime && (
                        <div className="text-slate-700 text-xs mb-2">
                          🕐 {format(new Date(apt.start_datetime), 'HH:mm')} {apt.end_datetime && `- ${format(new Date(apt.end_datetime), 'HH:mm')}`}
                        </div>
                      )}
                      
                      {apt.location && (
                        <div className="text-slate-700 text-xs mb-2">
                          📍 {apt.location}
                        </div>
                      )}
                      
                      {apt.description && (
                        <div className="text-slate-600 text-xs mb-2 line-clamp-3">
                          {apt.description}
                        </div>
                      )}
                      
                      {apt.attendees_users?.length > 0 && (
                        <div className="text-slate-700 text-xs">
                          <div className="font-medium mb-1">משתתפים:</div>
                          {apt.attendees_users.slice(0, 3).map((user, idx) => (
                            <div key={idx} className="text-slate-600 mr-2">{user}</div>
                          ))}
                          {apt.attendees_users.length > 3 && (
                            <div className="text-slate-600 mr-2 text-xs">ועוד {apt.attendees_users.length - 3}</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Mobile Info Icon */}
                    <div 
                      className="absolute top-1 left-1 md:hidden cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMobileTooltipId(mobileTooltipId === apt.id ? null : apt.id);
                      }}
                    >
                      <Info className="w-3 h-3 text-white" />
                    </div>

                    {/* Mobile Tooltip */}
                    {mobileTooltipId === apt.id && (
                      <div className="absolute bottom-full right-0 mb-2 md:hidden bg-white text-slate-900 text-xs p-4 rounded-lg shadow-md whitespace-normal w-60 z-50 border border-slate-200" dir="rtl">
                        <div className="font-bold text-sm mb-3 text-slate-900">{apt.title}</div>
                        
                        {apt.start_datetime && (
                          <div className="text-slate-700 text-xs mb-2">
                            🕐 {format(new Date(apt.start_datetime), 'HH:mm')} {apt.end_datetime && `- ${format(new Date(apt.end_datetime), 'HH:mm')}`}
                          </div>
                        )}
                        
                        {apt.location && (
                          <div className="text-slate-700 text-xs mb-2">
                            📍 {apt.location}
                          </div>
                        )}
                        
                        {apt.description && (
                          <div className="text-slate-600 text-xs mb-2 line-clamp-3">
                            {apt.description}
                          </div>
                        )}
                        
                        {apt.attendees_users?.length > 0 && (
                          <div className="text-slate-700 text-xs">
                            <div className="font-medium mb-1">משתתפים:</div>
                            {apt.attendees_users.slice(0, 3).map((user, idx) => (
                              <div key={idx} className="text-slate-600 mr-2">{user}</div>
                            ))}
                            {apt.attendees_users.length > 3 && (
                              <div className="text-slate-600 mr-2 text-xs">ועוד {apt.attendees_users.length - 3}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {dayAppointments.length > 2 &&
                <div className="text-xs text-blue-600 px-2 font-semibold">
                    +{dayAppointments.length - 2} עוד
                  </div>
                }
              </div>
            </div>);

        })}
      </div>
    </div>);

}