import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar, Clock, MapPin, Users, FileText, Trash2, Edit } from 'lucide-react';

export default function AppointmentModal({ appointment, onClose, onEdit, onDelete, isDeleting }) {
  if (!appointment) return null;

  return (
    <Dialog open={!!appointment} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-end gap-2 text-right">
            {appointment.title}
            <div
              className="w-4 h-4 rounded flex-shrink-0"
              style={{ backgroundColor: appointment.event_color || '#3B82F6' }}
            />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 text-right">
          {/* Type */}
          {appointment.appointment_type && (
            <div className="flex items-center justify-end gap-3">
              <span className="text-sm">{appointment.appointment_type}</span>
              <span className="text-sm font-semibold text-slate-600">סוג:</span>
            </div>
          )}

          {/* Date and Time */}
          <div className="flex items-center justify-end gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-600">
                {format(new Date(appointment.date), 'd MMMM yyyy', { locale: he })}
              </p>
            </div>
            <Calendar className="w-5 h-5 text-slate-500 flex-shrink-0" />
          </div>

          <div className="flex items-center justify-end gap-3">
            <p className="text-sm">
              {appointment.start_time} - {appointment.end_time}
            </p>
            <Clock className="w-5 h-5 text-slate-500 flex-shrink-0" />
          </div>

          {/* Location */}
          {appointment.location && (
            <div className="flex items-center justify-end gap-3">
              <p className="text-sm">{appointment.location}</p>
              <MapPin className="w-5 h-5 text-slate-500 flex-shrink-0" />
            </div>
          )}

          {/* Recurring */}
          {appointment.is_recurring && (
            <div className="flex items-center justify-end gap-3">
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {appointment.recurrence_pattern === 'weekly'
                  ? 'שבועי'
                  : appointment.recurrence_pattern === 'monthly'
                  ? 'חודשי'
                  : 'שנתי'}
              </span>
              <span className="text-sm font-semibold text-slate-600">חזרה:</span>
            </div>
          )}

          {/* Reminder */}
          {appointment.reminder_method !== 'none' && (
            <div className="flex items-center justify-end gap-3">
              <span className="text-sm">
                ב-{appointment.reminder_method} {appointment.reminder_before} לפני
              </span>
              <span className="text-sm font-semibold text-slate-600">תזכורת:</span>
            </div>
          )}

          {/* Attendees */}
          {(appointment.attendees_users?.length > 0 || appointment.attendees_contacts?.length > 0) && (
            <div>
              <div className="flex items-center justify-end gap-3 mb-2">
                <span className="text-sm font-semibold text-slate-600">מצטרפים:</span>
                <Users className="w-5 h-5 text-slate-500 flex-shrink-0" />
              </div>
              <div className="text-sm space-y-1 text-right">
                {appointment.attendees_users?.map((user) => (
                  <p key={user} className="text-slate-700">👤 {user}</p>
                ))}
                {appointment.attendees_contacts?.map((contact) => (
                  <p key={contact} className="text-slate-700">🏠 דיר #{contact}</p>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {appointment.description && (
            <div>
              <div className="flex items-center justify-end gap-3 mb-2">
                <span className="text-sm font-semibold text-slate-600">תיאור:</span>
                <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
              </div>
              <p className="text-sm text-slate-700 text-right">{appointment.description}</p>
            </div>
          )}

          {/* Attachments */}
          {appointment.attachments?.length > 0 && (
            <div>
              <span className="text-sm font-semibold text-slate-600 block mb-2">קבצים:</span>
              <div className="space-y-1">
                {appointment.attachments.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline block"
                  >
                    📎 {url.split('/').pop()}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={onClose}
          >
            סגור
          </Button>
          <Button
            variant="outline"
            onClick={onEdit}
            className="gap-2"
          >
            <Edit className="w-4 h-4" />
            ערוך
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'מוחק...' : 'מחק'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}