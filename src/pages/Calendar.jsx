import React, { useState, useMemo } from 'react';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSaturday, isFriday, addMonths, subMonths, addDays, subDays, addWeeks, subWeeks, getDay } from 'date-fns';
import { he } from 'date-fns/locale';
import AppointmentForm from '@/components/calendar/AppointmentForm';
import AppointmentModal from '@/components/calendar/AppointmentModal';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/calendar/DayView';
import RecurrenceDeleteDialog from '@/components/calendar/RecurrenceDeleteDialog';
import RecurrenceEditDialog from '@/components/calendar/RecurrenceEditDialog';
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
  const queryClient = useQueryClient();

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-date'),
  });

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

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  
  const handlePrevDay = () => setCurrentMonth(subDays(currentMonth, 1));
  const handleNextDay = () => setCurrentMonth(addDays(currentMonth, 1));
  
  const handlePrevWeek = () => setCurrentMonth(subWeeks(currentMonth, 1));
  const handleNextWeek = () => setCurrentMonth(addWeeks(currentMonth, 1));

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setShowForm(true);
  };

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
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
      await deleteMutation.mutateAsync(selectedAppointment.id);
    } else if (mode === 'all') {
      const seriesAppointments = appointments.filter(
        a => a.series_id === selectedAppointment.series_id
      );
      for (const apt of seriesAppointments) {
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
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Title and Navigation - Right */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">יומן פגישות</h1>
              <p className="text-sm text-slate-600">ניהול פגישות ומשימות בקלות</p>
            </div>

            {/* Add Button - Left */}
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
        </div>

        {/* Control Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Navigation Arrows - Right */}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNextMonth}
                className="h-9 w-9 text-slate-600 hover:text-slate-900"
                title="חודש הבא"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrevMonth}
                className="h-9 w-9 text-slate-600 hover:text-slate-900"
                title="חודש קודם"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </div>

            {/* Date Range - Center */}
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-900">{monthRangeStr}</p>
              <p className="text-xs text-slate-500">{format(currentMonth, 'MMMM yyyy', { locale: he })}</p>
            </div>

            {/* View Mode Selector - Left */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              {[
                { mode: 'day', label: 'יום' },
                { mode: 'week', label: 'שבוע' },
                { mode: 'month', label: 'חודש' },
              ].map((item) => (
                <Button
                  key={item.mode}
                  variant={viewMode === item.mode ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode(item.mode)}
                  className={`text-xs font-bold px-4 py-2 h-auto rounded-md transition-all ${
                    viewMode === item.mode 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar View Container */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'month' && (
            <CalendarGrid
              currentMonth={currentMonth}
              appointments={appointments}
              onDateClick={handleDateClick}
              onAppointmentClick={handleAppointmentClick}
              isHoliday={isHoliday}
              getHolidayName={getHolidayName}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              currentDate={currentMonth}
              appointments={appointments}
              onDateClick={handleDateClick}
              onAppointmentClick={handleAppointmentClick}
            />
          )}
          {viewMode === 'day' && (
            <DayView
              currentDate={currentMonth}
              appointments={appointments}
              onDateClick={handleDateClick}
              onAppointmentClick={handleAppointmentClick}
            />
          )}
        </div>
      </div>

      {/* Appointment Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="border-b border-slate-200 pb-4 mb-4">
            <DialogTitle className="text-2xl font-bold text-slate-900">
              {selectedAppointment ? 'עריכת פגישה' : 'פגישה חדשה'}
            </DialogTitle>
            <div className="hidden">פרטי הפגישה</div>
          </DialogHeader>
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
    </div>
  );
}