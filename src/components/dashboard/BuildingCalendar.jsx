import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, ChevronRight, ChevronLeft, Plus, X, Edit2, Trash2, MapPin, Clock, FileText, Tag } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';

const EVENT_TYPES = [
  { value: 'elevator_check', label: 'בדיקת מעלית', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'residents_meeting', label: 'אסיפת דיירים', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'special_garbage', label: 'יום איסוף אשפה מיוחד', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'maintenance', label: 'תחזוקה', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'cleaning', label: 'ניקיון', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: 'inspection', label: 'ביקורת', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'other', label: 'אחר', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const getEventTypeInfo = (typeValue) =>
  EVENT_TYPES.find((t) => t.value === typeValue) || EVENT_TYPES[EVENT_TYPES.length - 1];

const EMPTY_FORM = {
  title: '',
  event_type: 'other',
  event_date: '',
  start_time: '',
  end_time: '',
  location: '',
  description: '',
};

export default function BuildingCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const queryClient = useQueryClient();

  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['buildingCalendarEvents'],
    queryFn: () => base44.entities.CalendarEvent.list(),
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildingCalendarEvents'] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalendarEvent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildingCalendarEvents'] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildingCalendarEvents'] });
      setViewingEvent(null);
    },
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingEvent(null);
    setForm(EMPTY_FORM);
  };

  const openNew = (date = null) => {
    setForm({ ...EMPTY_FORM, event_date: date ? format(date, 'yyyy-MM-dd') : '' });
    setEditingEvent(null);
    setShowForm(true);
  };

  const openEdit = (event) => {
    setForm({
      title: event.title || '',
      event_type: event.meeting_type || 'other',
      event_date: event.event_date || '',
      start_time: event.start_datetime ? event.start_datetime.slice(11, 16) : '',
      end_time: event.end_datetime ? event.end_datetime.slice(11, 16) : '',
      location: event.location || '',
      description: event.description || '',
    });
    setEditingEvent(event);
    setViewingEvent(null);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.event_date) return;
    const payload = {
      title: form.title.trim(),
      meeting_type: form.event_type,
      event_date: form.event_date,
      start_datetime: form.start_time ? `${form.event_date}T${form.start_time}:00` : null,
      end_datetime: form.end_time ? `${form.event_date}T${form.end_time}:00` : null,
      location: form.location.trim() || null,
      description: form.description.trim() || null,
      item_kind: 'event',
    };
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = [];
  let day = gridStart;
  while (day <= gridEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getEventsForDay = (date) =>
    calendarEvents.filter((e) => e.event_date === format(date, 'yyyy-MM-dd'));

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const dayNames = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

  return (
    <>
      <Card className="bg-white border-slate-200 rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button onClick={() => openNew()} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-1.5 h-9">
              <Plus className="w-4 h-4" />
              הוסף אירוע
            </Button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
              <CardTitle className="text-lg font-bold text-slate-900 min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: he })}
              </CardTitle>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-end max-w-[220px]">
              {EVENT_TYPES.slice(0, 4).map((t) => (
                <span key={t.value} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${t.color}`}>
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* שמות ימים */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {dayNames.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500">
                {d}
              </div>
            ))}
          </div>

          {/* ימי הלוח */}
          <div className="grid grid-cols-7">
            {days.map((date, idx) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const dayEvents = getEventsForDay(date);
              const isToday = dateStr === todayStr;
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isSelected = selectedDay && isSameDay(date, selectedDay);

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDay(isSameDay(date, selectedDay) ? null : date)}
                  className={`min-h-[80px] p-1.5 border-b border-l border-slate-100 cursor-pointer transition-colors relative
                    ${isCurrentMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/50'}
                    ${isSelected ? 'ring-2 ring-inset ring-blue-400' : ''}
                  `}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1 mx-auto
                    ${isToday ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-slate-700' : 'text-slate-300'}
                  `}>
                    {format(date, 'd')}
                  </div>

                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const typeInfo = getEventTypeInfo(ev.meeting_type);
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); setViewingEvent(ev); }}
                          className={`text-xs px-1.5 py-0.5 rounded truncate border font-medium cursor-pointer hover:opacity-80 transition-opacity ${typeInfo.color}`}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-slate-400 px-1">+{dayEvents.length - 2} נוספים</div>
                    )}
                  </div>

                  {/* כפתור הוסף מהיר */}
                  {isSelected && isCurrentMonth && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openNew(date); }}
                      className="absolute bottom-1 left-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                      title="הוסף אירוע"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* דיאלוג פרטי אירוע */}
      <Dialog open={!!viewingEvent} onOpenChange={() => setViewingEvent(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          {viewingEvent && (() => {
            const typeInfo = getEventTypeInfo(viewingEvent.meeting_type);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-right">
                    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    <span className="text-slate-900">{viewingEvent.title}</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>
                      {viewingEvent.event_date
                        ? format(new Date(viewingEvent.event_date), 'EEEE, d בMMMM yyyy', { locale: he })
                        : '—'}
                    </span>
                  </div>
                  {(viewingEvent.start_datetime || viewingEvent.end_datetime) && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>
                        {viewingEvent.start_datetime?.slice(11, 16)}
                        {viewingEvent.end_datetime && ` — ${viewingEvent.end_datetime.slice(11, 16)}`}
                      </span>
                    </div>
                  )}
                  {viewingEvent.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>{viewingEvent.location}</span>
                    </div>
                  )}
                  {viewingEvent.description && (
                    <div className="flex items-start gap-2 text-sm text-slate-700">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{viewingEvent.description}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between pt-4 border-t border-slate-100 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => deleteMutation.mutate(viewingEvent.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 ml-1" />
                    מחק
                  </Button>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => openEdit(viewingEvent)}
                  >
                    <Edit2 className="w-4 h-4 ml-1" />
                    ערוך
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* דיאלוג הוספה/עריכה */}
      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-slate-900">
              {editingEvent ? 'עריכת אירוע' : 'הוספת אירוע חדש'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">כותרת האירוע *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="לדוגמה: בדיקת מעלית חצי שנתית"
                className="h-9 rounded-lg border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">סוג אירוע</label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                  <SelectTrigger className="h-9 rounded-lg border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">תאריך *</label>
                <Input
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                  className="h-9 rounded-lg border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">שעת התחלה</label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="h-9 rounded-lg border-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">שעת סיום</label>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="h-9 rounded-lg border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">מיקום</label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="לדוגמה: לובי הבניין"
                className="h-9 rounded-lg border-slate-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">תיאור / פרטים נוספים</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="פרטים נוספים על האירוע..."
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-between pt-2 border-t border-slate-100 mt-1">
            <Button variant="outline" onClick={closeForm} className="h-9 rounded-lg">
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.title.trim() || !form.event_date || createMutation.isPending || updateMutation.isPending}
              className="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-6"
            >
              {createMutation.isPending || updateMutation.isPending ? 'שומר...' : editingEvent ? 'שמור שינויים' : 'הוסף אירוע'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}