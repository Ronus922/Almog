import React from 'react';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, eachHourOfInterval, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function WeekView({ currentDate, appointments, onDateClick, onAppointmentClick }) {
  // Placeholder - will be updated to match new design
  if (!appointments) return null;
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getAppointmentsForDay = (day) => {
    return appointments.filter(apt => isSameDay(new Date(apt.date), day));
  };

  const getAppointmentStyle = (apt) => {
    const [startHour, startMin] = apt.start_time.split(':').map(Number);
    const [endHour, endMin] = apt.end_time.split(':').map(Number);
    const startPercent = ((startHour + startMin / 60) / 24) * 100;
    const heightPercent = (((endHour + endMin / 60) - (startHour + startMin / 60)) / 24) * 100;
    
    return {
      top: `${startPercent}%`,
      height: `${heightPercent}%`,
      backgroundColor: apt.event_color || '#3B82F6',
    };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-8 border-b border-slate-200">
        <div className="col-span-1 bg-slate-50 p-4 border-r border-slate-200"></div>
        {days.map((day) => (
          <div key={day.toISOString()} className="col-span-1 bg-slate-50 p-4 border-r border-slate-200 text-center">
            <div className="text-sm font-semibold text-slate-700">
              {format(day, 'EEE', { locale: he })}
            </div>
            <div className="text-lg font-bold text-slate-900">
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="max-h-[70vh] overflow-y-auto">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-slate-100 h-20">
            {/* Hour Label */}
            <div className="col-span-1 bg-slate-50 p-2 border-r border-slate-200 text-xs font-medium text-slate-600 text-center">
              {format(new Date(2024, 0, 1, hour), 'HH:mm')}
            </div>

            {/* Day Cells */}
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className="col-span-1 border-r border-slate-100 p-1 relative cursor-pointer hover:bg-blue-50 transition-colors"
                onClick={() => onDateClick(day)}
              >
                {/* Appointments */}
                {getAppointmentsForDay(day).map((apt) => {
                  const [aptHour] = apt.start_time.split(':').map(Number);
                  if (aptHour === hour) {
                    return (
                      <div
                        key={apt.id}
                        className="absolute inset-0 p-1 rounded text-white text-xs overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        style={getAppointmentStyle(apt)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick(apt);
                        }}
                      >
                        <div className="font-semibold truncate">{apt.title}</div>
                        <div className="text-xs opacity-90">{apt.start_time} - {apt.end_time}</div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}