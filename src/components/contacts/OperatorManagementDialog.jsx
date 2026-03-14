import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, Pencil, Trash2, X } from 'lucide-react';
import { useAlert } from '@/components/notifications/AlertContext';

export default function OperatorManagementDialog({ open, onClose }) {
  const [newOperatorName, setNewOperatorName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    email: ''
  });
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();

  const { data: operators = [] } = useQuery({
    queryKey: ['operators'],
    queryFn: () => base44.entities.Operator.list(),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
  });

  const createMutation = useMutation({
    mutationFn: (name) => base44.entities.Operator.create({ 
      company_name: name, 
      is_active: true 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] });
      setNewOperatorName('');
      showAlert({
        message: 'מפעיל נוסף בהצלחה',
        type: 'success'
      });
    },
    onError: (error) => {
      showAlert({
        message: 'שגיאה בהוספת מפעיל',
        type: 'error'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Operator.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] });
      setEditingId(null);
      setEditingData({ company_name: '', contact_name: '', phone: '', email: '' });
      showAlert({
        message: 'מפעיל עודכן בהצלחה',
        type: 'success'
      });
    },
    onError: (error) => {
      showAlert({
        message: 'שגיאה בעדכון מפעיל',
        type: 'error'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Operator.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] });
      showAlert({
        message: 'מפעיל הוסר בהצלחה',
        type: 'success'
      });
    },
    onError: (error) => {
      showAlert({
        message: 'שגיאה בהסרת מפעיל',
        type: 'error'
      });
    }
  });

  const operatorUsage = useMemo(() => {
    const usage = {};
    operators.forEach(op => {
      usage[op.id] = contacts.filter(c => c.operator_id === op.id).length;
    });
    return usage;
  }, [operators, contacts]);

  const handleAddOperator = () => {
    const trimmed = newOperatorName.trim();
    if (!trimmed) {
      showAlert({
        message: 'שם מפעיל לא יכול להיות ריק',
        type: 'error'
      });
      return;
    }

    const exists = operators.some(o => o.company_name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showAlert({
        message: 'מפעיל בשם זה כבר קיים',
        type: 'error'
      });
      return;
    }

    createMutation.mutate(trimmed);
  };

  const handleStartEdit = (operator) => {
    setEditingId(operator.id);
    setEditingData({
      company_name: operator.company_name,
      contact_name: operator.contact_name || '',
      phone: operator.phone || '',
      email: operator.email || ''
    });
  };

  const handleSaveEdit = () => {
    const trimmed = editingData.company_name.trim();
    if (!trimmed) {
      showAlert({
        message: 'שם מפעיל לא יכול להיות ריק',
        type: 'error'
      });
      return;
    }

    const exists = operators.some(o => o.id !== editingId && o.company_name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showAlert({
        message: 'מפעיל בשם זה כבר קיים',
        type: 'error'
      });
      return;
    }

    updateMutation.mutate({ id: editingId, data: editingData });
  };

  const handleDeleteOperator = (operator) => {
    if (operatorUsage[operator.id] > 0) {
      showAlert({
        message: `לא ניתן למחוק מפעיל שנמצא בשימוש (${operatorUsage[operator.id]} דירות)`,
        type: 'error'
      });
      return;
    }

    if (window.confirm('האם אתה בטוח שברצונך למחוק מפעיל זה?')) {
      deleteMutation.mutate(operator.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
            <Building2 className="w-5 h-5 text-white" />
            <DialogTitle className="text-white text-lg font-bold">ניהול מפעילים</DialogTitle>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          {/* Add New Operator */}
          <div className="mb-4 pb-4 border-b border-slate-200">
            <div className="flex gap-2">
              <Input
                placeholder="שם מפעיל חדש..."
                value={newOperatorName}
                onChange={(e) => setNewOperatorName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddOperator();
                  }
                }}
                className="h-8 text-right text-sm flex-1"
                dir="rtl"
              />
              <Button
                onClick={handleAddOperator}
                disabled={!newOperatorName.trim() || createMutation.isPending}
                size="sm"
                className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Operators List */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {operators.length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-8">אין מפעילים עדיין</div>
            ) : (
              operators.map((operator) => (
                <div
                  key={operator.id}
                  className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition group"
                >
                  {editingId === operator.id ? (
                    <div className="flex-1 flex flex-col gap-2">
                      <Input
                        autoFocus
                        value={editingData.company_name}
                        onChange={(e) => setEditingData({ ...editingData, company_name: e.target.value })}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit();
                          }
                        }}
                        placeholder="שם מפעיל"
                        className="h-7 text-right text-sm"
                        dir="rtl"
                      />
                      <Input
                        value={editingData.contact_name}
                        onChange={(e) => setEditingData({ ...editingData, contact_name: e.target.value })}
                        placeholder="שם איש קשר"
                        className="h-7 text-right text-sm"
                        dir="rtl"
                      />
                      <Input
                        value={editingData.phone}
                        onChange={(e) => setEditingData({ ...editingData, phone: e.target.value })}
                        placeholder="טלפון"
                        className="h-7 text-right text-sm"
                        dir="ltr"
                      />
                      <Input
                        value={editingData.email}
                        onChange={(e) => setEditingData({ ...editingData, email: e.target.value })}
                        placeholder="אימייל"
                        type="email"
                        className="h-7 text-right text-sm"
                        dir="ltr"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveEdit}
                          disabled={updateMutation.isPending}
                          size="sm"
                          className="h-7 px-2 text-xs flex-1"
                        >
                          שמור
                        </Button>
                        <Button
                          onClick={() => setEditingId(null)}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs flex-1"
                        >
                          ביטול
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-right flex-1">
                        <div className="text-sm font-medium text-slate-900">{operator.company_name}</div>
                        {operator.contact_name && (
                          <div className="text-xs text-slate-500 mt-0.5">{operator.contact_name}</div>
                        )}
                        {operator.phone && (
                          <div className="text-xs text-slate-500">{operator.phone}</div>
                        )}
                        {operatorUsage[operator.id] > 0 && (
                          <div className="text-xs text-blue-600 mt-1 font-medium">
                            {operatorUsage[operator.id]} דירות
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleStartEdit(operator)}
                          className="p-1.5 text-slate-600 hover:bg-slate-200 rounded transition"
                          title="ערוך"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteOperator(operator)}
                          disabled={deleteMutation.isPending || operatorUsage[operator.id] > 0}
                          className={`p-1.5 rounded transition ${
                            operatorUsage[operator.id] > 0
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={operatorUsage[operator.id] > 0 ? 'לא ניתן למחוק' : 'מחק'}
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