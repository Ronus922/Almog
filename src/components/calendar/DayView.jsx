import React from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { isSameDay } from 'date-fns';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function DayView({ 
  currentDate, 
  appointments, 
  onDateClick, 
  onAppointmentClick,
  draggedAppointment,
  onDragStart,
  onDragEnd,
  onDragDrop,
}) {
  if (!appointments || appointments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden p-8 text-center">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-slate-200 rounded-t-lg text-center mb-6">
          <div className="text-sm font-semibold text-slate-600">
            {format(currentDate, 'EEEE', { locale: he })}
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {format(currentDate, 'd MMMM yyyy', { locale: he })}
          </div>
        </div>
        <p className="text-slate-500 font-medium">אין אירועים בתאריך זה</p>
      </div>
    );
  }
  
  const dayAppointments = appointments
    .filter(apt => {
      const aptDate = apt.event_date || apt.date;
      return isSameDay(new Date(aptDate), currentDate);
    })
    .sort((a, b) => {
      const aStart = a.start_time || a.start_datetime || '';
      const bStart = b.start_time || b.start_datetime || '';
      return aStart.localeCompare(bStart);
    });

  const getAppointmentStyle = (apt) => {
    const startTime = apt.start_time || apt.start_datetime?.split('T')[1] || '10:00';
    const endTime = apt.end_time || apt.end_datetime?.split('T')[1] || '11:00';
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startPercent = ((startHour + startMin / 60) / 24) * 100;
    const heightPercent = (((endHour + endMin / 60) - (startHour + startMin / 60)) / 24) * 100;
    
    return {
      top: `${startPercent}%`,
      height: `${Math.max(heightPercent, 3)}%`,
      backgroundColor: apt.event_color || '#3B82F6',
    };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden w-full">
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
       <div className="max-h-[70vh] overflow-y-auto overflow-x-auto grid grid-cols-12 min-w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
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
               draggable={!!onDragDrop}
               onDragStart={(e) => {
                 if (onDragStart) onDragStart(e, apt);
               }}
               onDragEnd={(e) => {
                 if (onDragEnd) onDragEnd(e);
               }}
               className="absolute inset-x-2 p-2 rounded text-white text-sm overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-lg transition-all hover:opacity-90"
               style={{
                 ...getAppointmentStyle(apt),
                 opacity: draggedAppointment?.id === apt.id ? 0.5 : 1,
               }}
               onClick={() => onAppointmentClick(apt)}
             >
               <div className="font-bold truncate">{apt.title}</div>
                <div className="text-xs opacity-90">
                  {(apt.start_time || apt.start_datetime?.split('T')[1] || '10:00').slice(0, 5)} - {(apt.end_time || apt.end_datetime?.split('T')[1] || '11:00').slice(0, 5)}
                </div>
                {apt.location && <div className="text-xs opacity-75 truncate">📍 {apt.location}</div>}
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}