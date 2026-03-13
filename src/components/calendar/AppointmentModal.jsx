import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar, Clock, MapPin, Users, FileText, Trash2, Edit } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AppointmentModal({ appointment, onClose, onEdit, onDelete, isDeleting }) {
  const [userNames, setUserNames] = useState({});
  const [contactNames, setContactNames] = useState({});

  useEffect(() => {
    if (!appointment) return;

    const loadAttendeeNames = async () => {
      try {
        if (appointment.attendees_users?.length > 0) {
          const users = await base44.entities.AppUser.list();
          const names = {};
          appointment.attendees_users.forEach(userId => {
            const user = users.find(u => u.id === userId);
            names[userId] = user?.first_name && user?.last_name 
              ? `${user.first_name} ${user.last_name}` 
              : user?.username || userId;
          });
          setUserNames(names);
        }

        if (appointment.attendees_contacts?.length > 0) {
          const contacts = await base44.entities.Contact.list();
          const names = {};
          appointment.attendees_contacts.forEach(contactId => {
            const contact = contacts.find(c => c.id === contactId);
            names[contactId] = contact 
              ? `דירה ${contact.apartment_number} - ${contact.owner_name || contact.tenant_name}`
              : `דירה ${contactId}`;
          });
          setContactNames(names);
        }
      } catch (error) {
        console.error('Failed to load attendee names:', error);
      }
    };

    loadAttendeeNames();
  }, [appointment]);

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
           <DialogDescription className="hidden">פרטי הפגישה</DialogDescription>
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
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-end gap-3 mb-3">
                <span className="text-sm font-semibold text-slate-700">מצטרפים</span>
                <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
              </div>
              <div className="space-y-2">
                {appointment.attendees_users?.length > 0 && (
                  <div className="space-y-1">
                    {appointment.attendees_users.map((userId) => (
                      <p key={userId} className="text-sm text-slate-700 flex items-center justify-end gap-2">
                        <span>{userNames[userId] || 'משתמש'}</span>
                        <span className="text-blue-600">👤</span>
                      </p>
                    ))}
                  </div>
                )}
                {appointment.attendees_contacts?.length > 0 && (
                  <div className="space-y-1">
                    {appointment.attendees_contacts.map((contactId) => (
                      <p key={contactId} className="text-sm text-slate-700 flex items-center justify-end gap-2">
                        <span>{contactNames[contactId] || 'אנשי קשר'}</span>
                        <span className="text-amber-600">🏠</span>
                      </p>
                    ))}
                  </div>
                )}
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
            variant="destructive"
            onClick={onDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'מוחק...' : 'מחק'}
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
            variant="outline"
            onClick={onClose}
          >
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}