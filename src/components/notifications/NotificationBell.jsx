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
    base44.entities.Notification.filter({ user_username: username }, "-created_date", 30)
      .then(setNotifications);

    // Real-time subscription
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_username === username) {
        setNotifications(prev => [event.data, ...prev].slice(0, 30));
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
    setNotifications(prev => prev.filter(n => n.is_read));
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

  const typeIcon = (type) => type === 'task_due_soon' ? '⏰' : '📋';

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
        <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden" dir="rtl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <span className="font-semibold text-slate-700 text-sm">התראות</span>
            {unread.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:underline"
              >
                סמן הכל כנקרא
              </button>
            )}
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
                    if (n.task_id) {
                      setOpen(false);
                      navigate('/Tasks');
                    }
                  }}
                  className={`px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-blue-50/60' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5">{typeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                        {n.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(n.created_date)}</p>
                    </div>
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