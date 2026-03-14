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
  TableRow } from
"@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageCircle, Phone, Edit2, Trash2, Tag } from 'lucide-react';
import SupplierFormDialog from '@/components/suppliers/SupplierFormDialog';
import CategoryManagementDialog from '@/components/suppliers/CategoryManagementDialog';
import WhatsAppDialog from '@/components/whatsapp/WhatsAppDialog';
import { useAlert } from '@/components/notifications/AlertContext';

export default function SupplierManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [selectedSupplierForWhatsapp, setSelectedSupplierForWhatsapp] = useState(null);
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: categories = {} } = useQuery({
    queryKey: ['supplier-categories'],
    queryFn: async () => {
      const cats = await base44.entities.SupplierCategory.list();
      return Object.fromEntries(cats.map((c) => [c.id, c]));
    }
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
    return suppliers.filter((s) =>
    s.company_name?.toLowerCase().includes(query) ||
    categories[s.category_id]?.name?.toLowerCase().includes(query) ||
    s.contact_person_name?.toLowerCase().includes(query) ||
    s.company_phone?.toLowerCase().includes(query) ||
    s.contact_mobile_whatsapp?.toLowerCase().includes(query) ||
    s.email?.toLowerCase().includes(query) ||
    s.business_description?.toLowerCase().includes(query)
    );
  }, [suppliers, searchQuery, categories]);

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

  const handleWhatsApp = (supplier) => {
    setSelectedSupplierForWhatsapp(supplier);
    setWhatsappDialogOpen(true);
  };

  const handleCall = (phone) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">ספקים</h1>
            <p className="text-slate-600 text-sm mt-1">ניהול בסיס הנתונים של ספקים ושירותים</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCategoryDialogOpen(true)}
              className="h-10 bg-slate-600 hover:bg-slate-700 text-white gap-2">

              <Tag className="w-5 h-5" />
              הוסף תחום עיסוק
            </Button>
            <Button
              onClick={handleNewSupplier}
              className="h-10 bg-blue-600 hover:bg-blue-700 text-white gap-2">

              <Plus className="w-5 h-5" />
              ספק חדש
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="חפש לפי שם חברה, קטגוריה, איש קשר, טלפון, נייד, אימייל או תיאור..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 text-right"
            dir="rtl" />

        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {loadingSuppliers ?
          <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full"></div>
            </div> :
          filteredSuppliers.length === 0 ?
          <div className="flex items-center justify-center h-64 text-slate-500">
              {suppliers.length === 0 ? 'אין ספקים בעדיין' : 'לא נמצאו ספקים תואמים לחיפוש'}
            </div> :

          <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-28">שם החברה</TableHead>
                    <TableHead className="text-right w-20">קטגוריה</TableHead>
                    <TableHead className="text-right w-24">איש קשר</TableHead>
                    <TableHead className="text-right w-20">טלפון נייד</TableHead>
                    <TableHead className="text-right w-20">טלפון חברה</TableHead>
                    <TableHead className="text-right w-24">אימייל</TableHead>
                    <TableHead className="bg-white text-muted-foreground px-10 font-medium text-left h-10 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] w-28 sticky left-0 border-l border-slate-200 z-10">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) =>
                <TableRow key={supplier.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-right text-sm">{supplier.company_name}</TableCell>
                      <TableCell className="text-right text-sm">
                        {categories[supplier.category_id]?.name ?
                    <Badge variant="outline" className="text-xs">{categories[supplier.category_id].name}</Badge> :

                    <span className="text-slate-400">-</span>
                    }
                      </TableCell>
                      <TableCell className="text-right text-sm">{supplier.contact_person_name || '-'}</TableCell>
                      <TableCell className="text-right text-sm text-blue-600">
                        {supplier.contact_mobile_whatsapp ?
                    <span className="cursor-pointer hover:underline">{supplier.contact_mobile_whatsapp}</span> :
                    '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm">{supplier.company_phone || '-'}</TableCell>
                      <TableCell className="text-right text-sm text-slate-600 truncate">{supplier.email || '-'}</TableCell>
                      <TableCell className="text-right text-sm sticky left-0 bg-white border-l border-slate-200 z-10">
                        <div className="flex gap-1 justify-end">
                          {supplier.contact_mobile_whatsapp &&
                      <button
                        onClick={() => handleWhatsApp(supplier)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                        title="וואטסאפ">

                              <MessageCircle className="w-4 h-4" />
                            </button>
                      }
                          {supplier.company_phone &&
                      <button
                        onClick={() => handleCall(supplier.company_phone)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                        title="התקשר">

                              <Phone className="w-4 h-4" />
                            </button>
                      }
                          <button
                        onClick={() => handleEdit(supplier)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition"
                        title="ערוך">

                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                        onClick={() => handleDelete(supplier.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                        title="מחק">

                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                )}
                </TableBody>
              </Table>
            </div>
          }
        </div>

        {/* Dialogs */}
        <SupplierFormDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingSupplier(null);
          }}
          supplier={editingSupplier}
          onSave={handleSave} />

        <CategoryManagementDialog
          isOpen={isCategoryDialogOpen}
          onClose={() => setIsCategoryDialogOpen(false)} />

        <WhatsAppDialog
          open={whatsappDialogOpen}
          onClose={() => {
            setWhatsappDialogOpen(false);
            setSelectedSupplierForWhatsapp(null);
          }}
          record={selectedSupplierForWhatsapp ? {
            id: selectedSupplierForWhatsapp.id,
            phonePrimary: selectedSupplierForWhatsapp.contact_mobile_whatsapp,
            ownerName: selectedSupplierForWhatsapp.contact_person_name,
            apartmentNumber: selectedSupplierForWhatsapp.company_name,
            totalDebt: 0,
            monthlyDebt: 0,
            specialDebt: 0
          } : null} />

      </div>
    </div>);

}