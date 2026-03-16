import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Download, Trash2, FolderOpen, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const FILE_CATEGORIES = {
  image: { emoji: '🖼️', label: 'תמונה' },
  pdf: { emoji: '📄', label: 'PDF' },
  document: { emoji: '📝', label: 'מסמך' },
  spreadsheet: { emoji: '📊', label: 'גיליון חישוב' },
  other: { emoji: '📎', label: 'אחר' },
};

function getFileCategory(mimeType) {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('sheet') || mimeType.includes('spreadsheet')) return 'spreadsheet';
  return 'other';
}

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

export default function ContactDocumentsTab({ contact }) {
  const [uploadProgress, setUploadProgress] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // בדיקה אם יש תיקייה עבור הקשר
  const { data: folders = [] } = useQuery({
    queryKey: ['contact-folders', contact?.id],
    queryFn: async () => {
      if (!contact?.id) return [];
      const allFolders = await base44.entities.DocumentFolder.list();
      // חיפוש תיקייה בשם הקשר או דירה
      return allFolders.filter(f =>
        !f.parent_folder_id && (f.name.includes(contact.apartment_number) || f.name.includes(contact.owner_name))
      );
    },
  });

  const { data: files = [] } = useQuery({
    queryKey: ['contact-files', contact?.id],
    queryFn: async () => {
      if (!folders.length) return [];
      // קבל את כל הקבצים בתיקייה של הקשר
      const allFiles = await base44.entities.DocumentFile.list();
      return allFiles.filter(f => folders.some(folder => f.folder_id === folder.id) && !f.is_deleted);
    },
  });

  // אם אין תיקייה, יוצרים אחת
  const createFolderMutation = useMutation({
    mutationFn: () =>
      base44.entities.DocumentFolder.create({
        name: `${contact.apartment_number} - ${contact.owner_name || 'דייר'}`,
        visibility_mode: 'all_users',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-folders', contact?.id] });
      toast.success('תיקייה חדשה נוצרה');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      setUploadProgress(true);
      
      // ודא שיש תיקייה
      let folderId = folders[0]?.id;
      if (!folderId) {
        const newFolder = await createFolderMutation.mutateAsync();
        folderId = newFolder.id;
      }

      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      return base44.entities.DocumentFile.create({
        folder_id: folderId,
        title: file.name.split('.')[0],
        original_file_name: file.name,
        file_url: uploadResult.file_url,
        file_extension: file.name.split('.').pop(),
        mime_type: file.type,
        file_size_bytes: file.size,
        file_category: getFileCategory(file.type),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-files', contact?.id] });
      setUploadProgress(false);
      setShowUploadDialog(false);
      toast.success('הקובץ הועלה בהצלחה');
      fileInputRef.current.value = '';
    },
    onError: (e) => {
      setUploadProgress(false);
      toast.error('שגיאה בהעלאה: ' + e.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (fileId) =>
      base44.entities.DocumentFile.update(fileId, {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-files', contact?.id] });
      toast.success('הקובץ נמחק');
    },
  });

  const handleDownload = (file) => {
    const link = document.createElement('a');
    link.href = file.file_url;
    link.download = file.original_file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-blue-600" />
          מסמכים ותיקיות
        </h3>
        <Button
          onClick={() => setShowUploadDialog(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          הוסף קובץ
        </Button>
      </div>

      {files.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-3">אין מסמכים עדיין</p>
          <Button
            onClick={() => setShowUploadDialog(true)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            העלה קובץ ראשון
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => {
            const cat = FILE_CATEGORIES[file.file_category] || FILE_CATEGORIES.other;
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <span className="text-2xl">{cat.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate text-sm">{file.title}</p>
                  <p className="text-xs text-slate-500">
                    {getFileSizeDisplay(file.file_size_bytes)} · {new Date(file.created_date).toLocaleDateString('he-IL')}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-1 text-slate-500 hover:text-slate-900 rounded transition-colors"
                    title="הורד"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(file.id)}
                    className="p-1 text-red-500 hover:text-red-700 rounded transition-colors"
                    title="מחק"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>העלאת קובץ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900">לחץ להעלאת קובץ</p>
              <p className="text-xs text-slate-500 mt-1">או גרור קובץ לכאן</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
              }}
              className="hidden"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>ביטול</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}