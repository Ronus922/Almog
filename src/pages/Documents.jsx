import React, { useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Upload, Search, Folder, File, ChevronRight, Home, MoreVertical,
  Download, Trash2, Edit2, FolderOpen, AlertCircle, CheckCircle, RotateCcw,
  X, Eye, ArrowRight
} from 'lucide-react';

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

function getFileCategory(mimeType) {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('sheet') || mimeType.includes('spreadsheet')) return 'spreadsheet';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('rar')) return 'archive';
  if (mimeType.startsWith('text/')) return 'document';
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

export default function Documents() {
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renamingFolderName, setRenamingFolderName] = useState('');
  const [renamingFileId, setRenamingFileId] = useState(null);
  const [renamingFileName, setRenamingFileName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterType, setFilterType] = useState('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [showTrash, setShowTrash] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // ============== QUERIES ==============

  const { data: folders = [] } = useQuery({
    queryKey: ['folders', currentFolderId],
    queryFn: async () => {
      const all = await base44.entities.DocumentFolder.list();
      return all.filter(f => {
        if (showTrash) return f.is_deleted;
        if (currentFolderId === null) {
          return !f.parent_folder_id && !f.is_deleted;
        }
        return f.parent_folder_id === currentFolderId && !f.is_deleted;
      });
    },
  });

  const { data: files = [] } = useQuery({
    queryKey: ['files', currentFolderId],
    queryFn: async () => {
      const all = await base44.entities.DocumentFile.list();
      return all.filter(f => {
        if (showTrash) return f.is_deleted;
        if (currentFolderId === null) {
          return !f.folder_id && !f.is_deleted;
        }
        return f.folder_id === currentFolderId && !f.is_deleted;
      });
    },
  });

  const { data: breadcrumbs = [] } = useQuery({
    queryKey: ['breadcrumbs', currentFolderId],
    queryFn: async () => {
      if (!currentFolderId) return [];
      const crumbs = [];
      let folderId = currentFolderId;

      while (folderId) {
        const folder = await base44.entities.DocumentFolder.get(folderId);
        crumbs.unshift({ id: folderId, name: folder.name });
        folderId = folder.parent_folder_id;
      }

      return crumbs;
    },
  });

  // ============== MUTATIONS ==============

  const createFolderMutation = useMutation({
    mutationFn: (name) =>
      base44.entities.DocumentFolder.create({
        name,
        parent_folder_id: currentFolderId || null,
        visibility_mode: 'all_users',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', currentFolderId] });
      setShowNewFolderDialog(false);
      setNewFolderName('');
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: ({ folderId, newName }) =>
      base44.entities.DocumentFolder.update(folderId, { name: newName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', currentFolderId] });
      setRenamingFolderId(null);
      setRenamingFolderName('');
    },
  });

  const renameFileMutation = useMutation({
    mutationFn: ({ fileId, newTitle }) =>
      base44.entities.DocumentFile.update(fileId, { title: newTitle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
      setRenamingFileId(null);
      setRenamingFileName('');
    },
  });

  const softDeleteFolderMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.DocumentFolder.update(id, { 
        is_deleted: true,
        deleted_at: new Date().toISOString()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', currentFolderId] });
    },
  });

  const softDeleteFileMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.DocumentFile.update(id, { 
        is_deleted: true,
        deleted_at: new Date().toISOString()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
    },
  });

  const restoreFolderMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.DocumentFolder.update(id, { 
        is_deleted: false,
        deleted_at: null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', currentFolderId] });
    },
  });

  const restoreFileMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.DocumentFile.update(id, { 
        is_deleted: false,
        deleted_at: null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
    },
  });

  const moveFileMutation = useMutation({
    mutationFn: ({ fileId, newFolderId }) =>
      base44.entities.DocumentFile.update(fileId, { folder_id: newFolderId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (filesList) => {
      const results = [];
      const errors = [];

      for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i];
        setUploadProgress({ current: i + 1, total: filesList.length, fileName: file.name });

        try {
          const uploadResult = await base44.integrations.Core.UploadFile({ file });
          const fileRecord = await base44.entities.DocumentFile.create({
            folder_id: currentFolderId || null,
            title: file.name.split('.')[0],
            original_file_name: file.name,
            file_url: uploadResult.file_url,
            storage_key: uploadResult.file_url,
            file_extension: file.name.split('.').pop(),
            mime_type: file.type,
            file_size_bytes: file.size,
            file_category: getFileCategory(file.type),
          });
          results.push(fileRecord);
        } catch (error) {
          errors.push({ fileName: file.name, error: error.message });
        }
      }

      return { results, errors };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
      setUploadProgress(null);
      setShowUploadDialog(false);
    },
  });

  // ============== FILTERING & SORTING ==============

  const filteredFolders = useMemo(() => {
    let result = folders;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q));
    }

    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'he'));
    }

    return result;
  }, [folders, searchQuery, sortBy]);

  const filteredFiles = useMemo(() => {
    let result = files;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.original_file_name.toLowerCase().includes(q)
      );
    }

    if (filterType !== 'all') {
      result = result.filter(f => f.file_category === filterType);
    }

    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title, 'he'));
    } else if (sortBy === 'size') {
      result = [...result].sort((a, b) => (a.file_size_bytes || 0) - (b.file_size_bytes || 0));
    } else if (sortBy === 'date') {
      result = [...result].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }

    return result;
  }, [files, searchQuery, sortBy, filterType]);

  // ============== HANDLERS ==============

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolderMutation.mutateAsync(newFolderName);
    }
  };

  const handleRenameFolder = async (folderId) => {
    if (renamingFolderName.trim()) {
      await renameFolderMutation.mutateAsync({ folderId, newName: renamingFolderName });
    }
  };

  const handleRenameFile = async (fileId) => {
    if (renamingFileName.trim()) {
      await renameFileMutation.mutateAsync({ fileId, newTitle: renamingFileName });
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFileMutation.mutate(files);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      uploadFileMutation.mutate(files);
    }
  };

  const handleDownload = (file) => {
    const link = document.createElement('a');
    link.href = file.file_url;
    link.download = file.original_file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ============== RENDER ==============

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="bg-gradient-to-l from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {showTrash ? '🗑️ קובץ זבל' : 'מסמכים'}
          </h1>
          <p className="text-blue-100 text-sm">
            {showTrash ? 'קבצים ותיקיות שנמחקו' : 'ניהול קבצים וקבצי אחסון מרכזיים'}
          </p>
        </div>

        {/* Controls */}
        {!showTrash && (
          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              onClick={() => setShowNewFolderDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Folder className="w-4 h-4" />
              תיקייה חדשה
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              העלאת קובץ
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
            />

            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="חיפוש בקבצים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                dir="rtl"
                className="pr-9 pl-3"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              dir="rtl"
              className="h-9 border border-slate-200 rounded-lg px-3 py-1 text-sm bg-white text-slate-900 font-medium"
            >
              <option value="name">שם</option>
              <option value="date">תאריך</option>
              <option value="size">גודל</option>
            </select>

            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              dir="rtl"
              className="h-9 border border-slate-200 rounded-lg px-3 py-1 text-sm bg-white text-slate-900 font-medium"
            >
              <option value="all">כל הסוגים</option>
              <option value="image">תמונות</option>
              <option value="pdf">PDF</option>
              <option value="document">מסמכים</option>
              <option value="spreadsheet">גיליונות חישוב</option>
              <option value="video">וידאו</option>
              <option value="audio">אודיו</option>
            </select>

            {/* Trash Button */}
            <Button
              onClick={() => setShowTrash(!showTrash)}
              variant={showTrash ? 'default' : 'outline'}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              קובץ זבל
            </Button>
          </div>
        )}

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && !showTrash && (
          <div className="flex items-center gap-2 mb-4 text-sm" dir="rtl">
            <button
              onClick={() => setCurrentFolderId(null)}
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              <Home className="w-4 h-4" />
              בית
            </button>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <button
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className="text-blue-600 hover:underline"
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div
          className={`flex-1 overflow-auto bg-white rounded-lg shadow-sm border border-slate-200 p-4 transition-colors ${
            dragActive ? 'bg-blue-50 border-blue-400' : ''
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <FolderOpen className="w-16 h-16 mb-4 opacity-20" />
              <p>{showTrash ? 'קובץ הזבל ריק' : 'אין קבצים או תיקיות'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Folders */}
              {filteredFolders.map(folder => (
                <div
                  key={folder.id}
                  className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <Folder className="w-8 h-8 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {renamingFolderId === folder.id ? (
                      <input
                        type="text"
                        value={renamingFolderName}
                        onChange={(e) => setRenamingFolderName(e.target.value)}
                        onBlur={() => handleRenameFolder(folder.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameFolder(folder.id);
                          if (e.key === 'Escape') setRenamingFolderId(null);
                        }}
                        dir="rtl"
                        className="w-full border border-blue-400 rounded px-2 py-1 text-sm font-medium"
                        autoFocus
                      />
                    ) : (
                      <>
                        <p
                          className="font-medium text-slate-900 truncate"
                          onClick={() => !showTrash && setCurrentFolderId(folder.id)}
                        >
                          {folder.name}
                        </p>
                        <p className="text-xs text-slate-500">{folder.description}</p>
                      </>
                    )}
                  </div>
                  {showTrash ? (
                    <button
                      onClick={() => restoreFolderMutation.mutate(folder.id)}
                      className="p-1 text-blue-600 hover:text-blue-700"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setRenamingFolderId(folder.id);
                          setRenamingFolderName(folder.name);
                        }}
                        className="p-1 text-slate-600 hover:text-slate-900"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`למחוק את התיקייה "${folder.name}"?`)) {
                            softDeleteFolderMutation.mutate(folder.id);
                          }
                        }}
                        className="p-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Files */}
              {filteredFiles.map(file => {
                const cat = FILE_CATEGORIES[file.file_category] || FILE_CATEGORIES.other;
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <span className="text-2xl">{cat.emoji}</span>
                    <div className="flex-1 min-w-0">
                      {renamingFileId === file.id ? (
                        <input
                          type="text"
                          value={renamingFileName}
                          onChange={(e) => setRenamingFileName(e.target.value)}
                          onBlur={() => handleRenameFile(file.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameFile(file.id);
                            if (e.key === 'Escape') setRenamingFileId(null);
                          }}
                          dir="rtl"
                          className="w-full border border-blue-400 rounded px-2 py-1 text-sm font-medium"
                          autoFocus
                        />
                      ) : (
                        <>
                          <p className="font-medium text-slate-900 truncate">{file.title}</p>
                          <p className="text-xs text-slate-500">
                            {getFileSizeDisplay(file.file_size_bytes)} • {file.original_file_name}
                          </p>
                        </>
                      )}
                    </div>
                    {showTrash ? (
                      <button
                        onClick={() => restoreFileMutation.mutate(file.id)}
                        className="p-1 text-blue-600 hover:text-blue-700"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="p-1 text-slate-600 hover:text-slate-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1 text-slate-600 hover:text-slate-900"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setRenamingFileId(file.id);
                            setRenamingFileName(file.title);
                          }}
                          className="p-1 text-slate-600 hover:text-slate-900"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`למחוק את הקובץ "${file.title}"?`)) {
                              softDeleteFileMutation.mutate(file.id);
                            }
                          }}
                          className="p-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>תיקייה חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="שם התיקייה"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              dir="rtl"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) {
                  handleCreateFolder();
                }
              }}
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowNewFolderDialog(false)}
              >
                ביטול
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                צור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">{previewFile.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Preview Section */}
              <div className="bg-slate-100 rounded-lg p-8 min-h-64 flex items-center justify-center">
                {previewFile.file_category === 'image' ? (
                  <img
                    src={previewFile.file_url}
                    alt={previewFile.title}
                    className="max-w-full max-h-96 rounded"
                  />
                ) : previewFile.file_category === 'pdf' ? (
                  <div className="text-center">
                    <p className="text-slate-600 mb-4">📄 PDF עדיין לא תומך בתצוגה מקדימה</p>
                    <Button
                      onClick={() => handleDownload(previewFile)}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      הורד
                    </Button>
                  </div>
                ) : previewFile.file_category === 'audio' ? (
                  <audio controls className="w-full">
                    <source src={previewFile.file_url} />
                  </audio>
                ) : previewFile.file_category === 'video' ? (
                  <video controls className="max-w-full max-h-96 rounded">
                    <source src={previewFile.file_url} />
                  </video>
                ) : (
                  <div className="text-center">
                    <p className="text-slate-600 mb-4">📄 לא ניתן להציג תצוגה מקדימה לסוג קובץ זה</p>
                    <Button
                      onClick={() => handleDownload(previewFile)}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      הורד
                    </Button>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">שם מקורי</p>
                  <p className="font-medium">{previewFile.original_file_name}</p>
                </div>
                <div>
                  <p className="text-slate-500">גודל</p>
                  <p className="font-medium">{getFileSizeDisplay(previewFile.file_size_bytes)}</p>
                </div>
                <div>
                  <p className="text-slate-500">סוג</p>
                  <p className="font-medium">{FILE_CATEGORIES[previewFile.file_category]?.label}</p>
                </div>
                <div>
                  <p className="text-slate-500">תאריך</p>
                  <p className="font-medium">
                    {new Date(previewFile.created_date).toLocaleDateString('he-IL')}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setPreviewFile(null)}
                >
                  סגור
                </Button>
                <Button
                  onClick={() => {
                    handleDownload(previewFile);
                    setPreviewFile(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <Download className="w-4 h-4" />
                  הורד
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}