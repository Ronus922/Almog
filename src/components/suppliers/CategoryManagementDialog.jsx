import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag, Plus, Pencil, Trash2, X } from 'lucide-react';
import { useAlert } from '@/components/notifications/AlertContext';

export default function CategoryManagementDialog({ isOpen, onClose }) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ['supplier-categories'],
    queryFn: () => base44.entities.SupplierCategory.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const createMutation = useMutation({
    mutationFn: (name) => base44.entities.SupplierCategory.create({ name, is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-categories'] });
      setNewCategoryName('');
      showAlert({
        message: 'קטגוריה נוספה בהצלחה',
        type: 'success'
      });
    },
    onError: (error) => {
      showAlert({
        message: 'שגיאה בהוספת קטגוריה',
        type: 'error'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }) => base44.entities.SupplierCategory.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-categories'] });
      setEditingId(null);
      setEditingName('');
      showAlert({
        message: 'קטגוריה עודכנה בהצלחה',
        type: 'success'
      });
    },
    onError: (error) => {
      showAlert({
        message: 'שגיאה בעדכון קטגוריה',
        type: 'error'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SupplierCategory.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-categories'] });
      showAlert({
        message: 'קטגוריה הוסרה בהצלחה',
        type: 'success'
      });
    },
    onError: (error) => {
      showAlert({
        message: 'שגיאה בהסרת קטגוריה',
        type: 'error'
      });
    }
  });

  const activeCats = useMemo(() => {
    return Array.isArray(categories) ? categories.filter(c => c.is_active) : [];
  }, [categories]);

  const categoryUsage = useMemo(() => {
    const usage = {};
    activeCats.forEach(cat => {
      usage[cat.id] = suppliers.filter(s => s.category_id === cat.id).length;
    });
    return usage;
  }, [activeCats, suppliers]);

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      showAlert({
        message: 'שם קטגוריה לא יכול להיות ריק',
        type: 'error'
      });
      return;
    }

    const exists = activeCats.some(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showAlert({
        message: 'קטגוריה זו כבר קיימת',
        type: 'error'
      });
      return;
    }

    createMutation.mutate(trimmed);
  };

  const handleStartEdit = (cat) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const handleSaveEdit = () => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      showAlert({
        message: 'שם קטגוריה לא יכול להיות ריק',
        type: 'error'
      });
      return;
    }

    const exists = activeCats.some(c => c.id !== editingId && c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showAlert({
        message: 'קטגוריה בשם זה כבר קיימת',
        type: 'error'
      });
      return;
    }

    updateMutation.mutate({ id: editingId, name: trimmed });
  };

  const handleDeleteCategory = (cat) => {
    if (categoryUsage[cat.id] > 0) {
      showAlert({
        message: `לא ניתן למחוק קטגוריה שנמצאת בשימוש (${categoryUsage[cat.id]} ספקים)`,
        type: 'error'
      });
      return;
    }

    if (window.confirm('האם אתה בטוח שברצונך למחוק קטגוריה זו?')) {
      deleteMutation.mutate(cat.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-background shadow-lg border overflow-hidden flex flex-col sm:rounded-lg p-0"
        style={{ maxWidth: "420px", maxHeight: "75vh", height: "auto", width: "100%" }}
        dir="rtl"
        aria-describedby={undefined}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 rounded-lg bg-white/20 hover:bg-white/40 p-1.5 focus:outline-none transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-5 h-5 text-white" />
            <DialogTitle className="text-white text-lg font-bold">ניהול קטגוריות</DialogTitle>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          {/* Add New Category */}
          <div className="mb-4 pb-4 border-b border-slate-200">
            <div className="flex gap-2">
              <Input
                placeholder="שם קטגוריה חדשה..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCategory();
                  }
                }}
                className="h-8 text-right text-sm flex-1"
                dir="rtl"
              />
              <Button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim() || createMutation.isPending}
                size="sm"
                className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Categories List */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {activeCats.length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-8">אין קטגוריות עדיין</div>
            ) : (
              activeCats.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition group"
                >
                  {editingId === cat.id ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit();
                          }
                        }}
                        className="h-7 text-right text-sm flex-1"
                        dir="rtl"
                      />
                      <Button
                        onClick={handleSaveEdit}
                        disabled={updateMutation.isPending}
                        size="sm"
                        className="h-7 px-2 text-xs"
                      >
                        שמור
                      </Button>
                      <Button
                        onClick={() => setEditingId(null)}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                      >
                        ביטול
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-900">{cat.name}</div>
                        {categoryUsage[cat.id] > 0 && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {categoryUsage[cat.id]} ספקים
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 text-slate-600 hover:bg-slate-200 rounded transition"
                          title="ערוך"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          disabled={deleteMutation.isPending || categoryUsage[cat.id] > 0}
                          className={`p-1.5 rounded transition ${
                            categoryUsage[cat.id] > 0
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={categoryUsage[cat.id] > 0 ? 'לא ניתן למחוק' : 'מחק'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 py-3 border-t border-slate-100 bg-white flex-shrink-0">
          <Button onClick={onClose} variant="outline" className="h-9">
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}