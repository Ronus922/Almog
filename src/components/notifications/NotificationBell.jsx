import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, X, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const TABS = [
  { key: 'all', label: 'הכל' },
  { key: 'unread', label: 'לא נקראו' },
  { key: 'tasks', label: 'משימות' },
  { key: 'issues', label: 'תקלות' },
  { key: 'calendar', label: 'יומן' },
  { key: 'internal_chat', label: "צ'אט פנימי" },
  { key: 'whatsapp', label: 'וואטצאפ' },
];

const MODULE_MAP = {
  tasks: ['task_assigned', 'task_reassigned', 'task_pro_assigned', 'task_pro_completed',
    'task_due_today', 'task_due_tomorrow', 'task_due_overdue',
    'task_pro_due_today', 'task_pro_due_tomorrow', 'task_pro_due_overdue'],
  issues: ['issue_created', 'issue_assigned', 'issue_status_changed', 'issue_resolved', 'issue_urgent_created'],
  calendar: ['appointment_due_today', 'appointment_due_tomorrow', 'appointment_assigned', 'appointment_updated'],
  internal_chat: ['internal_chat_message_received', 'internal_chat_mention'],
  whatsapp: ['whatsapp_message_received', 'whatsapp_message_received_unlinked'],
};

const NAV_MAP = {
  tasks: '/TasksPro',
  issues: '/IssuesManagement',
  calendar: '/Calendar',
  internal_chat: '/InternalChat',
  whatsapp: '/WhatsAppChat',
};

function getNavUrl(n) {
  if (n.action_url) return n.action_url;
  if (n.source_module && NAV_MAP[n.source_module]) return NAV_MAP[n.source_module];
  if (n.task_pro_id) return '/TasksPro';
  if (n.task_id) return '/Tasks';
  return null;
}

function typeIcon(type) {
  if (type?.includes('due_today') || type?.includes('overdue')) return '⚠️';
  if (type?.includes('due_tomorrow')) return '📅';
  if (type?.includes('completed')) return '✅';
  if (type?.includes('appointment')) return '🗓️';
  if (type?.includes('whatsapp')) return '💬';
  if (type?.includes('internal_chat')) return '🔔';
  if (type?.includes('issue')) return '🔧';
  return '📋';
}

function formatDate(dt) {
  if (!dt) return '';
  try { return format(new Date(dt), 'dd/MM HH:mm'); } catch { return ''; }
}

export default function NotificationBell({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const ref = useRef(null);
  const navigate = useNavigate();
  const username = currentUser?.username;

  useEffect(() => {
    if (!username) return;

    base44.entities.Notification.filter({ user_username: username }, '-created_date', 50)
      .then(setNotifications)
      .catch(err => console.error('Failed to load notifications:', err));

    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create') {
        if (event.data?.user_username === username) {
          setNotifications(prev => [event.data, ...prev].slice(0, 50));
        }
      } else if (event.type === 'update') {
        setNotifications(prev => prev.map(n => n.id === event.id ? { ...n, ...event.data } : n));
      } else if (event.type === 'delete') {
        setNotifications(prev => prev.filter(n => n.id !== event.id));
      }
    });

    return unsub;
  }, [username]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filteredNotifs = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.is_read;
    const types = MODULE_MAP[activeTab] || [];
    return types.includes(n.type) || n.source_module === activeTab;
  });

  const markRead = async (notif) => {
    if (notif.is_read) return;
    await base44.entities.Notification.update(notif.id, { is_read: true });
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    const unreadList = notifications.filter(n => !n.is_read);
    await Promise.all(unreadList.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotif = async (id, e) => {
    e.stopPropagation();
    await base44.entities.Notification.delete(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = async () => {
    await Promise.all(notifications.map(n => base44.entities.Notification.delete(n.id)));
    setNotifications([]);
  };

  const handleNotifClick = async (n) => {
    await markRead(n);
    const url = getNavUrl(n);
    if (url) {
      setOpen(false);
      navigate(url);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-white hover:bg-white/15 transition-colors"
        title="התראות"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden" dir="rtl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <span className="font-bold text-slate-800 text-sm">התראות</span>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" />
                  סמן הכל כנקרא
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-xs text-red-500 hover:underline">נקה הכל</button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-slate-100 bg-white scrollbar-hide">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap border-b-2 ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {tab.key === 'unread' && unreadCount > 0 && (
                  <span className="mr-1 bg-red-100 text-red-600 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredNotifs.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                אין התראות
              </div>
            ) : (
              filteredNotifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors group ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5 flex-shrink-0">{typeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      {n.title && (
                        <p className={`text-xs font-bold mb-0.5 ${!n.is_read ? 'text-blue-700' : 'text-slate-500'}`}>
                          {n.title}
                        </p>
                      )}
                      <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                        {n.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(n.created_date)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!n.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                      )}
                      <button
                        onClick={(e) => deleteNotif(n.id, e)}
                        className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="מחק"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100">
            <button
              onClick={() => { setOpen(false); navigate('/AllNotifications'); }}
              className="w-full py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              צפה בכל ההתראות
            </button>
          </div>
        </div>
      )}
    </div>
  );
}