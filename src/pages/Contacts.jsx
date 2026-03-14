import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Upload, Send, Trash2, Search, X, Filter, Download, Users } from "lucide-react";
import ContactFormDialog from "@/components/contacts/ContactFormDialog";
import SendWhatsAppBulkDialog from "@/components/contacts/SendWhatsAppBulkDialog";
import ContactImportDialog from "@/components/contacts/ContactImportDialog";
import OperatorManagementDialog from "@/components/contacts/OperatorManagementDialog";
import { useAlert } from "@/components/notifications/AlertContext";
import { tableStyles } from '@/components/tables/DataTableStyles';
import { useState, useMemo } from "react";

export default function Contacts() {
  const queryClient = useQueryClient();
  const { showAlert, showConfirm } = useAlert();

  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [selected, setSelected] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [operatorManagementOpen, setOperatorManagementOpen] = useState(false);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("-created_date"),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => base44.entities.Settings.list(),
  });
  const settings = settingsList[0] || {};

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setFormOpen(false);
      setEditContact(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });

  // All unique tags
  const allTags = useMemo(() => {
    const set = new Set();
    contacts.forEach(c => (c.tags || []).forEach(t => set.add(t)));
    return [...set].sort();
  }, [contacts]);

  // Filtered contacts
  const filtered = useMemo(() => {
    const result = contacts.filter(c => {
      const matchSearch =
        !search ||
        (c.apartment_number || "").includes(search) ||
        (c.owner_name || "").includes(search) ||
        (c.owner_phone || "").includes(search) ||
        (c.tenant_name || "").includes(search) ||
        (c.tenant_phone || "").includes(search);
      const matchTags = selectedTags.length === 0 || selectedTags.every(t => (c.tags || []).includes(t));
      return matchSearch && matchTags;
    });
    // Sort by apartment number (numeric)
    return result.sort((a, b) => {
      const numA = parseInt(a.apartment_number) || 0;
      const numB = parseInt(b.apartment_number) || 0;
      return numA - numB;
    });
  }, [contacts, search, selectedTags]);

  const toggleTag = (tag) =>
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  const toggleSelect = (id) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  const toggleAll = () =>
    setSelected(selected.length === filtered.length ? [] : filtered.map(c => c.id));

  const selectedContacts = contacts.filter(c => selected.includes(c.id));

  const handleDelete = (contact) => {
    showConfirm(`למחוק דירה ${contact.apartment_number}?`, () => deleteMutation.mutate(contact.id));
  };

  const handleDeleteSelected = () => {
    showConfirm(`למחוק ${selected.length} דירות?`, async () => {
      await Promise.all(selected.map(id => deleteMutation.mutate(id)));
      setSelected([]);
    });
  };

  const handleSave = (form) => {
    if (editContact) {
      updateMutation.mutate({ id: editContact.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleExportCSV = () => {
    const headers = ["דירה", "בעל הדירה", "טלפון בעל", "השוכר", "טלפון שוכר", "דמי ניהול", "הערות"];
    const rows = filtered.map(c => [
      c.apartment_number,
      c.owner_name || "",
      c.owner_phone || "",
      c.tenant_name || "",
      c.tenant_phone || "",
      c.management_fees || "",
      c.notes || ""
    ]);
    
    const csvContent = [
      headers.map(h => `"${h}"`).join(","),
      ...rows.map(r => r.map(v => `"${v}"`).join(","))
    ].join("\n");
    
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `contacts_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">אנשי קשר - דיירים</h1>
          <p className="text-sm text-slate-500">{contacts.length} דירות במערכת</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4" /> ייבוא Excel
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <Download className="w-4 h-4" /> ייצוא CSV
          </Button>
          {selected.length > 0 && (
            <>
              <Button
                variant="outline"
                className="gap-2 text-red-600 hover:bg-red-50 border-red-200"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="w-4 h-4" /> מחק ({selected.length})
              </Button>
              <Button
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setSendOpen(true)}
              >
                <Send className="w-4 h-4" /> שלח וואטסאפ ({selected.length})
              </Button>
            </>
          )}
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setOperatorManagementOpen(true)}
          >
            <Users className="w-4 h-4" /> ניהול מפעילים
          </Button>
          <Button
            className="gap-2 bg-[#3563d0] hover:bg-[#2a50b0] text-white"
            onClick={() => {
              setEditContact(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> הוסף דירה
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3" dir="rtl">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש לפי דירה, שם בעל, שם שוכר, טלפון..."
              className="pr-9"
              dir="rtl"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  {selectedTags.includes(tag) && <X className="w-3 h-3 mr-1" />}
                </Badge>
              ))}
              {selectedTags.length > 0 && (
                <button
                  className="text-xs text-slate-400 hover:text-slate-600 underline"
                  onClick={() => setSelectedTags([])}
                >
                  נקה סינון
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
       <div className={tableStyles.wrapper}>
         {isLoading ? (
           <div className={tableStyles.loadingContainer}>
             <div className={tableStyles.loadingSpinner}></div>
           </div>
         ) : filtered.length === 0 ? (
           <div className={tableStyles.emptyContainer}>
             <div>
               <p className="font-medium">אין דירות</p>
               <p className="text-sm mt-1">הוסף ידנית או ייבא מ-Excel</p>
             </div>
           </div>
         ) : (
           <div className="overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow className={tableStyles.headerRow}>
                     <TableHead className={`${tableStyles.headerCell}`}>דירה</TableHead>
                     <TableHead className={`${tableStyles.headerCell}`}>בעל הדירה</TableHead>
                     <TableHead className={`${tableStyles.headerCell}`}>מפעיל / שוכר</TableHead>
                     <TableHead className={`${tableStyles.headerCell} w-32`}>טלפון בעל</TableHead>
                     <TableHead className={`${tableStyles.headerCell} hidden md:table-cell`}>השוכר</TableHead>
                     <TableHead className={`${tableStyles.headerCell} hidden md:table-cell w-32`}>טלפון שוכר</TableHead>
                     <TableHead className={`${tableStyles.headerCell} hidden md:table-cell`}>דמי ניהול</TableHead>
                     <TableHead className={`${tableStyles.headerCell}`}>פעולות</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filtered.map(contact => (
                      <TableRow key={contact.id} className={tableStyles.bodyRow} onClick={() => {setEditContact(contact); setFormOpen(true);}}>
                        <TableCell className={`${tableStyles.bodyCell} font-bold text-blue-600`}>{contact.apartment_number}</TableCell>
                        <TableCell className={tableStyles.bodyCell}>{contact.owner_name || "—"}</TableCell>
                        <TableCell className={tableStyles.bodyCell}>
                          {contact.resident_type === 'tenant' && <Badge className="bg-purple-100 text-purple-700">שוכר</Badge>}
                          {contact.resident_type === 'operator' && <Badge className="bg-orange-100 text-orange-700">מפעיל</Badge>}
                          {contact.resident_type === 'owner' && <span className="text-slate-400 text-sm">—</span>}
                        </TableCell>
                        <TableCell className={`${tableStyles.bodyCell} w-32`} dir="ltr">{contact.owner_phone || "—"}</TableCell>
                        <TableCell className={`${tableStyles.bodyCell} hidden md:table-cell`}>{contact.tenant_name || "—"}</TableCell>
                        <TableCell className={`${tableStyles.bodyCell} hidden md:table-cell w-32`} dir="ltr">{contact.tenant_phone || "—"}</TableCell>
                        <TableCell className={`${tableStyles.bodyCell} hidden md:table-cell`}>
                          {contact.management_fees ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              ₪{contact.management_fees}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className={tableStyles.bodyCell}>
                          <div className="flex gap-0.5 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`${tableStyles.actionButton} ${tableStyles.actionButtonGreen}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected([contact.id]);
                                setSendOpen(true);
                              }}
                              title="שלח וואטסאפ"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`${tableStyles.actionButton} ${tableStyles.actionButtonRed}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(contact);
                              }}
                              title="מחיקה"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
               </Table>
             </div>
           )}
       </div>

      <ContactFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditContact(null);
        }}
        contact={editContact}
        onSave={handleSave}
      />
      <SendWhatsAppBulkDialog
        open={sendOpen}
        onClose={() => {
          setSendOpen(false);
          setSelected([]);
        }}
        contacts={selectedContacts}
        settings={settings}
      />
      <ContactImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => queryClient.invalidateQueries({ queryKey: ["contacts"] })}
      />
      <OperatorManagementDialog
        open={operatorManagementOpen}
        onClose={() => setOperatorManagementOpen(false)}
      />
      </div>
      );
      }