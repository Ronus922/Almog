import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X, MapPin, Edit2, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { updateTask, deleteTask } from "./taskProApi";
import { useQueryClient } from "@tanstack/react-query";

const STATUSES = ["פתוחה", "בטיפול", "ממתינה", "הושלמה", "בוטלה"];

export default function TaskProReadOnlyDialog({
  open,
  onClose,
  task,
  attachments = [],
  currentUser
}) {
  const queryClient = useQueryClient();
  const [imageIndex, setImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [status, setStatus] = useState(task?.status);
  const [attendees, setAttendees] = useState([]);

  useEffect(() => {
    if (task) {
      setStatus(task.status);
    }
  }, [task?.id]);

  if (!task) return null;

  const images = attachments.filter((a) =>
    ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(a.file_type)
  );

  const fmt = (dt) => {
    if (!dt) return "—";
    try {
      return format(new Date(dt), "dd/MM/yyyy");
    } catch {
      return "—";
    }
  };

  const handleDelete = async () => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק משימה זו?")) {
      try {
        await deleteTask(task.id);
        queryClient.invalidateQueries({ queryKey: ["taskpro-tasks"] });
        onClose();
      } catch (e) {
        console.error("Error deleting task:", e);
      }
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

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[830px] max-h-[960px] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl bg-slate-50" dir="rtl">
          <DialogTitle className="hidden">צפייה במשימה</DialogTitle>

          {/* Header with close and date */}
          <div className="flex items-start justify-between p-6 bg-white border-b border-slate-200">
            <button onClick={onClose} className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors flex-shrink-0">
              <X className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold">{fmt(task.due_at)}</span>
            </div>
          </div>

          {/* Body - scrollable */}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="p-6 space-y-6">
              
              {/* תיאור */}
              {task.description && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-700">{task.description}</p>
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

                  {/* ניווט */}
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

              {/* תאריך עדכון */}
              {task.updated_date && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 mb-1">עדכון אחרון</p>
                  <p className="text-sm font-semibold text-slate-700">{fmt(task.updated_date)}</p>
                </div>
              )}

              {/* משתתפים */}
              {task.attendees && task.attendees.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-bold text-slate-700 mb-3">משתתפים</p>
                  <div className="flex flex-wrap gap-2">
                    {task.attendees.map((a) => (
                      <Badge key={a.id} className="bg-blue-100 text-blue-700">
                        <span className="mr-1">👤</span> {a.name || a.username}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Footer with action buttons */}
          <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-200 bg-white flex-shrink-0">
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors">
                <Edit2 className="w-5 h-5" />
              </button>
              <button onClick={handleDelete} className="w-10 h-10 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
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