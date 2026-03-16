import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Download, Trash2, Eye, Loader2 } from 'lucide-react';
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

export default function TaskAttachmentsManager({ taskId, taskType }) {
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: attachments = [] } = useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: () => base44.entities.TaskAttachment.filter({ task_id: taskId }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      setUploadProgress(true);
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      return base44.entities.TaskAttachment.create({
        task_id: taskId,
        file_url: uploadResult.file_url,
        file_name: file.name,
        file_display_name: file.name.split('.')[0],
        file_type: file.type,
        file_size_bytes: file.size,
        uploaded_by_username: 'system',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
      setUploadProgress(false);
      toast.success('הקובץ הועלה בהצלחה');
      fileInputRef.current.value = '';
    },
    onError: (e) => {
      setUploadProgress(false);
      toast.error('שגיאה בהעלאה: ' + e.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId) => base44.entities.TaskAttachment.delete(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
      toast.success('הקובץ נמחק');
    },
  });

  const handleDownload = (attachment) => {
    const link = document.createElement('a');
    link.href = attachment.file_url;
    link.download = attachment.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-slate-900">צרופות ({attachments.length})</h4>
        <Button
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadProgress}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs"
        >
          {uploadProgress ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              מעלה...
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" />
              הוסף קובץ
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadMutation.mutate(file);
          }}
          className="hidden"
        />
      </div>

      {attachments.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-4">אין צרופות עדיין</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => {
            const cat = FILE_CATEGORIES[getFileCategory(att.file_type)] || FILE_CATEGORIES.other;
            return (
              <div key={att.id} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 text-sm hover:bg-slate-50 transition-colors">
                <span className="text-lg">{cat.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{att.file_display_name}</p>
                  <p className="text-xs text-slate-500">{getFileSizeDisplay(att.file_size_bytes)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownload(att)}
                    className="p-1 text-slate-500 hover:text-slate-900 rounded transition-colors"
                    title="הורד"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(att.id)}
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
    </div>
  );
}