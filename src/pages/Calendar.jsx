import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
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
  const { toast } = useToast();
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
  const [itemTypeFilter, setItemTypeFilter] = useState('הכל');
  const [meetingTypeFilter, setMeetingTypeFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const queryClient = useQueryClient();

  // Drag & Drop
  const [draggedAppointment, setDraggedAppointment] = useState(null);

  const handleDragDrop = async (e, newDate, newTime = null) => {
    if (!draggedAppointment) return;
    
    const originalAppointment = draggedAppointment;
    
    try {
      const updatedData = {
        ...draggedAppointment,
        event_date: format(newDate, 'yyyy-MM-dd'),
      };
      
      // אם יש שעה חדשה (מWeek/Day view), עדכן את השעה
      if (newTime) {
        updatedData.start_datetime = `${format(newDate, 'yyyy-MM-dd')}T${newTime}`;
      }
      
      await updateEventMutation.mutateAsync({
        id: draggedAppointment.id,
        data: updatedData,
      });
      // הודעת ההצלחה תוצג דרך updateEventMutation.onSuccess בלבד
    } catch (error) {
      // revert state - החזר לחזרה למקום הקודם
      setDraggedAppointment(originalAppointment);
      
      toast({
        title: '❌ שגיאה בשמירה',
        description: 'לא הצלחנו להעביר את הפגישה',
        variant: 'destructive',
        duration: 2500,
      });
      console.error('Drag & Drop error:', error);
    } finally {
      setDraggedAppointment(null);
    }
  };

  const handleDragStart = (e, appointment) => {
    setDraggedAppointment(appointment);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedAppointment(null);
  };

  // Persist filters to localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('calendarFilters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setItemTypeFilter(parsed.itemType || 'הכל');
        setMeetingTypeFilter(parsed.meetingType || '');
        setUserFilter(parsed.user || '');
      } catch (e) {
        // ignore corrupted localStorage
      }
    }
  }, []);

  // Handle "Show all" button click from CalendarGrid
  React.useEffect(() => {
    const handleShowDayView = (e) => {
      const date = e.detail?.date;
      if (date) {
        setCurrentMonth(date);
        setViewMode('day');
      }
    };
    
    window.addEventListener('showDayView', handleShowDayView);
    return () => window.removeEventListener('showDayView', handleShowDayView);
  }, []);

  const saveFilters = (itemType, mt, u) => {
    localStorage.setItem('calendarFilters', JSON.stringify({
      itemType: itemType,
      meetingType: mt,
      user: u,
    }));
  };

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-date'),
  });

  // calendarEvents משתמש באותה query כמו appointments
  const calendarEvents = appointments;

  // Filter appointments and events based on quick filters
  const filteredAppointments = useMemo(() => {
    let result = appointments;
    
    // 1. Filter by item type (פריט סוג)
    if (itemTypeFilter === 'משימות') {
      result = result.filter(a => a.appointment_type === 'משימה');
    } else if (itemTypeFilter === 'פגישות') {
      result = result.filter(a => a.appointment_type === 'פגישה');
    }
    // itemTypeFilter === 'הכל' shows all
    
    // 2. Filter by meeting type (only applies to meetings)
    if (meetingTypeFilter) {
      result = result.filter(a => {
        if (a.appointment_type !== 'פגישה') return true; // non-meetings pass through
        return a.meeting_type === meetingTypeFilter;
      });
    }
    
    // 3. Filter by user (matches attendees_users objects with id property)
    const normalizedFilter = String(userFilter ?? '').trim();
    if (normalizedFilter) {
      result = result.filter(a => {
        const attendees = a.attendees_users || [];
        return attendees.some(att => {
          if (att === null || att === undefined) return false;
          const attId = att && typeof att === 'object' ? att.id : att;
          const attIdNorm = String(attId ?? '').trim();
          return attIdNorm === normalizedFilter;
        });
      });
    }
    
    return result;
  }, [appointments, itemTypeFilter, meetingTypeFilter, userFilter]);

  const filteredEvents = filteredAppointments;

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

  // Remove duplicate createEventMutation - use createMutation instead
  // createEventMutation removed - use createMutation

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Appointment.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      
      // הצג הודעה רק אם זה לא drag & drop (drag & drop עם עדכון תאריך בלבד)
      const isDragDrop = variables.data && Object.keys(variables.data).length <= 2 && 
                         (variables.data.event_date || variables.data.start_datetime);
      
      if (!isDragDrop) {
        toast({
          title: '✅ עודכן בהצלחה',
          description: 'פרטי הפגישה נשמרו',
          duration: 2000,
        });
      } else {
        // drag & drop הצלחה ושקטה
        toast({
          title: '✅ הועברה',
          description: variables.data.event_date ? 'הפגישה הועברה לתאריך חדש' : 'הפגישה הועברה לשעה חדשה',
          duration: 2000,
        });
      }
      
      setShowForm(false);
      setSelectedAppointment(null);
    },
  });

  // Remove duplicate deleteEventMutation - use deleteMutation instead
  // deleteEventMutation removed - use deleteMutation

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
        await createMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };

  const handleDeleteEvent = async () => {
    if (selectedAppointment?.id) {
      await deleteMutation.mutateAsync(selectedAppointment.id);
    }
  };

  const handleSaveAppointment = async (data) => {
    if (selectedAppointment) {
      // Edit existing
      if (selectedAppointment.series_id) {
        setEditMode(null);
        setShowEditDialog(true);
        return null;
      } else {
        const result = await updateMutation.mutateAsync({ id: selectedAppointment.id, data });
        setShowForm(false);
        setSelectedAppointment(null);
        return result;
      }
    } else {
      // Create new
      if (data.is_recurring && data.recurrence_count && data.recurrence_pattern) {
        const seriesId = `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startDate = new Date(data.date);
        const interval = data.recurrence_interval || 1;

        const instances = [];
        for (let i = 0; i < data.recurrence_count; i++) {
          let nextDate = new Date(startDate);

          if (data.recurrence_pattern === 'שבועי') {
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
            series_occurrence: i + 1,
            parent_series_id: seriesId,
            source_type: i === 0 ? 'manual' : 'generated_occurrence',
          });
        }

        let lastResult = null;
        for (const instance of instances) {
          lastResult = await createMutation.mutateAsync(instance);
        }
        return lastResult;
      } else {
        const result = await createMutation.mutateAsync(data);
        return result;
      }
    }
  };

  const handleEditRecurring = async (mode) => {
    setEditMode(mode);
    setShowEditDialog(false);
    
    if (mode === 'this-only') {
      // Edit this occurrence only - mark as exception
      setSelectedAppointment({
        ...selectedAppointment,
        source_type: 'generated_occurrence',
      });
      setShowForm(true);
    } else if (mode === 'this-and-future') {
      // Create new series for this and future occurrences
      const newSeriesId = `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const futureAppointments = calendarEvents.filter(
        e => e.parent_series_id === selectedAppointment.parent_series_id && 
        new Date(e.event_date) >= new Date(selectedAppointment.event_date)
      );
      
      for (const event of futureAppointments) {
        await updateEventMutation.mutateAsync({
          id: event.id,
          data: { parent_series_id: newSeriesId },
        });
      }
      setSelectedAppointment(null);
    } else if (mode === 'entire-series') {
      // Edit all occurrences in series
      setShowForm(true);
    }
  };

  const handleDeleteAppointment = async () => {
    if (selectedAppointment && selectedAppointment.parent_series_id) {
      setShowDeleteDialog(true);
    } else if (selectedAppointment) {
      await deleteMutation.mutateAsync(selectedAppointment.id);
    }
  };

  const handleDeleteRecurring = async (mode) => {
    if (mode === 'this-only') {
      // מחק רק את המופע הספציפי
      await deleteMutation.mutateAsync(selectedAppointment.id);
    } else if (mode === 'this-and-future') {
      // מחק את האירוע הנוכחי וכל האירועים העתידיים באותה סדרה
      const seriesEvents = calendarEvents.filter(
        e => e.parent_series_id === selectedAppointment.parent_series_id
      );
      
      const selectedDate = new Date(selectedAppointment.event_date);
      const toDelete = seriesEvents.filter(
        e => new Date(e.event_date) >= selectedDate
      );
      
      for (const event of toDelete) {
        await deleteMutation.mutateAsync(event.id);
      }
    } else if (mode === 'entire-series') {
      // מחק את כל הסדרה
      const seriesEvents = calendarEvents.filter(
        e => e.parent_series_id === selectedAppointment.parent_series_id
      );
      
      for (const event of seriesEvents) {
        await deleteMutation.mutateAsync(event.id);
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
          itemTypeFilter={itemTypeFilter}
          meetingTypeFilter={meetingTypeFilter}
          userFilter={userFilter}
          onItemTypeChange={(type) => {
            setItemTypeFilter(type);
            saveFilters(type, meetingTypeFilter, userFilter);
          }}
          onMeetingTypeChange={(type) => {
            setMeetingTypeFilter(type);
            saveFilters(itemTypeFilter, type, userFilter);
          }}
          onUserChange={(user) => {
            setUserFilter(user);
            saveFilters(itemTypeFilter, meetingTypeFilter, user);
          }}
          onClearAll={() => {
            setItemTypeFilter('הכל');
            setMeetingTypeFilter('');
            setUserFilter('');
            saveFilters('הכל', '', '');
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
              draggedAppointment={draggedAppointment}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragDrop={handleDragDrop}
            />
          )}
          {viewMode === 'day' && (
            <DayView
              currentDate={currentMonth}
              appointments={filteredAppointments}
              onDateClick={handleDateClick}
              onAppointmentClick={handleAppointmentClick}
              draggedAppointment={draggedAppointment}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragDrop={handleDragDrop}
            />
          )}
        </div>
      </div>

      {/* Appointment Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto p-0"
          dir="rtl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
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
          isDeleting={deleteMutation.isPending || false}
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