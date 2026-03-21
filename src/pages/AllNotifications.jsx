import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";
import { Bell, Trash2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AllNotifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser?.username) {
      setLoading(false);
      return;
    }

    const loadNotifications = async () => {
      try {
        setError(null);
        const data = await base44.entities.Notification.filter({ user_username: currentUser.username }, "-created_date", 500);
        setNotifications(data || []);
      } catch (err) {
        console.error('Error loading notifications:', err);
        setError('שגיאה בטעינת ההתראות');
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();

    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_username === currentUser.username) {
        setNotifications(prev => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setNotifications(prev => prev.map(n => n.id === event.id ? event.data : n));
      } else if (event.type === 'delete') {
        setNotifications(prev => prev.filter(n => n.id !== event.id));
      }
    });

    return () => unsub?.();
  }, [currentUser?.username]);

  const markAllRead = async () => {
    const unreadList = notifications.filter(n => !n.is_read);
    for (const n of unreadList) {
      await base44.entities.Notification.update(n.id, { is_read: true });
    }
  };

  const deleteNotification = async (notifId) => {
    await base44.entities.Notification.delete(notifId);
  };

  const clearAllNotifications = async () => {
    for (const n of notifications) {
      await base44.entities.Notification.delete(n.id);
    }
  };

  const unread = notifications.filter(n => !n.is_read);

  const typeIcon = (type) => {
    if (type === 'task_due_soon' || type === 'task_pro_due_soon') return '⏰';
    if (type === 'task_pro_completed') return '✅';
    return '📋';
  };

  const formatDate = (dt) => {
    if (!dt) return '';
    try { return format(new Date(dt), 'dd/MM/yyyy HH:mm'); } catch { return ''; }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
              <p className="text-slate-500">טוען התראות...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-2">כל ההתראות</h1>
              <p className="text-slate-600">
                {notifications.length} התראות
                {unread.length > 0 && ` • ${unread.length} לא קרואות`}
              </p>
            </div>
            <div className="flex gap-2">
              {unread.length > 0 && (
                <Button
                  onClick={markAllRead}
                  variant="outline"
                  className="gap-2"
                >
                  <CheckCheck className="w-4 h-4" />
                  סמן הכל כנקרא
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  onClick={clearAllNotifications}
                  variant="destructive"
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  נקה הכל
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications Table */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
            <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg font-medium">אין התראות</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <th className="px-6 py-4 font-bold text-slate-700 text-center w-16">סוג</th>
                    <th className="px-6 py-4 font-bold text-slate-700">הודעה</th>
                    <th className="px-6 py-4 font-bold text-slate-700 w-40">תאריך</th>
                    <th className="px-6 py-4 font-bold text-slate-700 w-32">סטטוס</th>
                    <th className="px-6 py-4 font-bold text-slate-700 w-20 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notifications.map((n, idx) => (
                    <tr 
                      key={n.id} 
                      className={`transition-all duration-200 ${!n.is_read ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-6 py-4 text-center">
                        <span className="text-2xl">{typeIcon(n.type)}</span>
                      </td>
                      <td className={`px-6 py-4 ${!n.is_read ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>
                        <div className="line-clamp-2">{n.message}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">
                        {formatDate(n.created_date)}
                      </td>
                      <td className="px-6 py-4">
                        {!n.is_read ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            לא קרואה
                          </span>
                        ) : (
                          <span className="inline-flex px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                            קרואה
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => deleteNotification(n.id)}
                          className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="מחק הודעה"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}