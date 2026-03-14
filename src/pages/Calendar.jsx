import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSaturday, isFriday, addMonths, subMonths, addDays, subDays, addWeeks, subWeeks, getDay } from 'date-fns';
import { he } from 'date-fns/locale';
import AppointmentForm from '@/components/calendar/AppointmentForm';
import AppointmentModal from '@/components/calendar/AppointmentModal';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/calendar/DayView';
import RecurrenceDeleteDialog from '@/components/calendar/RecurrenceDeleteDialog';
import RecurrenceEditDialog from '@/components/calendar/RecurrenceEditDialog';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import DateRangePickerDialog from '@/components/calendar/DateRangePickerDialog';
import CalendarQuickFilters from '@/components/calendar/CalendarQuickFilters';
import { useCalendarDragDrop } from '@/components/calendar/useCalendarDragDrop';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const HEBREW_HOLIDAYS = [
  { date: '2026-04-13', name: 'פסח (יום ראשון)' },
  { date: '2026-04-14', name: 'פסח (חול המועד)' },
  { date: '2026-04-15', name: 'פסח (חול המועד)' },
  { date: '2026-04-16', name: 'פסח (חול המועד)' },
  { date: '2026-04-17', name: 'פסח (חול המועד)' },
  { date: '2026-04-18', name: 'פסח (חול המועד)' },
  { date: '2026-04-19', name: 'פסח (יום שביעי)' },
  { date: '2026-05-14', name: 'לג בעומר' },
  { date: '2026-09-23', name: 'ראש השנה (יום ראשון)' },
  { date: '2026-09-24', name: 'ראש השנה (יום שני)' },
  { date: '2026-10-02', name: 'יום כיפור' },
  { date: '2026-10-06', name: 'סוכות (יום ראשון)' },
  { date: '2026-10-07', name: 'סוכות (חול המועד)' },
  { date: '2026-10-08', name: 'סוכות (חול המועד)' },
  { date: '2026-10-09', name: 'סוכות (חול המועד)' },
  { date: '2026-10-10', name: 'סוכות (חול המועד)' },
  { date: '2026-10-11', name: 'סוכות (חול המועד)' },
  { date: '2026-10-12', name: 'הושנא רבה' },
  { date: '2026-10-13', name: 'שמחת תורה' },
  { date: '2026-12-25', name: 'חנוכה' },
  { date: '2026-12-26', name: 'חנוכה' },
  { date: '2026-12-27', name: 'חנוכה' },
  { date: '2026-12-28', name: 'חנוכה' },
  { date: '2026-12-29', name: 'חנוכה' },
  { date: '2026-12-30', name: 'חנוכה' },
  { date: '2026-12-31', name: 'חנוכה' },
  { date: '2027-01-01', name: 'חנוכה' },
];

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState(null);
  const [meetingTypeFilter, setMeetingTypeFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const queryClient = useQueryClient();

  // Drag & Drop
  const handleDragDrop = async (e, newDate) => {
    if (!draggedAppointment) return;
    await updateEventMutation.mutateAsync({
      id: draggedAppointment.id,
      data: {
        ...draggedAppointment,
        event_date: format(newDate, 'yyyy-MM-dd'),
      },
    });
    setDraggedAppointment(null);
  };

  const {
    draggedAppointment,
    handleDragStart,
    handleDragEnd,
  } = useCalendarDragDrop(handleDragDrop);

  // Persist filters to localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('calendarFilters');
    if (saved) {
      const { meetingType, user } = JSON.parse(saved);
      setMeetingTypeFilter(meetingType || '');
      setUserFilter(user || '');
    }
  }, []);

  const saveFilters = (mt, u) => {
    localStorage.setItem('calendarFilters', JSON.stringify({
      meetingType: mt,
      user: u,
    }));
  };

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-date'),
  });

  const { data: calendarEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: () => base44.entities.CalendarEvent.list('-event_date'),
  });

  // Filter appointments and events based on quick filters
  const filteredAppointments = useMemo(() => {
    let result = appointments;
    
    if (meetingTypeFilter) {
      result = result.filter(a => a.appointment_type === meetingTypeFilter);
    }
    
    if (userFilter) {
      result = result.filter(a => a.attendees_users?.includes(userFilter));
    }
    
    return result;
  }, [appointments, meetingTypeFilter, userFilter]);

  const filteredEvents = useMemo(() => {
    let result = calendarEvents;
    
    if (meetingTypeFilter) {
      result = result.filter(e => e.meeting_type === meetingTypeFilter);
    }
    
    if (userFilter) {
      result = result.filter(e => e.owner_user_id === userFilter);
    }
    
    return result;
  }, [calendarEvents, meetingTypeFilter, userFilter]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Appointment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowForm(false);
      setSelectedDate(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Appointment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setSelectedAppointment(null);
    },
  });

  const deleteMutation = useMutation({
   mutationFn: (id) => base44.entities.Appointment.delete(id),
   onSuccess: () => {
     queryClient.invalidateQueries({ queryKey: ['appointments'] });
     setSelectedAppointment(null);
   },
  });

  // Calendar Events Mutations
  const createEventMutation = useMutation({
   mutationFn: (data) => base44.entities.CalendarEvent.create(data),
   onSuccess: () => {
     queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
     setShowForm(false);
     setSelectedAppointment(null);
   },
  });

  const updateEventMutation = useMutation({
   mutationFn: ({ id, data }) => base44.entities.CalendarEvent.update(id, data),
   onSuccess: () => {
     queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
     setShowForm(false);
     setSelectedAppointment(null);
   },
  });

  const deleteEventMutation = useMutation({
   mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
   onSuccess: () => {
     queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
     setShowDeleteDialog(false);
     setSelectedAppointment(null);
   },
  });

  const handleNavigate = (direction) => {
    if (viewMode === 'month') {
      if (direction === 'next') {
        setCurrentMonth(addMonths(currentMonth, 1));
      } else {
        setCurrentMonth(subMonths(currentMonth, 1));
      }
    } else if (viewMode === 'week') {
      if (direction === 'next') {
        setCurrentMonth(addWeeks(currentMonth, 1));
      } else {
        setCurrentMonth(subWeeks(currentMonth, 1));
      }
    } else if (viewMode === 'day') {
      if (direction === 'next') {
        setCurrentMonth(addDays(currentMonth, 1));
      } else {
        setCurrentMonth(subDays(currentMonth, 1));
      }
    }
  };

  const handleDateRangeSelect = (startDate, endDate) => {
    if (startDate && endDate) {
      setCustomDateRange({ start: startDate, end: endDate });
      setCurrentMonth(startDate);
    } else {
      setCustomDateRange(null);
      setCurrentMonth(new Date());
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setShowForm(true);
  };

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
  };

  const handleSaveEvent = async (formData) => {
    try {
      if (selectedAppointment?.id) {
        // Update existing
        await updateEventMutation.mutateAsync({
          id: selectedAppointment.id,
          data: formData,
        });
      } else {
        // Create new
        await createEventMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };

  const handleDeleteEvent = async () => {
    if (selectedAppointment?.id) {
      await deleteEventMutation.mutateAsync(selectedAppointment.id);
    }
  };

  const handleSaveAppointment = async (data) => {
    if (selectedAppointment) {
      if (selectedAppointment.series_id) {
        setEditMode(null);
        setShowEditDialog(true);
      } else {
        await updateMutation.mutateAsync({ id: selectedAppointment.id, data });
      }
    } else {
      if (data.is_recurring && data.recurrence_count) {
        const seriesId = `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startDate = new Date(data.date);
        const instances = [];
        
        for (let i = 0; i < data.recurrence_count; i++) {
          let nextDate = startDate;
          const interval = data.recurrence_interval || 1;
          
          if (data.recurrence_pattern === 'יומי') {
            nextDate = addDays(startDate, i * interval);
          } else if (data.recurrence_pattern === 'שבועי') {
            nextDate = addWeeks(startDate, i * interval);
          } else if (data.recurrence_pattern === 'חודשי') {
            nextDate = addMonths(startDate, i * interval);
          } else if (data.recurrence_pattern === 'שנתי') {
            nextDate = addMonths(startDate, i * interval * 12);
          }
          
          instances.push({
            ...data,
            date: format(nextDate, 'yyyy-MM-dd'),
            series_id: seriesId,
            series_occurrence_number: i + 1,
            is_recurring: true,
          });
        }
        
        for (const instance of instances) {
          await createMutation.mutateAsync(instance);
        }
      } else if (!data.is_recurring) {
        await createMutation.mutateAsync(data);
      }
    }
  };

  const handleEditRecurring = async (mode) => {
    setEditMode(mode);
    setShowEditDialog(false);
    
    if (mode === 'single') {
      // Mark as exception and open form
      setSelectedAppointment({
        ...selectedAppointment,
        is_exception: true,
      });
      setShowForm(true);
    } else if (mode === 'following') {
      // Create new series for following events
      const newSeriesId = `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const followingAppointments = appointments.filter(
        a => a.series_id === selectedAppointment.series_id && 
        a.series_occurrence_number > selectedAppointment.series_occurrence_number
      );
      
      for (const apt of followingAppointments) {
        await updateMutation.mutateAsync({
          id: apt.id,
          data: { series_id: newSeriesId },
        });
      }
      setShowForm(true);
    } else if (mode === 'all') {
      setShowForm(true);
    }
  };

  const handleDeleteAppointment = async () => {
    if (selectedAppointment && selectedAppointment.series_id) {
      setShowDeleteDialog(true);
    } else if (selectedAppointment) {
      await deleteMutation.mutateAsync(selectedAppointment.id);
    }
  };

  const handleDeleteRecurring = async (mode) => {
    if (mode === 'single') {
      // מחק רק את המופע הספציפי
      await deleteMutation.mutateAsync(selectedAppointment.id);
    } else if (mode === 'following') {
      // מחק את האירוע הנוכחי וכל האירועים העתידיים באותה סדרה
      const seriesAppointments = appointments.filter(
        a => a.series_id === selectedAppointment.series_id
      );
      
      // מיין לפי תאריך כדי למצוא כל המופעים שבתאריך שווה או גדול יותר
      const selectedDate = new Date(selectedAppointment.date);
      const toDelete = seriesAppointments.filter(
        a => new Date(a.date) >= selectedDate
      );
      
      for (const apt of toDelete) {
        await deleteMutation.mutateAsync(apt.id);
      }
    }
    setShowDeleteDialog(false);
  };

  const isHoliday = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return HEBREW_HOLIDAYS.some(h => h.date === dateStr);
  };

  const getHolidayName = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = HEBREW_HOLIDAYS.find(h => h.date === dateStr);
    return holiday?.name || '';
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthRangeStr = `${format(monthStart, 'dd/MM/yyyy')} - ${format(monthEnd, 'dd/MM/yyyy')}`;

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 p-4 md:p-8 overflow-auto" dir="rtl">
      <div className="w-full min-h-screen flex flex-col">
        {/* Header Section with Gradient */}
        <div className="bg-gradient-to-l from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">יומן פגישות</h1>
          <p className="text-blue-100 text-sm">ניהול פגישות ומשימות בקלות ובארגון</p>
        </div>

        <div className="flex items-center justify-between gap-4 mb-6">
          {/* Add Button */}
          <Button
            onClick={() => {
              setSelectedAppointment(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            פגישה חדשה
          </Button>
        </div>

        {/* Quick Filters */}
        <CalendarQuickFilters
          meetingTypeFilter={meetingTypeFilter}
          userFilter={userFilter}
          onMeetingTypeChange={(type) => {
            setMeetingTypeFilter(type);
            saveFilters(type, userFilter);
          }}
          onUserChange={(user) => {
            setUserFilter(user);
            saveFilters(meetingTypeFilter, user);
          }}
          onClearAll={() => {
            setMeetingTypeFilter('');
            setUserFilter('');
            saveFilters('', '');
          }}
        />

        {/* Calendar Header */}
        <CalendarHeader
          currentDate={currentMonth}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNavigate={handleNavigate}
          customDateRange={customDateRange}
          onOpenDateRangePicker={() => setShowDateRangePicker(true)}
        />

        {/* Calendar View Container */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'month' && (
            <CalendarGrid
              currentMonth={currentMonth}
              appointments={filteredAppointments}
              onDateClick={handleDateClick}
              onAppointmentClick={handleAppointmentClick}
              isHoliday={isHoliday}
              getHolidayName={getHolidayName}
              draggedAppointment={draggedAppointment}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragDrop={handleDragDrop}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              currentDate={currentMonth}
              appointments={filteredAppointments}
              onDateClick={handleDateClick}
              onAppointmentClick={handleAppointmentClick}
            />
          )}
          {viewMode === 'day' && (
            <DayView
              currentDate={currentMonth}
              appointments={filteredAppointments}
              onDateClick={handleDateClick}
              onAppointmentClick={handleAppointmentClick}
            />
          )}
        </div>
      </div>

      {/* Appointment Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" dir="rtl">
          <div className="bg-gradient-to-l from-blue-600 to-indigo-600 px-6 py-6 text-white rounded-t-lg">
            <h2 className="text-2xl font-bold">
              {selectedAppointment ? 'עריכת פגישה' : 'פגישה חדשה'}
            </h2>
            <p className="text-sm text-blue-100 mt-1">ניהול פרטי הפגישה</p>
          </div>
          <div className="p-6">
            <AppointmentForm
              appointment={selectedAppointment}
              selectedDate={selectedDate}
              onSave={handleSaveAppointment}
              onCancel={() => {
                setShowForm(false);
                setSelectedAppointment(null);
                setSelectedDate(null);
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <AppointmentModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onEdit={() => setShowForm(true)}
          onDelete={handleDeleteAppointment}
          isDeleting={deleteMutation.isPending}
        />
      )}

      {/* Recurrence Edit Dialog */}
      <RecurrenceEditDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onEdit={handleEditRecurring}
        appointmentTitle={selectedAppointment?.title || ''}
        isException={selectedAppointment?.is_exception}
      />

      {/* Recurrence Delete Dialog */}
      <RecurrenceDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onDelete={handleDeleteRecurring}
        appointmentTitle={selectedAppointment?.title || ''}
      />

      {/* Date Range Picker Dialog */}
      <DateRangePickerDialog
        isOpen={showDateRangePicker}
        onClose={() => setShowDateRangePicker(false)}
        onSelect={handleDateRangeSelect}
        defaultStart={customDateRange?.start}
        defaultEnd={customDateRange?.end}
      />
    </div>
  );
}