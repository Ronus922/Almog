import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RotateCcw, Trash2, CheckSquare, Square, AlertTriangle, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

const FILE_CATEGORIES = {
  image: { emoji: '🖼️', label: 'תמונה' },
  pdf: { emoji: '📄', label: 'PDF' },
  audio: { emoji: '🎵', label: 'אודיו' },
  video: { emoji: '🎬', label: 'וידאו' },
  document: { emoji: '📝', label: 'מסמך' },
  spreadsheet: { emoji: '📊', label: 'גיליון חישוב' },
  presentation: { emoji: '📽️', label: 'הצגה' },
  archive: { emoji: '📦', label: 'ארכיון' },
  other: { emoji: '📎', label: 'אחר' },
};

function getFileSizeDisplay(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIdx = 0;
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx++;
  }
  return `${size.toFixed(1)} ${units[unitIdx]}`;
}

export default function TrashView({ allFolders = [] }) {
  const [selected, setSelected] = useState(new Set());
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'single'|'bulk', fileId?, label }
  const queryClient = useQueryClient();

  const { data: trashedFiles = [], isLoading } = useQuery({
    queryKey: ['trash-files'],
    queryFn: async () => {
      const all = await base44.entities.DocumentFile.list();
      return all.filter(f => f.is_deleted === true);
    },
    staleTime: 0,
  });

  const restoreFileMutation = useMutation({
    mutationFn: async (file) => {
      // בדוק אם התיקייה המקורית עדיין קיימת
      const originalFolderId = file.original_folder_id || file.folder_id;
      let restoreFolderId = null;

      if (originalFolderId) {
        const folderExists = allFolders.some(f => f.id === originalFolderId && !f.is_deleted);
        restoreFolderId = folderExists ? originalFolderId : null;
      }

      return base44.entities.DocumentFile.update(file.id, {
        is_deleted: false,
        deleted_at: null,
        deleted_by_user_id: null,
        folder_id: restoreFolderId,
        original_folder_id: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash-files'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('הקובץ שוחזר בהצלחה');
    },
    onError: (e) => toast.error('שגיאה בשחזור: ' + e.message),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (fileId) => base44.entities.DocumentFile.delete(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash-files'] });
      toast.success('הקובץ נמחק לצמיתות');
    },
    onError: (e) => toast.error('שגיאה במחיקה: ' + e.message),
  });

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === trashedFiles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(trashedFiles.map(f => f.id)));
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    const { type, fileId, action } = confirmAction;

    if (action === 'restore') {
      if (type === 'single') {
        const file = trashedFiles.find(f => f.id === fileId);
        if (file) await restoreFileMutation.mutateAsync(file);
      } else {
        const toRestore = trashedFiles.filter(f => selected.has(f.id));
        for (const f of toRestore) {
          await restoreFileMutation.mutateAsync(f);
        }
        setSelected(new Set());
      }
    } else if (action === 'delete') {
      if (type === 'single') {
        await permanentDeleteMutation.mutateAsync(fileId);
      } else {
        for (const id of selected) {
          await permanentDeleteMutation.mutateAsync(id);
        }
        setSelected(new Set());
      }
    }

    setConfirmAction(null);
  };

  const getFolderName = (folderId) => {
    if (!folderId) return 'תיקיית שורש';
    const folder = allFolders.find(f => f.id === folderId);
    return folder ? folder.name : 'תיקייה שנמחקה';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p>טוען...</p>
      </div>
    );
  }

  if (trashedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <FolderOpen className="w-16 h-16 opacity-20" />
        <p className="text-lg">סל המחזור ריק</p>
      </div>
    );
  }

  return (
    <div dir="rtl">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          {selected.size === trashedFiles.length && trashedFiles.length > 0
            ? <CheckSquare className="w-4 h-4 text-blue-600" />
            : <Square className="w-4 h-4" />
          }
          {selected.size === trashedFiles.length && trashedFiles.length > 0 ? 'בטל הכל' : 'בחר הכל'}
        </button>

        {selected.size > 0 && (
          <>
            <span className="text-sm text-slate-500">נבחרו {selected.size} קבצים</span>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => setConfirmAction({ type: 'bulk', action: 'restore', label: `שחזר ${selected.size} קבצים נבחרים?` })}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              שחזר נבחרים
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setConfirmAction({ type: 'bulk', action: 'delete', label: `מחק לצמיתות ${selected.size} קבצים נבחרים? פעולה זו אינה ניתנת לביטול.` })}
            >
              <Trash2 className="w-3.5 h-3.5" />
              מחק נבחרים לצמיתות
            </Button>
          </>
        )}
      </div>

      {/* Files List */}
      <div className="space-y-2">
        {trashedFiles.map(file => {
          const cat = FILE_CATEGORIES[file.file_category] || FILE_CATEGORIES.other;
          const isChecked = selected.has(file.id);
          const originalFolder = file.original_folder_id || file.folder_id;

          return (
            <div
              key={file.id}
              className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                isChecked ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              {/* Checkbox */}
              <button onClick={() => toggleSelect(file.id)} className="flex-shrink-0">
                {isChecked
                  ? <CheckSquare className="w-4 h-4 text-blue-600" />
                  : <Square className="w-4 h-4 text-slate-400" />
                }
              </button>

              {/* Icon */}
              <span className="text-xl flex-shrink-0">{cat.emoji}</span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate text-sm">{file.title}</p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-0.5">
                  <span>{cat.label}</span>
                  <span>·</span>
                  <span>{getFileSizeDisplay(file.file_size_bytes)}</span>
                  {file.deleted_at && (
                    <>
                      <span>·</span>
                      <span>נמחק: {new Date(file.deleted_at).toLocaleDateString('he-IL')}</span>
                    </>
                  )}
                  {originalFolder !== undefined && (
                    <>
                      <span>·</span>
                      <span>מיקום מקורי: {getFolderName(originalFolder)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setConfirmAction({ type: 'single', fileId: file.id, action: 'restore', label: `לשחזר את "${file.title}"?` })}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="שחזר"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmAction({ type: 'single', fileId: file.id, action: 'delete', label: `למחוק לצמיתות את "${file.title}"? פעולה זו אינה ניתנת לביטול.` })}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="מחק לצמיתות"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              אישור פעולה
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-700 leading-relaxed">{confirmAction?.label}</p>
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>ביטול</Button>
            <Button
              onClick={handleConfirm}
              className={confirmAction?.action === 'delete'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            >
              {confirmAction?.action === 'delete' ? 'מחק לצמיתות' : 'שחזר'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}