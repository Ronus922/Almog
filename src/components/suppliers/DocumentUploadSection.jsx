import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, Trash2, Edit2, X } from 'lucide-react';

export default function DocumentUploadSection({ supplierId }) {
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingDocId, setEditingDocId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['supplier-documents', supplierId],
    queryFn: () => base44.entities.SupplierDocument.filter({ supplier_id: supplierId }),
    enabled: !!supplierId,
  });

  const createDocMutation = useMutation({
    mutationFn: (data) => base44.entities.SupplierDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-documents', supplierId] });
      setIsUploading(false);
    },
  });

  const updateDocMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupplierDocument.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-documents', supplierId] });
      setEditingDocId(null);
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id) => base44.entities.SupplierDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-documents', supplierId] });
    },
  });

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    setIsUploading(true);
    const displayName = prompt('הזן שם לקובץ:', file.name.split('.')[0]);

    if (!displayName) {
      setIsUploading(false);
      return;
    }

    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      await createDocMutation.mutateAsync({
        supplier_id: supplierId,
        file_url: uploadRes.file_url,
        original_file_name: file.name,
        display_name: displayName.trim(),
      });
    } catch (err) {
      alert('שגיאה בהעלאת קובץ: ' + err.message);
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleEditSave = (docId) => {
    if (editingName.trim()) {
      updateDocMutation.mutate({
        id: docId,
        data: { display_name: editingName.trim() },
      });
    }
  };

  const startEdit = (doc) => {
    setEditingDocId(doc.id);
    setEditingName(doc.display_name);
  };

  return (
    <div className="space-y-4">
      {/* Drag and Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        <p className="text-sm text-slate-600 mb-2">גרור קובץ כאן או לחץ להעלאה</p>
        <input
          type="file"
          onChange={handleFileInputChange}
          disabled={isUploading}
          className="hidden"
          id="file-input"
        />
        <label htmlFor="file-input">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            className="cursor-pointer"
            onClick={() => document.getElementById('file-input').click()}
          >
            {isUploading ? 'מעלה...' : 'בחר קובץ'}
          </Button>
        </label>
      </div>

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">מסמכים</Label>
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition"
            >
              <div className="flex-1 text-right">
                {editingDocId === doc.id ? (
                  <div className="flex gap-2 flex-row-reverse">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-8 text-sm flex-1"
                      dir="rtl"
                    />
                    <Button
                      size="icon"
                      type="button"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => handleEditSave(doc.id)}
                    >
                      ✓
                    </Button>
                    <Button
                      size="icon"
                      type="button"
                      variant="ghost"
                      className="h-8 w-8 text-slate-500"
                      onClick={() => setEditingDocId(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-slate-900">{doc.display_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">({doc.original_file_name})</p>
                  </div>
                )}
              </div>

              {editingDocId !== doc.id && (
                <div className="flex gap-1 flex-row-reverse ml-3">
                  <a
                    href={doc.file_url}
                    download
                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition"
                    title="הורד"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => startEdit(doc)}
                    className="p-1.5 text-slate-600 hover:bg-slate-200 rounded transition"
                    title="שנה שם"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('הסר מסמך זה?')) {
                        deleteDocMutation.mutate(doc.id);
                      }
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-100 rounded transition"
                    title="מחק"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}