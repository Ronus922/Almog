import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MessageSquare, Paperclip, Activity, Bell, Pencil, Archive, RotateCcw, Repeat2, FileText, User, Users, Calendar, Tag, MessagesSquare } from "lucide-react";
import TaskChatSection from "@/components/chat/TaskChatSection";
import { fetchComments, createComment, updateComment, deleteComment,
         fetchAttachments, uploadAttachment, deleteAttachment,
         fetchActivity, fetchAttendees, fetchReminders } from "./taskProApi";
import { useAuth } from "@/components/auth/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_STYLE = {
  "פתוחה": "bg-blue-100 text-blue-700", "בטיפול": "bg-orange-100 text-orange-700",
  "הושלמה": "bg-green-100 text-green-700", "בוטלה": "bg-slate-100 text-slate-600",
  "ממתינה": "bg-purple-100 text-purple-700",
};
const PRIORITY_STYLE = {
  "גבוהה": "bg-red-100 text-red-700", "בינונית": "bg-yellow-100 text-yellow-700", "נמוכה": "bg-green-100 text-green-700",
};

const fmt = (dt) => { try { return dt ? format(new Date(dt), "dd/MM/yyyy HH:mm") : "—"; } catch { return "—"; } };
const fmtDate = (dt) => { try { return dt ? format(new Date(dt), "dd/MM/yyyy") : "—"; } catch { return "—"; } };

