import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Upload, Search, Folder, File, ChevronRight, Home } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Documents() {
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: folders = [] } = useQuery({
    queryKey: ['folders', currentFolderId],
    queryFn: async () => {
      const all = await base44.entities.DocumentFolder.list();
      return all.filter(f => {
        if (currentFolderId === null) {
          return !f.parent_folder_id;
        }
        return f.parent_folder_id === currentFolderId;
      });
    },
  });

  const { data: files = [] } = useQuery({
    queryKey: ['files', currentFolderId],
    queryFn: async () => {
      const all = await base44.entities.DocumentFile.list();
      return all.filter(f => {
        if (currentFolderId === null) {
          return !f.folder_id;
        }
        return f.folder_id === currentFolderId;
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

  const deleteFolderMutation = useMutation({
    mutationFn: (id) => base44.entities.DocumentFolder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', currentFolderId] });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id) => base44.entities.DocumentFile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
    },
  });

  const filteredFolders = useMemo(() => {
    if (!searchQuery) return folders;
    return folders.filter(f => f.name.includes(searchQuery));
  }, [folders, searchQuery]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    return files.filter(f => f.title.includes(searchQuery));
  }, [files, searchQuery]);

  const currentFolder = currentFolderId 
    ? breadcrumbs[breadcrumbs.length - 1]
    : null;

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolderMutation.mutateAsync(newFolderName);
    }
  };

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="bg-gradient-to-l from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">מסמכים</h1>
          <p className="text-blue-100 text-sm">ניהול קבצים וקבצי אחסון</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button
            onClick={() => setShowNewFolderDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Folder className="w-4 h-4" />
            תיקייה חדשה
          </Button>

          <Button
            onClick={() => setShowUploadDialog(true)}
            variant="outline"
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            העלאת קובץ
          </Button>

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
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
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
        <div className="flex-1 overflow-auto bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Folder className="w-16 h-16 mb-4 opacity-20" />
              <p>אין קבצים או תיקיות</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Folders */}
              {filteredFolders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <Folder className="w-8 h-8 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{folder.name}</p>
                    <p className="text-xs text-slate-500">{folder.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                </div>
              ))}

              {/* Files */}
              {filteredFiles.map(file => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <File className="w-8 h-8 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{file.title}</p>
                    <p className="text-xs text-slate-500">{file.original_file_name}</p>
                  </div>
                  <button
                    onClick={() => deleteFileMutation.mutate(file.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 text-xs"
                  >
                    מחק
                  </button>
                </div>
              ))}
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
              >
                צור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>העלאת קובץ</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-lg">
            <p className="text-slate-500">עדיין לא מיושם</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}