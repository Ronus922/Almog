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
           <DialogTitle className="text-right text-2xl font-bold text-slate-900">פרטי הפגישה</DialogTitle>
           <DialogDescription className="hidden">פרטי הפגישה</DialogDescription>
         </DialogHeader>

         <div className="space-y-5 py-4" dir="rtl">
           {/* Title */}
           <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
             <div className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: appointment.event_color || '#3B82F6' }} />
             <h2 className="flex-1 text-xl font-bold text-slate-900">{appointment.title}</h2>
           </div>

           {/* Type */}
           {appointment.appointment_type && (
             <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
               <span className="text-xs font-semibold text-slate-700 bg-white px-2 py-1 rounded">סוג</span>
               <span className="text-sm text-slate-800 font-medium">{appointment.appointment_type}</span>
             </div>
           )}

           {/* Date and Time */}
           <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
             <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
             <div className="flex-1">
               <p className="text-sm font-semibold text-slate-800">
                 {format(new Date(appointment.date), 'd MMMM yyyy', { locale: he })}
               </p>
             </div>
           </div>

           <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
             <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
             <div className="flex-1">
               <p className="text-sm font-semibold text-slate-800">
                 {appointment.start_time} - {appointment.end_time}
               </p>
             </div>
           </div>

           {/* Location */}
           {appointment.location && (
             <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
               <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
               <div className="flex-1">
                 <p className="text-sm font-semibold text-slate-800">{appointment.location}</p>
               </div>
             </div>
           )}

           {/* Recurring */}
           {appointment.is_recurring && (
             <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
               <span className="text-xs font-bold text-white bg-blue-600 px-2 py-1 rounded">חוזר</span>
               <span className="text-sm text-blue-900 font-medium">
                 {appointment.recurrence_pattern === 'weekly'
                   ? 'כל שבוע'
                   : appointment.recurrence_pattern === 'monthly'
                   ? 'כל חודש'
                   : 'כל שנה'}
               </span>
             </div>
           )}

           {/* Reminder */}
           {appointment.reminder_method !== 'none' && (
             <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
               <span className="text-xs font-bold text-white bg-amber-600 px-2 py-1 rounded">תזכורת</span>
               <span className="text-sm text-amber-900 font-medium">
                 {appointment.reminder_before} לפני דרך {appointment.reminder_method}
               </span>
             </div>
           )}

          {/* Attendees */}
          {(appointment.attendees_users?.length > 0 || appointment.attendees_contacts?.length > 0) && (
            <div className="bg-gradient-to-l from-blue-50 to-blue-50 rounded-lg p-5 border border-blue-100">
              <div className="flex items-center justify-end gap-2 mb-4 pb-3 border-b border-blue-200">
                <span className="text-sm font-bold text-blue-900">מצטרפים</span>
                <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
              </div>
              <div className="space-y-2">
                {appointment.attendees_users?.length > 0 && (
                  <div className="space-y-2">
                    {appointment.attendees_users.map((userId) => (
                      <div key={userId} className="flex items-center justify-end gap-2 text-sm text-slate-800 bg-white rounded px-3 py-2 border border-blue-100">
                        <span className="font-medium">{userNames[userId] || 'משתמש'}</span>
                        <span className="text-blue-600 text-lg">👤</span>
                      </div>
                    ))}
                  </div>
                )}
                {appointment.attendees_contacts?.length > 0 && (
                  <div className="space-y-2">
                    {appointment.attendees_contacts.map((contactId) => (
                      <div key={contactId} className="flex items-center justify-end gap-2 text-sm text-slate-800 bg-white rounded px-3 py-2 border border-blue-100">
                        <span className="font-medium">{contactNames[contactId] || 'אנשי קשר'}</span>
                        <span className="text-amber-600 text-lg">🏠</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {appointment.description && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-200">
                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm font-bold text-blue-900">תיאור</span>
              </div>
              <p className="text-sm text-slate-800">{appointment.description}</p>
            </div>
          )}

          {/* Attachments */}
          {appointment.attachments?.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <span className="text-sm font-bold text-blue-900 block mb-3">קבצים מצורפים</span>
              <div className="space-y-2">
                {appointment.attachments.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-700 hover:text-blue-900 font-medium flex items-center gap-2 p-2 bg-white rounded hover:bg-blue-100 transition"
                  >
                    <span>📎</span>
                    <span>{url.split('/').pop()}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t border-slate-200">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            סגור
          </Button>
          <Button
            onClick={onEdit}
            variant="default"
            className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Edit className="w-4 h-4" />
            ערוך
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={isDeleting}
            className="flex-1 gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'מוחק...' : 'מחק'}
          </Button>
        </div>
        </DialogContent>
        </Dialog>
        );
        }