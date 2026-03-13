import React from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { isSameDay } from 'date-fns';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function DayView({ currentDate, appointments, onDateClick, onAppointmentClick }) {
  const dayAppointments = appointments.filter(apt => isSameDay(new Date(apt.date), currentDate));

  const getAppointmentStyle = (apt) => {
    const [startHour, startMin] = apt.start_time.split(':').map(Number);
    const [endHour, endMin] = apt.end_time.split(':').map(Number);
    const startPercent = ((startHour + startMin / 60) / 24) * 100;
    const heightPercent = (((endHour + endMin / 60) - (startHour + startMin / 60)) / 24) * 100;
    
    return {
      top: `${startPercent}%`,
      height: `${Math.max(heightPercent, 3)}%`,
      backgroundColor: apt.event_color || '#3B82F6',
    };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-slate-200 text-center">
        <div className="text-sm font-semibold text-slate-600">
          {format(currentDate, 'EEEE', { locale: he })}
        </div>
        <div className="text-4xl font-bold text-slate-900">
          {format(currentDate, 'd MMMM yyyy', { locale: he })}
        </div>
      </div>

      {/* Grid */}
      <div className="max-h-[70vh] overflow-y-auto grid grid-cols-12">
        {/* Hour Column */}
        <div className="col-span-2 bg-slate-50 border-r border-slate-200">
          {HOURS.map((hour) => (
            <div key={hour} className="h-20 border-b border-slate-100 p-2 text-xs font-medium text-slate-600 text-center">
              {format(new Date(2024, 0, 1, hour), 'HH:mm')}
            </div>
          ))}
        </div>

        {/* Time Slots */}
        <div className="col-span-10 relative">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="h-20 border-b border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer"
              onClick={() => onDateClick(currentDate)}
            />
          ))}

          {/* Appointments */}
          {dayAppointments.map((apt) => (
            <div
              key={apt.id}
              className="absolute inset-x-2 p-2 rounded text-white text-sm overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              style={getAppointmentStyle(apt)}
              onClick={() => onAppointmentClick(apt)}
            >
              <div className="font-bold truncate">{apt.title}</div>
              <div className="text-xs opacity-90">{apt.start_time} - {apt.end_time}</div>
              {apt.location && <div className="text-xs opacity-75 truncate">📍 {apt.location}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}