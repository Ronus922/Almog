import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, X } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function NotificationBell({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const username = currentUser?.username;
  const navigate = useNavigate();

  useEffect(() => {
    if (!username) return;

    // Initial load
    base44.entities.Notification.list("-created_date", 50)
      .then(allNotifs => {
        console.log('All notifications loaded:', allNotifs);
        const userNotifs = allNotifs.filter(n => {
          console.log(`Checking notification:`, n.user_username, 'vs', username);
          return n.user_username === username;
        });
        console.log('Filtered notifications for user:', userNotifs);
        setNotifications(userNotifs);
      })
      .catch(err => console.error('Failed to load notifications:', err));

    // Real-time subscription
    const unsub = base44.entities.Notification.subscribe((event) => {
      console.log('Notification event:', event);
      if (event.type === 'create') {
        console.log('Create event data:', event.data);
        if (event.data?.user_username === username) {
          console.log('Adding notification for current user');
          setNotifications(prev => [event.data, ...prev].slice(0, 30));
        }
      } else if (event.type === 'update') {
        setNotifications(prev => prev.map(n => n.id === event.id ? event.data : n));
      } else if (event.type === 'delete') {
        setNotifications(prev => prev.filter(n => n.id !== event.id));
      }
    });

    return unsub;
  }, [username]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifications.filter(n => !n.is_read);

  const markAllRead = async () => {
    const unreadList = notifications.filter(n => !n.is_read);
    for (const n of unreadList) {
      await base44.entities.Notification.update(n.id, { is_read: true });
    }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markRead = async (notif) => {
    if (notif.is_read) return;
    await base44.entities.Notification.update(notif.id, { is_read: true });
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
  };

  const deleteNotification = async (notifId, e) => {
    e.stopPropagation();
    await base44.entities.Notification.delete(notifId);
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  };

  const clearAllNotifications = async () => {
    for (const n of notifications) {
      await base44.entities.Notification.delete(n.id);
    }
    setNotifications([]);
  };

  const handleOpen = () => {
    setOpen(o => !o);
  };

  const typeIcon = (type) => {
    if (['task_due_soon', 'task_pro_due_soon', 'task_due_today', 'task_pro_due_today'].includes(type)) return '⚠️';
    if (['task_due_tomorrow', 'task_pro_due_tomorrow'].includes(type)) return '📅';
    if (type === 'task_pro_completed') return '✅';
    if (['appointment_assigned', 'appointment_updated'].includes(type)) return '🗓️';
    if (['appointment_due_today', 'appointment_due_tomorrow'].includes(type)) return '📅';
    return '📋';
  };

  const formatDate = (dt) => {
    if (!dt) return '';
    try { return format(new Date(dt), 'dd/MM HH:mm'); } catch { return ''; }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-white hover:bg-white/15 transition-colors"
        title="התראות"
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
         <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden" dir="rtl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
             <span className="font-semibold text-slate-700 text-sm">התראות</span>
             <div className="flex gap-2">
               {unread.length > 0 && (
                 <button
                   onClick={markAllRead}
                   className="text-xs text-blue-600 hover:underline"
                 >
                   סמן הכל כנקרא
                 </button>
               )}
               {notifications.length > 0 && (
                 <button
                   onClick={clearAllNotifications}
                   className="text-xs text-red-600 hover:underline"
                 >
                   נקה הכל
                 </button>
               )}
             </div>
           </div>

           <div className="w-full px-4 py-2.5 text-center text-xs font-medium text-blue-600 hover:bg-blue-50 border-t border-slate-100 transition-colors">
             <button
               onClick={() => {
                 setOpen(false);
                 navigate('/AllNotifications');
               }}
               className="w-full"
             >
               צפה בכל ההתראות
             </button>
           </div>

          <div className="max-h-96 overflow-y-auto">
            {unread.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                אין התראות
              </div>
            ) : (
              unread.map(n => (
                <div
                  key={n.id}
                  onClick={async () => {
                    await markRead(n);
                    if (n.task_pro_id) {
                      setOpen(false);
                      navigate('/TasksPro');
                    } else if (n.task_id) {
                      setOpen(false);
                      navigate('/Tasks');
                    }
                  }}
                  className={`px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors group ${!n.is_read ? 'bg-blue-50/60' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5">{typeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                        {n.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(n.created_date)}</p>
                    </div>
                    <button
                      onClick={(e) => deleteNotification(n.id, e)}
                      className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                      title="מחק הודעה"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {!n.is_read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}