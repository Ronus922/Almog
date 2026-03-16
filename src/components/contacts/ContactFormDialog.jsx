import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ContactDocumentsTab from "./ContactDocumentsTab";

export default function ContactFormDialog({ open, onClose, contact, onSave }) {
  const [activeTab, setActiveTab] = useState("details");
  const [form, setForm] = useState({
    apartment_number: "",
    owner_name: "",
    owner_phone: "",
    owner_email: "",
    tenant_name: "",
    tenant_phone: "",
    tenant_email: "",
    contact_type: "owner",
    resident_type: "owner",
    operator_id: "",
    owner_is_primary_contact: true,
    tenant_is_primary_contact: false,
    operator_is_primary_contact: false,
    address: "",
    notes: "",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");

  const { data: operators = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: () => base44.entities.Operator.list()
  });

  useEffect(() => {
    if (open) {
      setForm(contact ? { ...contact, tags: contact.tags || [] } : {
        apartment_number: "",
        owner_name: "",
        owner_phone: "",
        owner_email: "",
        tenant_name: "",
        tenant_phone: "",
        tenant_email: "",
        contact_type: "owner",
        resident_type: "owner",
        operator_id: "",
        owner_is_primary_contact: true,
        tenant_is_primary_contact: false,
        operator_is_primary_contact: false,
        address: "",
        notes: "",
        tags: [],
      });
      setTagInput("");
    }
  }, [open, contact]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput("");
  };

  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  const handleSave = () => {
    if (!form.apartment_number) return;
    const { management_fees, ...saveData } = form;
    onSave(saveData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-w-lg bg-background shadow-lg border overflow-hidden flex flex-col sm:rounded-lg p-0"
        style={{ maxWidth: "552px", maxHeight: "820px", height: "92vh", width: "100%" }}
        dir="rtl" 
        aria-describedby={undefined}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-lg text-white relative">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 rounded-lg bg-white/20 hover:bg-white/40 p-1.5 focus:outline-none transition-colors"
          >
            <X className="h-5 w-5 text-white" />
            <span className="sr-only">סגור</span>
          </button>
          <div dir="rtl">
            <h2 className="text-white text-lg font-bold text-right">{contact ? "עריכת איש קשר" : "איש קשר חדש"}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 mt-2 flex-1 overflow-y-auto px-6 pt-4" dir="rtl">
          {/* Apartment + Resident Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">מספר דירה *</Label>
              <Input
                value={form.apartment_number}
                onChange={e => setForm(f => ({ ...f, apartment_number: e.target.value }))}
                className="h-9 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-muted-foreground"
                dir="rtl"
                disabled={contact !== null}
                placeholder="הכנס מספר דירה"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">מי גר בדירה</Label>
              <Select value={form.resident_type} onValueChange={v => setForm(f => ({ ...f, resident_type: v }))}>
                <SelectTrigger className="h-10 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">בעלים</SelectItem>
                  <SelectItem value="tenant">שוכר</SelectItem>
                  <SelectItem value="operator">מפעיל</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Owner Info */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">פרטי בעל הדירה</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">שם</Label>
                <Input
                  value={form.owner_name}
                  onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
                  className="h-9 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-muted-foreground"
                  dir="rtl"
                  placeholder="שם בעל הדירה"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">טלפון</Label>
                <Input
                  value={form.owner_phone}
                  onChange={e => setForm(f => ({ ...f, owner_phone: e.target.value }))}
                  className="h-9 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-muted-foreground"
                  dir="ltr"
                  placeholder="מספר טלפון"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">מייל</Label>
                <Input
                  value={form.owner_email}
                  onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))}
                  className="h-9 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-muted-foreground"
                  dir="ltr"
                  type="email"
                  placeholder="דוא״ל"
                />
              </div>
            </div>

            {/* Primary Contact Checkbox for Owner */}
            <div className="mt-3 flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={form.owner_is_primary_contact}
                onChange={e => setForm(f => ({ ...f, owner_is_primary_contact: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-200 cursor-pointer"
                id="owner_primary"
              />
              <label htmlFor="owner_primary" className="text-xs text-slate-600 cursor-pointer">
                מקבל הודעות/איש קשר ראשי
              </label>
            </div>
          </div>

          {/* Tenant Info - Show only if resident_type is tenant or owner with tenant */}
          {form.resident_type === "tenant" && (
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">פרטי השוכר</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">שם</Label>
                <Input
                  value={form.tenant_name}
                  onChange={e => setForm(f => ({ ...f, tenant_name: e.target.value }))}
                  className="h-9 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-muted-foreground"
                  dir="rtl"
                  placeholder="שם השוכר"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">טלפון</Label>
                <Input
                  value={form.tenant_phone}
                  onChange={e => setForm(f => ({ ...f, tenant_phone: e.target.value }))}
                  className="h-9 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-muted-foreground"
                  dir="ltr"
                  placeholder="מספר טלפון"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">מייל</Label>
                <Input
                  value={form.tenant_email}
                  onChange={e => setForm(f => ({ ...f, tenant_email: e.target.value }))}
                  className="h-9 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-muted-foreground"
                  dir="ltr"
                  type="email"
                  placeholder="דוא״ל"
                />
              </div>
            </div>

            {/* Primary Contact Checkbox for Tenant */}
            <div className="mt-3 flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={form.tenant_is_primary_contact}
                onChange={e => setForm(f => ({ ...f, tenant_is_primary_contact: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-200 cursor-pointer"
                id="tenant_primary"
              />
              <label htmlFor="tenant_primary" className="text-xs text-slate-600 cursor-pointer">
                מקבל הודעות/איש קשר ראשי
              </label>
            </div>
          </div>
          )}

          {/* Operator Selection - Show only if resident_type is operator OR operator_is_primary_contact is true */}
          {(form.resident_type === "operator" || form.operator_is_primary_contact) && (
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">פרטי מפעיל</h3>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">בחר מפעיל</Label>
              <Select value={form.operator_id || ""} onValueChange={v => setForm(f => ({ ...f, operator_id: v || "" }))}>
                <SelectTrigger className="h-10 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" dir="rtl">
                  <SelectValue placeholder="בחר מפעיל" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>אין מפעיל</SelectItem>
                  {operators.filter(op => op.is_active).map(operator => (
                    <SelectItem key={operator.id} value={operator.id}>
                      {operator.company_name} - {operator.contact_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Primary Contact Checkbox for Operator */}
            <div className="mt-3 flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={form.operator_is_primary_contact}
                onChange={e => setForm(f => ({ ...f, operator_is_primary_contact: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-200 cursor-pointer"
                id="operator_primary"
              />
              <label htmlFor="operator_primary" className="text-xs text-slate-600 cursor-pointer">
                מקבל הודעות/איש קשר ראשי
              </label>
            </div>
          </div>
          )}

          {/* Additional Fields */}
          <div className="border-t border-slate-100 pt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">כתובת מגורים</Label>
              <Input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="h-9 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-muted-foreground"
                dir="rtl"
                placeholder="כתובת מגורים (אופציונלי)"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">הערות</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-muted-foreground resize-none"
                dir="rtl"
                rows={3}
                placeholder="הערות נוספות..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">תגיות</Label>
              <div className="flex gap-2 flex-row-reverse">
                <Button variant="outline" size="icon" onClick={addTag} className="h-9 w-9 flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="הוסף תגית..."
                  dir="rtl"
                  className="h-9 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-muted-foreground"
                />
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-slate-300 transition-colors"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} <X className="w-3 h-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
            <Button variant="outline" onClick={onClose} className="h-9">
              ביטול
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.apartment_number}
              className="h-9 bg-[#3563d0] text-white px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90"
            >
              {contact ? "שמור שינויים" : "הוסף איש קשר"}
            </Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}