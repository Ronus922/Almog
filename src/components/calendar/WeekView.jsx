import React from 'react';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, eachHourOfInterval, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function WeekView({ 
  currentDate, 
  appointments, 
  onDateClick, 
  onAppointmentClick,
  draggedAppointment,
  onDragStart,
  onDragEnd,
  onDragDrop,
}) {
  if (!appointments) return null;
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getAppointmentsForDay = (day) => {
    return appointments.filter(apt => isSameDay(new Date(apt.event_date), day));
  };

  const getAppointmentStyle = (apt) => {
    const [startHour, startMin] = apt.start_datetime.split('T')[1].split(':').map(Number);
    const [endHour, endMin] = apt.end_datetime.split('T')[1].split(':').map(Number);
    const startPercent = ((startHour + startMin / 60) / 24) * 100;
    const heightPercent = (((endHour + endMin / 60) - (startHour + startMin / 60)) / 24) * 100;
    
    return {
      top: `${startPercent}%`,
      height: `${Math.max(heightPercent, 3)}%`,
      backgroundColor: apt.color_key || '#3B82F6',
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
                    const [aptHour] = apt.start_datetime.split('T')[1].split(':').map(Number);
                    if (aptHour === hour) {
                      return (
                        <div
                          key={apt.id}
                          draggable={!!onDragDrop}
                          onDragStart={(e) => {
                            if (onDragStart) onDragStart(e, apt);
                          }}
                          onDragEnd={(e) => {
                            if (onDragEnd) onDragEnd(e);
                          }}
                          className="absolute inset-0 p-1 rounded text-white text-xs overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-lg transition-all hover:opacity-90"
                          style={{
                            ...getAppointmentStyle(apt),
                            opacity: draggedAppointment?.id === apt.id ? 0.5 : 1,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(apt);
                          }}
                        >
                          <div className="font-semibold truncate">{apt.title}</div>
                          <div className="text-xs opacity-90">{apt.start_datetime.split('T')[1].slice(0, 5)} - {apt.end_datetime.split('T')[1].slice(0, 5)}</div>
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