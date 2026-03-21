import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Filter, Search, Grid3X3, List, Calendar, MapPin, Eye, Pencil, Trash2, GripVertical, AlertCircle, Clock, CheckCircle2, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';

const COLUMNS = [
  { id: 'open', label: 'פתוחה', color: 'border-t-green-500', count_color: 'bg-green-100 text-green-700' },
  { id: 'in_progress', label: 'בטיפול', color: 'border-t-yellow-500', count_color: 'bg-yellow-100 text-yellow-700' },
  { id: 'resolved', label: 'הושלמה', color: 'border-t-blue-500', count_color: 'bg-blue-100 text-blue-700' }
];

const PRIORITY_MAP = {
  low: { label: 'נמוכה', color: '#3b82f6', bg: '#dbeafe', dot: 'bg-blue-500' },
  high: { label: 'גבוהה', color: '#f59e0b', bg: '#fef3c7', dot: 'bg-amber-500' },
  urgent: { label: 'דחוף', color: '#ef4444', bg: '#fee2e2', dot: 'bg-red-500' }
};

const PRIORITY_ORDER = { urgent: 0, high: 1, low: 2 };

function ReportTaskDialog({ open, onClose, onSuccess, onNotify, currentUser }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    target_type: 'room',
    target_id: '',
    priority: 'low',
    assigned_to: [],
    searchUser: ''
  });
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);

  const { data: appUsers = [] } = useQuery({
    queryKey: ['appUsers'],
    queryFn: () => base44.entities.AppUser.list()
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      setError('ניתן לצרף עד 5 תמונות');
      return;
    }
    setUploadingImages(true);
    try {
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        setImages(prev => [...prev, result.file_url]);
      }
    } catch (err) {
      setError('שגיאה בהעלאת תמונה');
    }
    setUploadingImages(false);
  };

  const handleVideoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (videos.length + files.length > 3) {
      setError('ניתן לצרף עד 3 סרטונים');
      return;
    }
    setUploadingVideos(true);
    try {
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        setVideos(prev => [...prev, result.file_url]);
      }
    } catch (err) {
      setError('שגיאה בהעלאת סרטון');
    }
    setUploadingVideos(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim() || !form.description.trim() || !form.target_id.trim()) {
      setError('יש למלא את כל השדות החובה');
      return;
    }

    setSaving(true);
    try {
      const taskData = {
        title: form.title,
        description: form.description,
        target_type: form.target_type,
        target_id: form.target_id,
        priority: form.priority,
        status: 'open',
        reporter_email: currentUser?.username || currentUser?.email,
        assigned_to: form.assigned_to.length > 0 ? form.assigned_to.join(',') : null,
        images,
        videos
      };

      await base44.entities.Task.create(taskData);
      onNotify('משימה נוצרה בהצלחה!');
      onSuccess();
      setForm({ title: '', description: '', target_type: 'room', target_id: '', priority: 'low', assigned_to: [], searchUser: '' });
      setImages([]);
      setVideos([]);
    } catch (err) {
      setError('שגיאה בשמירת המשימה');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">דיווח על משימה חדשה</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">כותרת המשימה *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="הכנס כותרת משימה"
              className="rounded-xl border-slate-200 bg-slate-50 text-right text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">סוג יעד *</label>
              <Select value={form.target_type} onValueChange={(v) => setForm(p => ({ ...p, target_type: v }))}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room">חדר</SelectItem>
                  <SelectItem value="area">אזור</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">מזהה יעד *</label>
              <Input
                value={form.target_id}
                onChange={(e) => setForm(p => ({ ...p, target_id: e.target.value }))}
                placeholder="הכנס מזהה"
                className="rounded-xl border-slate-200 bg-slate-50 text-right text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">דחיפות *</label>
            <div className="flex gap-3 justify-end">
              {[
                { value: 'low', label: 'נמוכה', bg: 'bg-blue-50 border-blue-300', active: 'bg-blue-500 text-white border-blue-600' },
                { value: 'high', label: 'גבוהה', bg: 'bg-yellow-50 border-yellow-400', active: 'bg-yellow-400 text-slate-800 border-yellow-500' },
                { value: 'urgent', label: 'דחוף', bg: 'bg-red-50 border-red-300', active: 'bg-red-500 text-white border-red-600' }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, priority: opt.value }))}
                  className={`flex-1 rounded-xl font-bold transition-all ${
                    form.priority === opt.value 
                      ? opt.active 
                      : `${opt.bg} text-slate-700 hover:border-opacity-80`
                  }`}
                  style={{ height: '40px', borderWidth: '1px' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">תיאור המשימה *</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="תאר את המשימה בפירוט"
              className="rounded-xl border-slate-200 bg-slate-50 min-h-[100px] resize-none text-right text-sm"
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">הקצה למשתמשים</label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-right text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-end"
                >
                  {form.assigned_to.length > 0 ? (
                    <span>{form.assigned_to.length} משתמשים נבחרו</span>
                  ) : (
                    <span className="text-slate-400">בחר משתמשים...</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" dir="rtl">
                <div className="p-4 space-y-3">
                  <h3 className="text-sm font-bold text-slate-700 text-right">משתמשים</h3>
                  <Input
                    placeholder="חפש משתמש..."
                    className="h-10 rounded-lg border-slate-200 bg-slate-50 text-right text-sm"
                    onChange={(e) => setForm(p => ({ ...p, searchUser: e.target.value }))}
                  />
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {appUsers
                      .filter(u => u.first_name?.includes(form.searchUser || "") || u.username?.includes(form.searchUser || ""))
                      .map(u => (
                        <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50">
                          <Checkbox
                            checked={form.assigned_to?.includes(u.username) || false}
                            onCheckedChange={(checked) => {
                              setForm(p => ({
                                ...p,
                                assigned_to: checked
                                  ? [...(p.assigned_to || []), u.username]
                                  : p.assigned_to.filter(x => x !== u.username),
                              }));
                            }}
                          />
                          <div className="w-6 h-6 rounded-full bg-blue-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {u.first_name?.[0] || '?'}
                          </div>
                          <div className="flex-1 text-right">
                            <p className="text-sm font-medium text-slate-700">{u.first_name} {u.last_name || ''}</p>
                            <p className="text-xs text-slate-400">{u.username}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                  {form.assigned_to?.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 space-y-1">
                      <p className="text-xs font-semibold text-slate-600 text-right">נבחרו:</p>
                      <div className="flex flex-wrap gap-1">
                        {form.assigned_to.map(username => {
                          const user = appUsers.find(u => u.username === username);
                          return (
                            <div key={username} className="flex items-center gap-1 bg-blue-100 rounded-lg px-2 py-1">
                              <span className="text-xs text-blue-700 font-medium">{user?.first_name}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setForm(p => ({
                                    ...p,
                                    assigned_to: p.assigned_to.filter(u => u !== username),
                                  }))
                                }
                                className="text-blue-400 hover:text-blue-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">תמונות <span className="font-normal text-slate-400">(עד 5)</span></label>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="w-14 h-14 object-cover rounded-xl border border-slate-200" />
                    <button type="button" onClick={() => setImages(p => p.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${images.length >= 5 ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-green-300 hover:bg-green-50/40'}`}>
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center"><Plus className="w-4 h-4 text-green-500" /></div>
                <span className="text-sm font-semibold text-slate-700">בחר מגלריה</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImages || images.length >= 5} />
              </label>
              <label className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${images.length >= 5 ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-blue-300 hover:bg-blue-50/40'}`}>
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center"><AlertCircle className="w-4 h-4 text-blue-500" /></div>
                <span className="text-sm font-semibold text-slate-700">צלם תמונה</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={uploadingImages || images.length >= 5} />
              </label>
            </div>
            {uploadingImages && <p className="text-sm text-blue-600 text-center">מעלה תמונות...</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">סרטונים <span className="font-normal text-slate-400">(עד 3)</span></label>
            {videos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {videos.map((url, i) => (
                  <div key={i} className="relative w-14 h-14 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-slate-400" />
                    <button type="button" onClick={() => setVideos(p => p.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${videos.length >= 3 ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-purple-300 hover:bg-purple-50/40'}`}>
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center"><Plus className="w-4 h-4 text-purple-500" /></div>
                <span className="text-sm font-semibold text-slate-700">בחר וידאו</span>
                <input type="file" multiple accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideos || videos.length >= 3} />
              </label>
              <label className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${videos.length >= 3 ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-purple-300 hover:bg-purple-50/40'}`}>
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center"><AlertCircle className="w-4 h-4 text-purple-500" /></div>
                <span className="text-sm font-semibold text-slate-700">צלם וידאו</span>
                <input type="file" accept="video/*" capture="environment" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideos || videos.length >= 3} />
              </label>
            </div>
            {uploadingVideos && <p className="text-sm text-purple-600 text-center">מעלה סרטון...</p>}
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium text-right">{error}</div>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="h-12 px-6 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all">
              ביטול
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-12 text-base bg-gradient-to-l from-blue-500 to-cyan-400 hover:opacity-90 shadow-lg rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
              <Plus className="w-5 h-5" />
              {saving ? "יוצר..." : "צור משימה"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailsDialog({ task, open, onClose, onDelete, onStatusChange, onView, appUsers }) {
  const [imageIndex, setImageIndex] = useState(0);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const images = task?.images || [];
  const hasMultipleImages = images.length > 1;

  if (!task) return null;

  const targetLabel = task.target_type === 'room' ? `חדר ${task.target_id}` : `אזור ${task.target_id}`;
  const reporterUser = appUsers?.find(u => u.username === task.reporter_email) || appUsers?.find(u => u.email === task.reporter_email);

  const handleConfirmDelete = () => {
    onDelete(task.id);
    setShowDeleteAlert(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl" dir="rtl">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-slate-400" />
                <DialogTitle className="text-xl font-black text-slate-800">{targetLabel}</DialogTitle>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* תיאור */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">תיאור המשימה</h3>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3">
                {task.description}
              </p>
            </div>

            {/* תמונות */}
            {images.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700">תמונות ({images.length})</h3>
                <div className="bg-slate-50 rounded-xl p-6 flex flex-col items-center gap-4">
                  <div className="relative w-full max-w-sm h-64 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center">
                    <img src={images[imageIndex]} alt="" className="max-h-full max-w-full object-contain" />
                  </div>
                  
                  {hasMultipleImages && (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setImageIndex((i) => (i - 1 + images.length) % images.length)}
                        className="w-10 h-10 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors font-bold text-lg"
                        title="תמונה קודמת"
                      >
                        →
                      </button>
                      <span className="text-sm font-semibold text-slate-700 min-w-fit">{imageIndex + 1} / {images.length}</span>
                      <button
                        onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                        className="w-10 h-10 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors font-bold text-lg"
                        title="תמונה הבאה"
                      >
                        ←
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* סטטוס */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">שינוי סטטוס</h3>
              <Select value={task.status} onValueChange={(v) => onStatusChange(task.id, v)}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">פתוחה</SelectItem>
                  <SelectItem value="in_progress">בטיפול</SelectItem>
                  <SelectItem value="resolved">הושלמה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* מידע תחתית */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
              <span>נוצר על ידי: <span className="text-slate-700 font-medium">{reporterUser?.first_name || task.reporter_email}</span></span>
              <span>{format(new Date(task.created_date), 'dd/MM/yy')}</span>
            </div>

            {/* כפתורים */}
            <div className="flex gap-2 pt-2 justify-end">
              <button
                onClick={onClose}
                className="h-11 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                סגור
              </button>
              <button
                onClick={() => setShowDeleteAlert(true)}
                className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold hover:bg-red-100 transition-colors flex items-center justify-center"
                title="מחוק"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onView(task)}
                className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 font-bold hover:bg-blue-100 transition-colors flex items-center justify-center"
                title="עריכה"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">מחיקת המשימה</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              האם אתה בטוח שברצונך למחוק משימה זו? לא ניתן לשחזר פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end pt-2">
            <AlertDialogCancel className="h-10 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction className="h-10 px-4 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600" onClick={handleConfirmDelete}>
              מחוק
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function KanbanCard({ task, index, onDelete, onView, appUsers }) {
  const p = PRIORITY_MAP[task.priority] || PRIORITY_MAP.low;
  const targetLabel = task.target_type === 'room' ? `חדר ${task.target_id}` : `אזור ${task.target_id}`;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={() => onView(task)}
          className={`bg-white rounded-xl border border-slate-200 shadow-sm mb-2 overflow-hidden transition-shadow cursor-pointer ${snapshot.isDragging ? 'shadow-xl rotate-1 scale-105' : 'hover:shadow-md'}`}
        >
          {/* Drag handle bar */}
          <div
            {...provided.dragHandleProps}
            className="flex flex-row-reverse items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/60 cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${p.dot}`}></span>
              <span className="text-xs font-semibold text-slate-500">{p.label}</span>
            </div>
            <GripVertical className="w-4 h-4 text-slate-300" />
          </div>

          {/* Card body */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="font-bold text-slate-800 text-sm">{task.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onView(task); }}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-blue-400 hover:bg-blue-50 transition-colors"
                  title="צפה בפרטים"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="עריכה"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                  title="מחוק"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {task.description && (
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{task.description}</p>
            )}

            <div className="flex items-center justify-between pt-0.5 text-xs text-slate-400">
              <span>{targetLabel}</span>
              <span>{format(new Date(task.created_date), 'dd/MM/yy')}</span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

function KanbanColumn({ col, tasks, onDelete, onView, appUsers }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* Column header */}
      <div className={`rounded-t-2xl border-t-4 ${col.color} bg-white border border-slate-200 px-4 py-3 flex items-center justify-between mb-0`}>
        <span className="font-black text-slate-700 text-base">{col.label}</span>
        <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${col.count_color}`}>{tasks.length}</span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={col.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[300px] rounded-b-2xl border border-t-0 border-slate-200 p-3 transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/40' : 'bg-slate-50/60'}`}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center h-24 text-slate-300">
                <AlertCircle className="w-7 h-7 mb-1.5 opacity-40" />
                <p className="text-xs">אין משימות</p>
              </div>
            )}
            {tasks.map((task, index) => (
              <KanbanCard key={task.id} task={task} index={index} onDelete={onDelete} onView={onView} appUsers={appUsers} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function TasksManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [notification, setNotification] = useState(null);
  const [viewMode, setViewMode] = useState('kanban');
  const { currentUser } = useAuth();
  const { data: appUsers = [] } = useQuery({ queryKey: ['appUsers'], queryFn: () => base44.entities.AppUser.list() });
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (isAdmin) return true;

      const isReporter = t.reporter_email === currentUser?.username;
      const isAssigned = t.assigned_to?.split(',').map(u => u.trim()).includes(currentUser?.username);

      if (!isReporter && !isAssigned) return false;

      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.target_id?.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q) && !t.title?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filterPriority, search, currentUser?.username, isAdmin]);

  const columns = useMemo(() => {
    const map = {};
    COLUMNS.forEach((col) => {
      map[col.id] = filtered
        .filter((t) => t.status === col.id)
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    });
    return map;
  }, [filtered]);

  const handleDelete = async (id) => {
    if (!window.confirm('האם למחוק משימה זו?')) return;
    await base44.entities.Task.delete(id);
    qc.invalidateQueries({ queryKey: ['tasks'] });
    setDetailsOpen(false);
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    await base44.entities.Task.update(draggableId, { status: newStatus });
    qc.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleStatusChange = async (id, status) => {
    await base44.entities.Task.update(id, { status });
    qc.invalidateQueries({ queryKey: ['tasks'] });
    setSelectedTask({ ...selectedTask, status });
  };

  const stats = useMemo(() => ({
    open: filtered.filter((t) => t.status === 'open').length,
    inProgress: filtered.filter((t) => t.status === 'in_progress').length,
    resolved: filtered.filter((t) => t.status === 'resolved').length,
    urgent: filtered.filter((t) => t.priority === 'urgent' && (t.status === 'open' || t.status === 'in_progress')).length,
  }), [filtered]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6" dir="rtl">
      <div className="w-full max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shadow-sm">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">ניהול משימות</h1>
              <p className="text-sm text-slate-400 mt-0.5">גררו משימות בין עמודות לשינוי סטטוס</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-2 h-9 px-4 rounded-lg font-bold transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 h-9 px-4 rounded-lg font-bold transition-all ${
                  viewMode === 'list'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-l from-blue-500 to-cyan-400 text-white font-bold shadow-lg hover:opacity-90 transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              משימה חדשה
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'משימות פתוחות', count: stats.open, icon: <AlertCircle className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50', accent: 'text-blue-600', border: 'border-blue-100' },
            { label: 'בטיפול', count: stats.inProgress, icon: <Clock className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-50', accent: 'text-amber-600', border: 'border-amber-100' },
            { label: 'הושלמו', count: stats.resolved, icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, bg: 'bg-green-50', accent: 'text-green-600', border: 'border-green-100' },
            { label: 'דחוף', count: stats.urgent, icon: <AlertCircle className="w-5 h-5 text-red-500" />, bg: 'bg-red-50', accent: 'text-red-600', border: 'border-red-100' },
          ].map(({ label, count, icon, bg, accent, border }) => (
            <div key={label} className={`rounded-2xl border ${border} bg-white p-4 flex items-center justify-between shadow-sm`}>
              <div>
                <p className={`text-3xl font-black ${accent}`}>{count}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${bg}`}>{icon}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="חפש בכותרת, מיקום..."
              className="h-10 pr-9 rounded-xl border-slate-200 bg-slate-50 text-sm" />
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-10 w-36 rounded-xl border-slate-200 bg-slate-50 text-sm"><SelectValue placeholder="דחיפות" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הדחיפויות</SelectItem>
              <SelectItem value="urgent">דחוף</SelectItem>
              <SelectItem value="high">גבוהה</SelectItem>
              <SelectItem value="low">נמוכה</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-400 mr-auto">{filtered.length} משימות</span>
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-400">טוען...</div>
        ) : viewMode === 'kanban' ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 items-start">
              {COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  tasks={columns[col.id] || []}
                  onDelete={handleDelete}
                  onView={(task) => {
                    setSelectedTask(task);
                    setDetailsOpen(true);
                  }}
                  appUsers={appUsers}
                />
              ))}
            </div>
          </DragDropContext>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">כותרת</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">מיקום</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">דחיפות</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">סטטוס</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">תאריך</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-600">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">אין משימות</td>
                  </tr>
                ) : (
                  filtered.map((task) => {
                    const p = PRIORITY_MAP[task.priority] || PRIORITY_MAP.low;
                    const targetLabel = task.target_type === 'room' ? `חדר ${task.target_id}` : `אזור ${task.target_id}`;
                    const statusLabel = task.status === 'open' ? 'פתוחה' : task.status === 'in_progress' ? 'בטיפול' : 'הושלמה';
                    return (
                      <tr
                        key={task.id}
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedTask(task);
                          setDetailsOpen(true);
                        }}
                      >
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800">{task.title}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">{targetLabel}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg" style={{ backgroundColor: `${p.bg}`, color: p.color }}>
                            <span className={`w-2 h-2 rounded-full ${p.dot}`}></span>
                            <span className="text-xs font-semibold">{p.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${
                            task.status === 'resolved' ? 'bg-green-100 text-green-700' :
                            task.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-500">{format(new Date(task.created_date), 'dd/MM/yy')}</td>
                        <td className="px-4 py-3 text-center flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                              setDetailsOpen(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                              setDetailsOpen(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(task.id);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {notification && (
        <div className="fixed top-4 right-4 left-4 max-w-sm mx-auto z-50 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 shadow-lg animate-in">
          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircle className="w-3 h-3 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">{notification}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-blue-400 hover:text-blue-600 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <ReportTaskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => {
          setDialogOpen(false);
          qc.invalidateQueries({ queryKey: ['tasks'] });
        }}
        onNotify={(msg) => {
          setNotification(msg);
          setTimeout(() => setNotification(null), 5000);
        }}
        currentUser={currentUser}
      />

      <TaskDetailsDialog
        task={selectedTask}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        onView={(task) => {
          setSelectedTask(task);
          setDetailsOpen(true);
        }}
        appUsers={appUsers}
      />
    </div>
  );
}