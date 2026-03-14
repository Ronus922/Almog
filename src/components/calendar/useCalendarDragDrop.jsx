import { useState } from 'react';
import { format } from 'date-fns';

export function useCalendarDragDrop(onSave) {
  const [draggedAppointment, setDraggedAppointment] = useState(null);

  const handleDragStart = (e, appointment) => {
    setDraggedAppointment(appointment);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedAppointment(null);
  };

  const handleDropOnDate = async (e, newDate, newTime = null) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedAppointment) return;

    try {
      let updatedData = {
        ...draggedAppointment,
        date: format(newDate, 'yyyy-MM-dd'),
      };

      // If time provided (week/day view)
      if (newTime) {
        updatedData.start_datetime = `${format(newDate, 'yyyy-MM-dd')}T${newTime}`;
        
        // Calculate end time based on duration
        if (draggedAppointment.start_datetime && draggedAppointment.end_datetime) {
          const start = new Date(draggedAppointment.start_datetime);
          const end = new Date(draggedAppointment.end_datetime);
          const duration = (end - start) / (1000 * 60); // duration in minutes
          
          const newStart = new Date(`${format(newDate, 'yyyy-MM-dd')}T${newTime}`);
          const newEnd = new Date(newStart.getTime() + duration * 60000);
          updatedData.end_datetime = newEnd.toISOString();
        }
      }

      await onSave({
        id: draggedAppointment.id,
        data: updatedData,
      });

      setDraggedAppointment(null);
    } catch (error) {
      console.error('Failed to drop appointment:', error);
    }
  };

  return {
    draggedAppointment,
    handleDragStart,
    handleDragEnd,
    handleDropOnDate,
  };
}