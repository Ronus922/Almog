import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSaturday, isFriday, addMonths, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import AppointmentForm from '@/components/calendar/AppointmentForm';
import AppointmentModal from '@/components/calendar/AppointmentModal';
import CalendarGrid from '@/components/calendar/CalendarGrid';
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
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const queryClient = useQueryClient();

  // Fetch appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-date'),
  });

  // Create appointment mutation
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Appointment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowForm(false);
      setSelectedDate(null);
    },
  });

  // Update appointment mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Appointment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setSelectedAppointment(null);
    },
  });

  // Delete appointment mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Appointment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setSelectedAppointment(null);
    },
  });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setShowForm(true);
  };

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
  };

  const handleSaveAppointment = async (data) => {
    if (selectedAppointment) {
      await updateMutation.mutateAsync({ id: selectedAppointment.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleDeleteAppointment = async () => {
    if (selectedAppointment) {
      await deleteMutation.mutateAsync(selectedAppointment.id);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">יומן פגישות</h1>
            <p className="text-slate-600 mt-2">ניהול פגישות ומשימות בקלות</p>
          </div>
          <Button
            onClick={() => {
              setSelectedAppointment(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="w-5 h-5" />
            פגישה חדשה
          </Button>
        </div>

        {/* View Mode Selector */}
        <div className="flex gap-2 mb-6">
          {[
            { mode: 'day', label: 'יומי' },
            { mode: 'week', label: 'שבועי' },
            { mode: 'month', label: 'חודשי' },
          ].map((item) => (
            <Button
              key={item.mode}
              variant={viewMode === item.mode ? 'default' : 'outline'}
              onClick={() => setViewMode(item.mode)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-6 bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">
            {format(currentMonth, 'MMMM yyyy', { locale: he })}
          </h2>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <CalendarGrid
          currentMonth={currentMonth}
          appointments={appointments}
          onDateClick={handleDateClick}
          onAppointmentClick={handleAppointmentClick}
          isHoliday={isHoliday}
          getHolidayName={getHolidayName}
        />
      </div>

      {/* Appointment Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAppointment ? 'עריכת פגישה' : 'פגישה חדשה'}</DialogTitle>
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