export default function TaskProDetailsDialog({ task, open, onClose, onEdit, onArchive, onUnarchive }) {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    if (!task?.id || !open) return;
    fetchComments(task.id).then(setComments);
    fetchAttachments(task.id).then(setAttachments);
    fetchActivity(task.id).then((a) => setActivity(a.sort((x, y) => new Date(y.created_date) - new Date(x.created_date))));
    fetchAttendees(task.id).then(setAttendees);
    fetchReminders(task.id).then(setReminders);
  }, [task?.id, open]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setLoadingComment(true);
    const c = await createComment(task.id, newComment, { username: currentUser?.username, name: currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name || ""}` : currentUser?.username });
    setComments((prev) => [...prev, c]);
    setNewComment("");
    setLoadingComment(false);
  };

  const handleUpdateComment = async (id) => {
    await updateComment(id, editingCommentText);
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, comment_text: editingCommentText, is_edited: true } : c));
    setEditingCommentId(null);
  };

  const handleDeleteComment = async (id) => {
    await deleteComment(id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    const att = await uploadAttachment(task.id, file, { username: currentUser?.username, name: currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name || ""}` : currentUser?.username });
    setAttachments((prev) => [...prev, att]);
    setUploadingFile(false);
  };

  const handleDeleteAttachment = async (id) => {
    await deleteAttachment(id);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const SOURCE_LABEL = { manual: "ידנית", template: "מתבנית", recurring: "מחזורית" };
  const SOURCE_ICON = { manual: null, template: <FileText className="w-3.5 h-3.5 text-violet-500" />, recurring: <Repeat2 className="w-3.5 h-3.5 text-blue-500" /> };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-0" dir="rtl">
        {/* Header */}
        <div className="bg-gradient-to-l from-blue-600 to-blue-700 p-6 text-white rounded-t-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[task.status]} bg-white/20 text-white`}>
                  {task.status}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white`}>
                  {task.priority}
                </span>
                {SOURCE_ICON[task.source] && (
                  <span className="flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full">
                    {SOURCE_ICON[task.source]}
                    {SOURCE_LABEL[task.source]}
                  </span>
                )}
                {task.is_archived && (
                  <span className="text-xs bg-slate-500/60 px-2 py-1 rounded-full">מאורכב</span>
                )}
              </div>
              <h2 className="text-xl font-bold">{task.title}</h2>
              <p className="text-blue-200 text-sm mt-1">{task.task_type}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={() => onEdit(task)}>
                <Pencil className="w-4 h-4" />
              </Button>
              {task.is_archived ? (
                <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={() => onUnarchive(task)}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={() => onArchive(task)}>
                  <Archive className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Meta grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" />משויך ראשי</p>
              <p className="text-sm font-medium text-slate-800">{task.assigned_to_name || task.assigned_to || "—"}</p>
              {task.assigned_by_name && <p className="text-xs text-slate-400 mt-0.5">הוקצה ע"י {task.assigned_by_name}</p>}
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" />תאריך יעד</p>
              <p className="text-sm font-medium text-slate-800">{fmtDate(task.due_at)}</p>
            </div>
            {task.apartment_number && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Tag className="w-3 h-3" />דירה</p>
                <p className="text-sm font-medium text-slate-800">דירה {task.apartment_number}</p>
                {task.owner_name && <p className="text-xs text-slate-400 mt-0.5">{task.owner_name}</p>}
              </div>
            )}
          </div>

          {/* Attendees */}
          {attendees.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1"><Users className="w-3.5 h-3.5" />משתתפים נוספים</p>
              <div className="flex flex-wrap gap-2">
                {attendees.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full border border-blue-200">
                    <User className="w-3 h-3" />
                    {a.user_name || a.user_username}
                  </span>
                ))}
              </div>
            </div>
          )}

          {task.description && (
            <div className="mb-6 bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">תיאור</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="comments">
            <TabsList className="w-full justify-start gap-1 bg-slate-100 p-1 rounded-xl h-auto flex-wrap">
              <TabsTrigger value="comments" className="gap-1.5 text-xs">
                <MessageSquare className="w-3.5 h-3.5" />הערות ({comments.length})
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-1.5 text-xs">
                <Paperclip className="w-3.5 h-3.5" />קבצים ({attachments.length})
              </TabsTrigger>
              <TabsTrigger value="reminders" className="gap-1.5 text-xs">
                <Bell className="w-3.5 h-3.5" />תזכורות ({reminders.filter(r => r.status === "pending").length})
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5 text-xs">
                <Activity className="w-3.5 h-3.5" />פעילות ({activity.length})
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-1.5 text-xs">
                <MessagesSquare className="w-3.5 h-3.5" />צ'אט משימה
              </TabsTrigger>
            </TabsList>

            {/* Comments */}
            <TabsContent value="comments" className="mt-4 space-y-3">
              {comments.length === 0 && <p className="text-center text-slate-400 text-sm py-6">אין הערות עדיין</p>}
              {comments.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">{c.created_by_name || c.created_by_username}</span>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {c.is_edited && <span>נערך</span>}
                      <span>{fmt(c.created_date)}</span>
                      {c.created_by_username === currentUser?.username && (
                        <>
                          <button onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.comment_text); }} className="hover:text-blue-600">ערוך</button>
                          <button onClick={() => handleDeleteComment(c.id)} className="hover:text-red-500">מחק</button>
                        </>
                      )}
                    </div>
                  </div>
                  {editingCommentId === c.id ? (
                    <div className="space-y-2">
                      <textarea
                        className="w-full rounded-lg border border-slate-200 p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                        rows={3}
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-blue-600 text-white h-8" onClick={() => handleUpdateComment(c.id)}>שמור</Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingCommentId(null)}>ביטול</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{c.comment_text}</p>
                  )}
                </div>
              ))}
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <textarea
                  className="w-full rounded-lg border border-slate-200 p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                  rows={3}
                  placeholder="הוסף הערה..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button
                  size="sm"
                  className="bg-blue-600 text-white h-9"
                  disabled={!newComment.trim() || loadingComment}
                  onClick={handleAddComment}
                >
                  {loadingComment ? "שולח..." : "הוסף הערה"}
                </Button>
              </div>
            </TabsContent>

            {/* Attachments */}
            <TabsContent value="attachments" className="mt-4 space-y-3">
              {attachments.length === 0 && <p className="text-center text-slate-400 text-sm py-6">אין קבצים מצורפים</p>}
              {attachments.map((a) => (
                <div key={a.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
                  <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a href={a.file_url} target="_blank" rel="noreferrer" className="flex-1 text-sm text-blue-600 hover:underline truncate">
                    {a.file_display_name || a.file_name}
                  </a>
                  <span className="text-xs text-slate-400">{a.uploaded_by_name}</span>
                  <button onClick={() => handleDeleteAttachment(a.id)} className="text-slate-300 hover:text-red-500 transition-colors text-xs">מחק</button>
                </div>
              ))}
              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  <Paperclip className="w-4 h-4" />
                  {uploadingFile ? "מעלה..." : "צרף קובץ"}
                  <input type="file" className="hidden" onChange={handleUpload} disabled={uploadingFile} />
                </label>
              </div>
            </TabsContent>

            {/* Reminders */}
            <TabsContent value="reminders" className="mt-4 space-y-3">
              {reminders.length === 0 && <p className="text-center text-slate-400 text-sm py-6">אין תזכורות</p>}
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
                  <Bell className={`w-4 h-4 flex-shrink-0 ${r.status === "sent" ? "text-green-500" : r.status === "canceled" ? "text-slate-300" : "text-orange-500"}`} />
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{fmt(r.remind_at)}</p>
                    <p className="text-xs text-slate-400">{r.user_username} · {r.channel === "in_app" ? "באפליקציה" : r.channel === "email" ? "אימייל" : "וואטסאפ"}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "sent" ? "bg-green-100 text-green-700" : r.status === "canceled" ? "bg-slate-100 text-slate-500" : "bg-orange-100 text-orange-700"}`}>
                    {r.status === "sent" ? "נשלח" : r.status === "canceled" ? "בוטל" : "ממתין"}
                  </span>
                </div>
              ))}
            </TabsContent>

            {/* Activity */}
            <TabsContent value="activity" className="mt-4 space-y-2">
              {activity.length === 0 && <p className="text-center text-slate-400 text-sm py-6">אין פעילות</p>}
              {activity.map((a) => (
                <div key={a.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">{a.actor_name || a.actor_username}</span>{" "}
                      {a.activity_type === "created" && "יצר את המשימה"}
                      {a.activity_type === "status_changed" && "שינה סטטוס"}
                      {a.activity_type === "priority_changed" && "שינה עדיפות"}
                      {a.activity_type === "commented" && "הוסיף הערה"}
                      {a.activity_type === "attachment_added" && "צירף קובץ"}
                      {a.activity_type === "archived" && "ארכב את המשימה"}
                      {a.activity_type === "unarchived" && "שחרר מארכיב"}
                      {a.activity_type === "assigned" && "שינה משויך"}
                      {a.activity_type === "attendee_added" && "הוסיף משתתף"}
                      {a.activity_type === "attendee_removed" && "הסיר משתתף"}
                      {a.activity_type === "completed" && "סימן כהושלמה"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmt(a.created_date)}</p>
                  </div>
                </div>
              ))}
            </TabsContent>
            {/* Task Chat */}
            <TabsContent value="chat" className="mt-4">
              <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200" style={{ height: '380px' }}>
                <TaskChatSection taskId={task.id} currentUser={currentUser} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}