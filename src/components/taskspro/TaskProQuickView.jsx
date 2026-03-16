import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MessageSquare, Paperclip, ChevronDown, Pencil, Archive, RotateCcw, CheckCircle2, Plus } from "lucide-react";
import { fetchComments, createComment, fetchAttachments, uploadAttachment, deleteAttachment, deleteComment } from "./taskProApi";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "sonner";

const STATUS_STYLE = {
  "פתוחה": "bg-blue-100 text-blue-700",
  "בטיפול": "bg-orange-100 text-orange-700",
  "הושלמה": "bg-green-100 text-green-700",
  "בוטלה": "bg-slate-100 text-slate-600",
  "ממתינה": "bg-purple-100 text-purple-700",
};

const PRIORITY_STYLE = {
  "גבוהה": "bg-red-100 text-red-700",
  "בינונית": "bg-yellow-100 text-yellow-700",
  "נמוכה": "bg-green-100 text-green-700",
};

const fmtDate = (dt) => {
  try {
    return dt ? format(new Date(dt), "dd/MM/yyyy") : "—";
  } catch {
    return "—";
  }
};

const fmt = (dt) => {
  try {
    return dt ? format(new Date(dt), "dd/MM/yyyy HH:mm") : "—";
  } catch {
    return "—";
  }
};

export default function TaskProQuickView({ task, open, onClose, onEdit, onArchive, onUnarchive, onComplete }) {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [expandedMore, setExpandedMore] = useState(false);

  useEffect(() => {
    if (!task?.id || !open) return;
    fetchComments(task.id).then(setComments);
    fetchAttachments(task.id).then(setAttachments);
  }, [task?.id, open]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setLoadingComment(true);
    try {
      const c = await createComment(task.id, newComment, {
        username: currentUser?.username,
        name: currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name || ""}` : currentUser?.username,
      });
      setComments((prev) => [...prev, c]);
      setNewComment("");
    } catch (e) {
      toast.error("שגיאה בהוספת הערה");
    } finally {
      setLoadingComment(false);
    }
  };

  const handleDeleteComment = async (id) => {
    try {
      await deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      toast.error("שגיאה במחיקת הערה");
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const att = await uploadAttachment(task.id, file, {
        username: currentUser?.username,
        name: currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name || ""}` : currentUser?.username,
      });
      setAttachments((prev) => [...prev, att]);
      toast.success("קובץ צורף בהצלחה");
    } catch (e) {
      toast.error("שגיאה בצירוף קובץ");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (id) => {
    try {
      await deleteAttachment(id);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      toast.success("קובץ נמחק");
    } catch (e) {
      toast.error("שגיאה במחיקת קובץ");
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" dir="rtl">
        {/* Compact Header */}
        <div className="bg-slate-100 p-4 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={`text-xs ${STATUS_STYLE[task.status]}`}>{task.status}</Badge>
                <Badge className={`text-xs ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</Badge>
              </div>
              <h2 className="text-lg font-bold text-slate-900 break-words">{task.title}</h2>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onEdit(task)}
                title="ערוך"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => {
                  if (task.status !== "הושלמה") {
                    onComplete?.(task);
                  }
                }}
                disabled={task.status === "הושלמה"}
                title="סמן כהושלמה"
              >
                <CheckCircle2 className="w-4 h-4" />
              </Button>
              {task.is_archived ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => onUnarchive(task)}
                  title="שחרר מארכיב"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => onArchive(task)}
                  title="ארכב"
                >
                  <Archive className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Key Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            {task.assigned_to_name && (
              <div>
                <p className="text-xs text-slate-500 font-semibold">אחראי</p>
                <p className="text-sm font-medium text-slate-900">{task.assigned_to_name}</p>
              </div>
            )}
            {task.due_at && (
              <div>
                <p className="text-xs text-slate-500 font-semibold">תאריך יעד</p>
                <p className="text-sm font-medium text-slate-900">{fmtDate(task.due_at)}</p>
              </div>
            )}
            {task.apartment_number && (
              <div>
                <p className="text-xs text-slate-500 font-semibold">דירה</p>
                <p className="text-sm font-medium text-slate-900">דירה {task.apartment_number}</p>
              </div>
            )}
            {task.owner_name && (
              <div>
                <p className="text-xs text-slate-500 font-semibold">בעלים</p>
                <p className="text-sm font-medium text-slate-900">{task.owner_name}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-600 font-semibold mb-1">תיאור</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Comments Section */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900 flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              הערות ({comments.length})
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400">אין הערות עדיין</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700">{c.created_by_name || c.created_by_username}</span>
                      <span className="text-xs text-slate-400">{fmt(c.created_date)}</span>
                    </div>
                    <p className="text-sm text-slate-700">{c.comment_text}</p>
                    {c.created_by_username === currentUser?.username && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-xs text-red-500 hover:text-red-700 mt-1"
                      >
                        מחק
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Comment */}
            <div className="space-y-2">
              <textarea
                className="w-full rounded-lg border border-slate-300 p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                rows={2}
                placeholder="הוסף הערה..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                dir="rtl"
              />
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white h-8 w-full"
                disabled={!newComment.trim() || loadingComment}
                onClick={handleAddComment}
              >
                {loadingComment ? "שולח..." : "הוסף הערה"}
              </Button>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900 flex items-center gap-1">
              <Paperclip className="w-4 h-4" />
              קבצים ({attachments.length})
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {attachments.length === 0 ? (
                <p className="text-xs text-slate-400">אין קבצים</p>
              ) : (
                attachments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                    <a
                      href={a.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 text-xs text-blue-600 hover:underline truncate"
                    >
                      {a.file_display_name || a.file_name}
                    </a>
                    <button
                      onClick={() => handleDeleteAttachment(a.id)}
                      className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Upload File */}
            <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              <Plus className="w-3 h-3" />
              {uploadingFile ? "מעלה..." : "צרף קובץ"}
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploadingFile} />
            </label>
          </div>

          {/* More Details - Collapsible */}
          <div className="border-t border-slate-200 pt-3">
            <button
              onClick={() => setExpandedMore(!expandedMore)}
              className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${expandedMore ? "rotate-180" : ""}`} />
              פרטים נוספים
            </button>
            {expandedMore && (
              <div className="mt-3 space-y-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
                {task.task_type && (
                  <div>
                    <span className="font-semibold">סוג משימה:</span> {task.task_type}
                  </div>
                )}
                {task.source && (
                  <div>
                    <span className="font-semibold">מקור:</span> {task.source === "manual" ? "ידנית" : task.source === "template" ? "מתבנית" : "מחזורית"}
                  </div>
                )}
                {task.is_archived && (
                  <div className="text-orange-600 font-semibold">מאורכבת</div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}