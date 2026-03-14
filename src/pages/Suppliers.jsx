import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageCircle, Phone, Edit2, Trash2 } from 'lucide-react';
import SupplierFormDialog from '@/components/suppliers/SupplierFormDialog';
import { useAlert } from '@/components/notifications/AlertContext';

export default function Suppliers() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      showAlert({
        message: 'ספק חדש נוסף בהצלחה',
        type: 'success'
      });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      showAlert({
        message: 'שגיאה בהוספת ספק: ' + error.message,
        type: 'error'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      showAlert({
        message: 'ספק עודכן בהצלחה',
        type: 'success'
      });
      setIsDialogOpen(false);
      setEditingSupplier(null);
    },
    onError: (error) => {
      showAlert({
        message: 'שגיאה בעדכון ספק: ' + error.message,
        type: 'error'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      showAlert({
        message: 'ספק הוסר בהצלחה',
        type: 'success'
      });
    },
    onError: (error) => {
      showAlert({
        message: 'שגיאה בהסרת ספק: ' + error.message,
        type: 'error'
      });
    }
  });

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    
    const query = searchQuery.toLowerCase();
    return suppliers.filter(s =>
      (s.supplier_name?.toLowerCase().includes(query)) ||
      (s.occupation_description?.toLowerCase().includes(query)) ||
      (s.contact_person_name?.toLowerCase().includes(query)) ||
      (s.phone?.toLowerCase().includes(query)) ||
      (s.whatsapp_phone?.toLowerCase().includes(query)) ||
      (s.email?.toLowerCase().includes(query))
    );
  }, [suppliers, searchQuery]);

  const handleSave = async (formData) => {
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('האם אתה בטוח שברצונך להסיר ספק זה?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewSupplier = () => {
    setEditingSupplier(null);
    setIsDialogOpen(true);
  };

  const handleWhatsApp = (phone) => {
    if (phone) {
      window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
    }
  };

  const handleCall = (phone) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const statusColor = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800';
  };

  const statusLabel = (status) => {
    return status === 'active' ? 'פעיל' : 'לא פעיל';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">ספקים</h1>
            <p className="text-slate-600 text-sm mt-1">ניהול רשימת הספקים והשירותים</p>
          </div>
          <Button
            onClick={handleNewSupplier}
            className="h-10 bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Plus className="w-5 h-5" />
            ספק חדש
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="חפש לפי שם ספק, תיאור עיסוק, שם איש קשר, טלפון או אימייל..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 text-right"
            dir="rtl"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full"></div>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-slate-500">
              {suppliers.length === 0 ? 'אין ספקים בעדיין' : 'לא נמצאו ספקים תואמים לחיפוש'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-32">שם ספק</TableHead>
                    <TableHead className="text-right w-40">תיאור עיסוק</TableHead>
                    <TableHead className="text-right w-24">איש קשר</TableHead>
                    <TableHead className="text-right w-24">טלפון</TableHead>
                    <TableHead className="text-right w-24">וואטסאפ</TableHead>
                    <TableHead className="text-right w-28">אימייל</TableHead>
                    <TableHead className="text-right w-20">סטטוס</TableHead>
                    <TableHead className="text-right w-32">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-right text-sm">{supplier.supplier_name}</TableCell>
                      <TableCell className="text-right text-sm text-slate-600 truncate">{supplier.occupation_description}</TableCell>
                      <TableCell className="text-right text-sm">{supplier.contact_person_name || '-'}</TableCell>
                      <TableCell className="text-right text-sm">
                        {supplier.phone ? (
                          <span className="text-blue-600 cursor-pointer hover:underline">{supplier.phone}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {supplier.whatsapp_phone ? (
                          <span className="text-green-600 cursor-pointer hover:underline">{supplier.whatsapp_phone}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm text-slate-600 truncate">{supplier.email || '-'}</TableCell>
                      <TableCell className="text-right text-sm">
                        <Badge className={statusColor(supplier.status)}>
                          {statusLabel(supplier.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <div className="flex gap-1 justify-end">
                          {supplier.whatsapp_phone && (
                            <button
                              onClick={() => handleWhatsApp(supplier.whatsapp_phone)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                              title="שלח הודעה בוואטסאפ"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                          {supplier.phone && (
                            <button
                              onClick={() => handleCall(supplier.phone)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                              title="התקשר"
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition"
                            title="ערוך"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(supplier.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                            title="הסר"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Dialog */}
        <SupplierFormDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingSupplier(null);
          }}
          supplier={editingSupplier}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}