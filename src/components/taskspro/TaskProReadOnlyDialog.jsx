import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, ChevronLeft, ChevronRight, X } from "lucide-react";
import { format } from "date-fns";
import { updateTask } from "./taskProApi";
import { useQueryClient } from "@tanstack/react-query";

const STATUSES = ["פתוחה", "בטיפול", "ממתינה", "הושלמה", "בוטלה"];
const STATUS_COLOR = {
  "פתוחה": "bg-blue-100 text-blue-700",
  "בטיפול": "bg-orange-100 text-orange-700",
  "הושלמה": "bg-green-100 text-green-700",
  "בוטלה": "bg-slate-100 text-slate-600",
  "ממתינה": "bg-purple-100 text-purple-700"
};
const PRIORITY_COLOR = {
  "דחופה": "bg-red-100 text-red-700",
  "גבוהה": "bg-yellow-100 text-yellow-700",
  "נמוכה": "bg-green-100 text-green-700"
};

export default function TaskProReadOnlyDialog({
  open,
  onClose,
  task,
  attachments = [],
  currentUser
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(task?.status || "פתוחה");
  const [imageIndex, setImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [updating, setUpdating] = useState(false);

  if (!task) return null;

  const images = attachments.filter((a) =>
    ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(a.file_type)
  );

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    setUpdating(true);
    try {
      await updateTask(task.id, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
    } catch (e) {
      setStatus(task.status);
    } finally {
      setUpdating(false);
    }
  };

  const fmt = (dt) => {
    if (!dt) return "—";
    try {
      return format(new Date(dt), "dd/MM/yyyy HH:mm");
    } catch {
      return "—";
    }
  };

  const dueDate = task.due_at?.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = dueDate && dueDate < today && status !== "הושלמה" && status !== "בוטלה";

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[900px] h-[700px] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl" dir="rtl">
          <DialogTitle className="hidden">צפייה במשימה</DialogTitle>

          {/* Header */}
          <div className="bg-gradient-to-l from-blue-600 to-blue-700 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">צפייה במשימה</h2>
              <button onClick={onClose} className="text-white hover:bg-white/20 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="p-6 space-y-5">
              {/* כותרת ומידע בסיסי */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{task.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    נוצר: {fmt(task.created_date)} • מעודכן: {fmt(task.updated_date)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={STATUS_COLOR[status]}>
                    {status}
                  </Badge>
                  <Badge className={PRIORITY_COLOR[task.priority]}>
                    {task.priority}
                  </Badge>
                  {isOverdue && (
                    <Badge className="bg-red-100 text-red-700">
                      חזוק מתאריך היעד
                    </Badge>
                  )}
                </div>
              </div>

              {/* תיאור */}
              {task.description && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <p className="text-sm font-medium text-slate-700 mb-2">תיאור</p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              {/* מידע נוסף */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 mb-1">תאריך יעד</p>
                  <p className={`text-sm font-semibold ${isOverdue ? "text-red-600" : "text-slate-700"}`}>
                    {task.due_at ? format(new Date(task.due_at), "dd/MM/yyyy") : "—"}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 mb-1">משויך ל</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {task.assigned_to_name || task.assigned_to || "—"}
                  </p>
                </div>
              </div>

              {task.apartment_number && (
                <div className="bg-teal-50 rounded-xl border border-teal-200 p-4">
                  <p className="text-sm font-semibold text-teal-700">
                    דירה {task.apartment_number} {task.owner_name && `• ${task.owner_name}`}
                  </p>
                </div>
              )}

              {/* קבצים ותמונות */}
              {attachments.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                  <p className="text-sm font-bold text-slate-700">קבצים ({attachments.length})</p>

                  {images.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">תמונות ({images.length})</p>
                      <button
                        onClick={() => setShowImageViewer(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4" /> צפייה בגלריה
                      </button>
                    </div>
                  )}

                  {attachments.filter((a) => !images.includes(a)).length > 0 && (
                    <div className="space-y-2">
                      {attachments
                        .filter((a) => !images.includes(a))
                        .map((a) => (
                          <a
                            key={a.id}
                            href={a.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-sm text-blue-600 hover:underline truncate"
                          >
                            📎 {a.file_display_name || a.file_name}
                          </a>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* סטטוס - יכול לשנות */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
                <p className="text-sm font-bold text-slate-700">שנה סטטוס</p>
                <Select value={status} onValueChange={handleStatusChange} disabled={updating}>
                  <SelectTrigger className="h-10 bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white flex-shrink-0">
            <Button variant="outline" onClick={onClose} className="h-10 px-6">
              סגור
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
      <DialogContent className="w-full h-screen max-w-6xl max-h-screen overflow-hidden p-0 bg-black rounded-none" dir="rtl">
        <DialogTitle className="hidden">צפייה בתמונה</DialogTitle>

        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black border-b border-slate-700">
            <p className="text-white text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </p>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <img
              src={images[currentIndex].file_url}
              alt="תמונה"
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between p-4 bg-black border-t border-slate-700">
            <button
              onClick={onPrev}
              className="text-white hover:bg-white/20 p-2 rounded transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <p className="text-white text-center flex-1">
              {images[currentIndex].file_display_name || images[currentIndex].file_name}
            </p>
            <button
              onClick={onNext}
              className="text-white hover:bg-white/20 p-2 rounded transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}