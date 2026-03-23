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
import { tableStyles } from '@/components/tables/DataTableStyles';

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

  const { data: documents = [] } = useQuery({
    queryKey: ['supplier-documents'],
    queryFn: () => base44.entities.SupplierDocument.list()
  });

  const documentCounts = useMemo(() => {
    return documents.reduce((acc, doc) => {
      acc[doc.supplier_id] = (acc[doc.supplier_id] || 0) + 1;
      return acc;
    }, {});
  }, [documents]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-3 md:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ספקים</h1>
            <p className="text-slate-600 text-sm mt-1">ניהול בסיס הנתונים של ספקים ושירותים</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setIsCategoryDialogOpen(true)}
              className="h-10 bg-slate-600 hover:bg-slate-700 text-white gap-2">
              <Tag className="w-5 h-5" />
              <span className="hidden sm:inline">הוסף תחום עיסוק</span>
              <span className="sm:hidden">תחום</span>
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

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {loadingSuppliers ? (
            <div className="text-center py-10 text-slate-400">טוען...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-10 text-slate-400">{suppliers.length === 0 ? 'אין ספקים עדיין' : 'לא נמצאו ספקים'}</div>
          ) : filteredSuppliers.map(supplier => (
            <div key={supplier.id}
              onClick={() => handleEdit(supplier)}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-slate-800">{supplier.company_name}</p>
                  {categories[supplier.category_id]?.name && <Badge variant="outline" className="text-xs mt-1">{categories[supplier.category_id].name}</Badge>}
                </div>
                <div className="flex gap-1">
                  {supplier.contact_mobile_whatsapp && <button onClick={(e) => { e.stopPropagation(); handleWhatsApp(supplier); }} className={`${tableStyles.actionButton} ${tableStyles.actionButtonGreen}`}><MessageCircle className="w-4 h-4" /></button>}
                  {supplier.company_phone && <button onClick={(e) => { e.stopPropagation(); handleCall(supplier.company_phone); }} className={`${tableStyles.actionButton} ${tableStyles.actionButtonBlue}`}><Phone className="w-4 h-4" /></button>}
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(supplier.id); }} className={`${tableStyles.actionButton} ${tableStyles.actionButtonRed}`}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {supplier.contact_person_name && <p className="text-sm text-slate-600">איש קשר: {supplier.contact_person_name}</p>}
              {supplier.contact_mobile_whatsapp && <p className="text-sm text-blue-600" dir="ltr">{supplier.contact_mobile_whatsapp}</p>}
              {supplier.email && <p className="text-xs text-slate-400 truncate">{supplier.email}</p>}
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className={`hidden md:block ${tableStyles.wrapper}`}>
          {loadingSuppliers ?
          <div className={tableStyles.loadingContainer}><div className={tableStyles.loadingSpinner}></div></div> :
          filteredSuppliers.length === 0 ?
          <div className={tableStyles.emptyContainer}>{suppliers.length === 0 ? 'אין ספקים בעדיין' : 'לא נמצאו ספקים תואמים לחיפוש'}</div> :
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className={tableStyles.headerRow}>
                  <TableHead className={`${tableStyles.headerCell} w-28`}>שם החברה</TableHead>
                  <TableHead className={`${tableStyles.headerCell} w-20`}>קטגוריה</TableHead>
                  <TableHead className={`${tableStyles.headerCell} w-24`}>איש קשר</TableHead>
                  <TableHead className={`${tableStyles.headerCell} w-20`}>טלפון נייד</TableHead>
                  <TableHead className={`${tableStyles.headerCell} w-20`}>טלפון במשרד</TableHead>
                  <TableHead className={`${tableStyles.headerCell} w-24`}>אימייל</TableHead>
                  <TableHead className={`${tableStyles.headerCell} w-20`}>מסמכים</TableHead>
                  <TableHead className={`${tableStyles.stickyHeaderCell} w-28`}>פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) =>
                <TableRow key={supplier.id} className={tableStyles.bodyRow} onClick={() => handleEdit(supplier)}>
                  <TableCell className={`${tableStyles.bodyCell} font-medium`}>{supplier.company_name}</TableCell>
                  <TableCell className={tableStyles.bodyCell}>{categories[supplier.category_id]?.name ? <Badge variant="outline" className="text-xs">{categories[supplier.category_id].name}</Badge> : <span className="text-slate-400">-</span>}</TableCell>
                  <TableCell className={tableStyles.bodyCell}>{supplier.contact_person_name || '-'}</TableCell>
                  <TableCell className={`${tableStyles.bodyCell} text-blue-600`}>{supplier.contact_mobile_whatsapp || '-'}</TableCell>
                  <TableCell className={tableStyles.bodyCell}>{supplier.company_phone || '-'}</TableCell>
                  <TableCell className={`${tableStyles.bodyCell} text-slate-600 truncate`}>{supplier.email || '-'}</TableCell>
                  <TableCell className={`${tableStyles.bodyCell} text-slate-600`}>{documentCounts[supplier.id] || '-'}</TableCell>
                  <TableCell className={tableStyles.stickyCellActions}>
                    <div className="flex gap-1 justify-end">
                      {supplier.contact_mobile_whatsapp && <button onClick={(e) => { e.stopPropagation(); handleWhatsApp(supplier); }} className={`${tableStyles.actionButton} ${tableStyles.actionButtonGreen}`} title="וואטסאפ"><MessageCircle className="w-4 h-4" /></button>}
                      {supplier.company_phone && <button onClick={(e) => { e.stopPropagation(); handleCall(supplier.company_phone); }} className={`${tableStyles.actionButton} ${tableStyles.actionButtonBlue}`} title="התקשר"><Phone className="w-4 h-4" /></button>}
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(supplier); }} className={`${tableStyles.actionButton} ${tableStyles.actionButtonGray}`} title="ערוך"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(supplier.id); }} className={`${tableStyles.actionButton} ${tableStyles.actionButtonRed}`} title="מחק"><Trash2 className="w-4 h-4" /></button>
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