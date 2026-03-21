import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X, CalendarDays, Edit2, Trash2, Repeat2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { updateTask, deleteTask } from "./taskProApi";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const STATUSES = ["פתוחה", "בטיפול", "ממתינה", "הושלמה", "בוטלה"];

const PRIORITY_LABELS = { urgent: "דחוף", high: "גבוה", low: "נמוך", "דחופה": "דחוף", "בינונית": "בינוני", "נמוכה": "נמוך" };
const PRIORITY_COLORS = { urgent: "bg-red-500", "דחופה": "bg-red-500", high: "bg-yellow-500", "גבוהה": "bg-yellow-500", low: "bg-blue-400", "נמוכה": "bg-blue-400", "בינונית": "bg-orange-400" };

const FREQ_LABELS = { daily: "יומי", weekly: "שבועי", monthly: "חודשי", yearly: "שנתי" };

export default function TaskProReadOnlyDialog({
  open,
  onClose,
  task,
  attachments = [],
  currentUser,
  onEdit
}) {
  const queryClient = useQueryClient();
  const [imageIndex, setImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [status, setStatus] = useState(task?.status);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (task) {
      setStatus(task.status);
      setImageIndex(0);
    }
  }, [task?.id]);

  if (!task) return null;

  const images = attachments.filter((a) =>
    ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(a.file_type)
  );

  const fmt = (dt) => {
    if (!dt) return "—";
    try { return format(new Date(dt), "dd/MM/yyyy"); } catch { return "—"; }
  };

  const handleDeleteConfirmed = async () => {
    setDeleting(true);
    try {
      await deleteTask(task.id);
      queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
      onClose();
      toast.success("המשימה נמחקה בהצלחה");
    } catch (e) {
      toast.error("שגיאה במחיקת המשימה");
      setDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    try {
      await updateTask(task.id, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
    } catch (e) {
      setStatus(task.status);
    }
  };

  // משתתפים — מהמערך שהועבר (attendeesMap ב-Page)
  const attendees = task.attendees || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-[830px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl bg-slate-50 [&>button]:hidden" dir="rtl">
          <DialogTitle className="hidden">צפייה במשימה</DialogTitle>

          {/* Header */}
          <div className="bg-gradient-to-l from-blue-600 to-blue-700 text-white px-6 py-4 space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate">{task.title || task.task_type}</h2>
                {task.task_type && task.title && task.task_type !== task.title && (
                  <p className="text-blue-200 text-sm mt-0.5">{task.task_type}</p>
                )}
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-lg bg-blue-500 hover:bg-blue-800 text-white flex items-center justify-center transition-colors flex-shrink-0 mr-3">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {task.priority && (
                <Badge className={`${PRIORITY_COLORS[task.priority] || "bg-blue-300"} text-white text-xs`}>
                  {PRIORITY_LABELS[task.priority] || task.priority}
                </Badge>
              )}
              {status && (
                <Badge className="bg-white/20 text-white border-white/30 text-xs">{status}</Badge>
              )}
              {task.is_recurring && (
                <Badge className="bg-purple-500/80 text-white text-xs flex items-center gap-1">
                  <Repeat2 className="w-3 h-3" /> מחזורית
                </Badge>
              )}
              {task.due_at && (
                <div className="flex items-center gap-1.5 text-sm text-blue-100">
                  <CalendarDays className="w-4 h-4" />
                  יעד: {format(new Date(task.due_at), "dd/MM/yyyy HH:mm")}
                </div>
              )}
            </div>
          </div>

          {/* Body - scrollable */}
          <div className="flex-1 overflow-y-auto bg-white min-h-0">
            <div className="p-6 space-y-5">

              {/* תיאור */}
              {task.description && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">תיאור</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{task.description}</p>
                </div>
              )}

              {/* תמונות */}
              {images.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700">תמונות ({images.length})</p>
                  <div
                    onClick={() => setShowImageViewer(true)}
                    className="bg-slate-100 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <img
                      key={images[imageIndex]?.id}
                      src={images[imageIndex]?.file_url}
                      alt="תמונה"
                      className="w-full h-72 object-cover"
                    />
                  </div>
                  {images.length > 1 && (
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                        className="p-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <p className="text-sm font-semibold text-slate-700 min-w-12 text-center">
                        {imageIndex + 1} / {images.length}
                      </p>
                      <button
                        onClick={() => setImageIndex((i) => (i - 1 + images.length) % images.length)}
                        className="p-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* סטטוס עריך */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                <p className="text-sm font-bold text-slate-700">סטטוס</p>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-10 bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* משתתפים */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-sm font-bold text-slate-700">משתתפים וצוות</p>
                {task.assigned_by_name && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">הוקצה ע״י:</span>
                    <span>{task.assigned_by_name}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {attendees.length > 0 ? (
                    attendees.map((a, i) => (
                      <Badge key={a.id || i} className="bg-blue-100 text-blue-700 text-xs py-1 px-2.5">
                        👤 {a.user_name || a.name || a.user_username || "משתתף"}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">אין משתתפים נוספים</p>
                  )}
                </div>
              </div>

              {/* קישור לדירה */}
              {task.apartment_number && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-bold text-slate-700 mb-2">קישור לדירה</p>
                  <p className="text-sm text-slate-700">דירה {task.apartment_number}{task.owner_name ? ` — ${task.owner_name}` : ""}</p>
                </div>
              )}

              {/* מחזוריות */}
              {task.is_recurring && task.recurrence_rule_id && (
                <div className="bg-purple-50 rounded-xl border border-purple-200 p-4 space-y-2">
                  <p className="text-sm font-bold text-purple-700 flex items-center gap-2">
                    <Repeat2 className="w-4 h-4" /> משימה מחזורית
                  </p>
                  <p className="text-xs text-purple-600">משימה זו נוצרה כחלק מסדרה מחזורית</p>
                </div>
              )}

              {/* תאריכים */}
              <div className="grid grid-cols-2 gap-3">
                {task.created_date && (
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                    <p className="text-xs text-slate-400 mb-1">נוצרה</p>
                    <p className="text-sm font-medium text-slate-700">{fmt(task.created_date)}</p>
                  </div>
                )}
                {task.updated_date && (
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                    <p className="text-xs text-slate-400 mb-1">עדכון אחרון</p>
                    <p className="text-sm font-medium text-slate-700">{fmt(task.updated_date)}</p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-white flex-shrink-0">
            <div className="flex gap-2">
              <button
                onClick={() => onEdit?.(task)}
                className="w-10 h-10 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors"
                title="ערוך משימה"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowDeleteAlert(true)}
                className="w-10 h-10 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors"
                title="מחק משימה"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <Button variant="outline" onClick={onClose} className="h-10 px-6">
              סגור
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog מחיקה */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="text-right">מחיקת משימה</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              האם אתה בטוח שברצונך למחוק את המשימה <strong>"{task.title || task.task_type}"</strong>?
              <br />
              פעולה זו אינה הפיכה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel disabled={deleting}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "מוחק..." : "מחק משימה"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Viewer */}
      {showImageViewer && (
        <ImageViewer
          images={images}
          currentIndex={imageIndex}
          onClose={() => setShowImageViewer(false)}
          onNext={() => setImageIndex((i) => (i + 1) % images.length)}
          onPrev={() => setImageIndex((i) => (i - 1 + images.length) % images.length)}
        />
      )}
    </>
  );
}

function ImageViewer({ images, currentIndex, onClose, onNext, onPrev }) {
  if (!images[currentIndex]) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full h-screen max-w-6xl max-h-screen overflow-hidden p-0 bg-black rounded-none [&>button]:hidden" dir="rtl">
        <DialogTitle className="hidden">צפייה בתמונה</DialogTitle>
        <div className="relative w-full h-full flex flex-col">
          <div className="flex items-center justify-between p-4 bg-black border-b border-slate-700">
            <p className="text-white text-sm font-medium">{currentIndex + 1} / {images.length}</p>
            <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <img src={images[currentIndex].file_url} alt="תמונה" className="max-w-full max-h-full object-contain" />
          </div>
          <div className="flex items-center justify-between p-4 bg-black border-t border-slate-700">
            <button onClick={onPrev} className="text-white hover:bg-white/20 p-2 rounded transition-colors">
              <ChevronRight className="w-6 h-6" />
            </button>
            <p className="text-white text-center flex-1">{images[currentIndex].file_display_name || images[currentIndex].file_name}</p>
            <button onClick={onNext} className="text-white hover:bg-white/20 p-2 rounded transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}