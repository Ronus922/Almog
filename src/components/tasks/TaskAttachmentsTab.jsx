import React, { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, Download, Trash2, FileText, Image, File, Paperclip } from "lucide-react";
import { format } from "date-fns";

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ fileType }) {
  if (!fileType) return <File className="w-4 h-4 text-slate-400" />;
  if (fileType.startsWith("image/")) return <Image className="w-4 h-4 text-blue-400" />;
  if (fileType.includes("pdf")) return <FileText className="w-4 h-4 text-red-400" />;
  return <FileText className="w-4 h-4 text-slate-400" />;
}

export default function TaskAttachmentsTab({ taskId, currentUser, canEdit }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["taskAttachments", taskId],
    queryFn: () =>
      base44.entities.TaskAttachment.filter({ task_id: taskId, is_deleted: false }, "-uploaded_at"),
    enabled: !!taskId,
  });

  const uploaderDisplayName = () => {
    if (!currentUser) return "";
    if (currentUser.email === "r@bios.co.il") return "רונן משולם";
    return currentUser.first_name
      ? `${currentUser.first_name}${currentUser.last_name ? " " + currentUser.last_name : ""}`
      : currentUser.username || "";
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    let hasError = false;

    for (const file of Array.from(files)) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.TaskAttachment.create({
          task_id: taskId,
          file_name: file.name,
          file_url,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: currentUser?.username || currentUser?.email || "",
          uploaded_by_name: uploaderDisplayName(),
          uploaded_at: new Date().toISOString(),
          is_deleted: false,
        });
        // audit log
        await base44.entities.TaskAuditLog.create({
          task_id: taskId,
          action: "attachment_added",
          changed_by_username: currentUser?.username || "",
          changed_by_name: uploaderDisplayName(),
          changes: JSON.stringify({ file_name: file.name }),
        });
      } catch (e) {
        hasError = true;
        setUploadError(`שגיאה בהעלאת "${file.name}"`);
      }
    }

    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["taskAttachments", taskId] });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (attachment) => {
    if (!window.confirm(`למחוק את הקובץ "${attachment.file_name}"?`)) return;
    await base44.entities.TaskAttachment.update(attachment.id, { is_deleted: true });
    await base44.entities.TaskAuditLog.create({
      task_id: taskId,
      action: "attachment_deleted",
      changed_by_username: currentUser?.username || "",
      changed_by_name: uploaderDisplayName(),
      changes: JSON.stringify({ file_name: attachment.file_name }),
    });
    queryClient.invalidateQueries({ queryKey: ["taskAttachments", taskId] });
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canEdit) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4 px-6 pb-4 pt-2" dir="rtl">
      {/* Upload area */}
      {canEdit && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer
            ${isDragging
              ? "border-blue-400 bg-blue-50"
              : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40"
            }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? "text-blue-500" : "text-slate-300"}`} />
          <p className="text-sm font-medium text-slate-600">
            גרור קבצים לכאן או <span className="text-blue-600 underline">לחץ לבחירה</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">מסמכים, תמונות, קבצי PDF ועוד</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-3 rounded-lg">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          מעלה קבצים...
        </div>
      )}

      {uploadError && (
        <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200">
          {uploadError}
        </div>
      )}

      {/* Files list */}
      {isLoading ? (
        <div className="py-6 text-center text-slate-400 text-sm">טוען קבצים...</div>
      ) : attachments.length === 0 ? (
        <div className="py-8 text-center text-slate-400">
          <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">אין קבצים מצורפים עדיין</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">קבצים מצורפים ({attachments.length})</p>
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-200 transition-colors"
            >
              {/* thumbnail for images */}
              {att.file_type?.startsWith("image/") ? (
                <img
                  src={att.file_url}
                  alt={att.file_name}
                  className="w-10 h-10 rounded object-cover border border-slate-100 flex-shrink-0"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <FileIcon fileType={att.file_type} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{att.file_name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {att.uploaded_by_name || att.uploaded_by}
                  {att.uploaded_at && ` · ${format(new Date(att.uploaded_at), "dd/MM/yyyy HH:mm")}`}
                  {att.file_size ? ` · ${formatBytes(att.file_size)}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <a
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={att.file_name}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="הורד"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-4 h-4" />
                </a>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(att)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="מחק"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}