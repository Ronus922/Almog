import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Home, User, Phone, Mail, MapPin, FileText, Check } from "lucide-react";

const EMPTY = {
  apartment_number: "",
  owner_name: "", owner_phone: "", owner_email: "",
  tenant_name: "", tenant_phone: "", tenant_email: "",
  address: "", notes: "",
  name: "", phone: "", email: "",
  contact_type: "בעל דירה",
};

// Primary contact logic: owner if has phone, else tenant
const resolvePrimary = (form) => {
  if (form.owner_phone?.trim()) return "בעל דירה";
  if (form.tenant_phone?.trim()) return "שוכר";
  return "בעל דירה";
};

export default function ContactFormDialog({ open, onClose, contact, onSave }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) {
      const base = contact ? { ...EMPTY, ...contact } : EMPTY;
      const primaryType = resolvePrimary(base);
      setForm({
        ...base,
        contact_type: primaryType,
        name:  primaryType === "בעל דירה" ? base.owner_name  : base.tenant_name,
        phone: primaryType === "בעל דירה" ? base.owner_phone : base.tenant_phone,
        email: primaryType === "בעל דירה" ? base.owner_email : base.tenant_email,
      });
    }
  }, [open, contact]);

  const set = (key, val) => {
    setForm(f => {
      const updated = { ...f, [key]: val };
      // Auto-recalculate primary whenever phone fields change
      if (key === "owner_phone" || key === "tenant_phone") {
        const primaryType = resolvePrimary(updated);
        updated.contact_type = primaryType;
        updated.name  = primaryType === "בעל דירה" ? updated.owner_name  : updated.tenant_name;
        updated.phone = primaryType === "בעל דירה" ? updated.owner_phone : updated.tenant_phone;
        updated.email = primaryType === "בעל דירה" ? updated.owner_email : updated.tenant_email;
      }
      return updated;
    });
  };

  const handleSave = () => {
    const primaryType = resolvePrimary(form);
    const name  = primaryType === "בעל דירה" ? form.owner_name  : form.tenant_name;
    const phone = primaryType === "בעל דירה" ? form.owner_phone : form.tenant_phone;
    const email = primaryType === "בעל דירה" ? form.owner_email : form.tenant_email;
    if (!phone) return;
    onSave({ ...form, contact_type: primaryType, name, phone, email });
  };

  const isPrimary = (type) => form.contact_type === type;
  const canSave = form.owner_phone?.trim() || form.tenant_phone?.trim();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0" dir="rtl">
        {/* Header */}
        <div className="bg-gradient-to-l from-blue-600 to-indigo-600 px-6 py-5 rounded-t-lg">
          <h2 className="text-xl font-bold text-white">
            {contact ? "עריכת איש קשר" : "איש קשר חדש"}
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            איש הקשר לוואטסאפ נבחר אוטומטית — בעל דירה אם יש טלפון, אחרת שוכר
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Apartment */}
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Home className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-slate-500 font-semibold mb-1">מספר דירה</Label>
              <Input
                value={form.apartment_number}
                onChange={e => set("apartment_number", e.target.value)}
                placeholder="לדוגמה: 12"
                className="border-0 bg-transparent p-0 h-auto text-base font-semibold text-slate-800 focus:ring-0 shadow-none"
              />
            </div>
          </div>

          {/* Owner Card */}
          <div className={`rounded-xl border-2 overflow-hidden transition-all duration-200 ${isPrimary("בעל דירה") ? "border-blue-400 shadow-md" : "border-slate-200"}`}>
            <div className={`flex items-center gap-3 px-4 py-3 ${isPrimary("בעל דירה") ? "bg-blue-50" : "bg-slate-50"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${isPrimary("בעל דירה") ? "border-blue-500 bg-blue-500" : "border-slate-300 bg-white"}`}>
                {isPrimary("בעל דירה") && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </div>
              <div className="flex items-center gap-2">
                <User className={`w-4 h-4 ${isPrimary("בעל דירה") ? "text-blue-600" : "text-slate-400"}`} />
                <span className={`font-bold text-sm ${isPrimary("בעל דירה") ? "text-blue-700" : "text-slate-600"}`}>בעל דירה</span>
                {isPrimary("בעל דירה") && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-semibold">ראשי לוואטסאפ</span>
                )}
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1">שם בעל הדירה</Label>
                <Input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} placeholder="שם מלא" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> טלפון</Label>
                  <Input value={form.owner_phone} onChange={e => set("owner_phone", e.target.value)} dir="ltr" placeholder="05X-XXXXXXX" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> אימייל</Label>
                  <Input value={form.owner_email} onChange={e => set("owner_email", e.target.value)} dir="ltr" type="email" placeholder="email@example.com" />
                </div>
              </div>
            </div>
          </div>

          {/* Tenant Card */}
          <div className={`rounded-xl border-2 overflow-hidden transition-all duration-200 ${isPrimary("שוכר") ? "border-purple-400 shadow-md" : "border-slate-200"}`}>
            <div className={`flex items-center gap-3 px-4 py-3 ${isPrimary("שוכר") ? "bg-purple-50" : "bg-slate-50"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${isPrimary("שוכר") ? "border-purple-500 bg-purple-500" : "border-slate-300 bg-white"}`}>
                {isPrimary("שוכר") && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </div>
              <div className="flex items-center gap-2">
                <User className={`w-4 h-4 ${isPrimary("שוכר") ? "text-purple-600" : "text-slate-400"}`} />
                <span className={`font-bold text-sm ${isPrimary("שוכר") ? "text-purple-700" : "text-slate-600"}`}>שוכר</span>
                {isPrimary("שוכר") && (
                  <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full font-semibold">ראשי לוואטסאפ</span>
                )}
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1">שם השוכר</Label>
                <Input value={form.tenant_name} onChange={e => set("tenant_name", e.target.value)} placeholder="שם מלא" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> טלפון</Label>
                  <Input value={form.tenant_phone} onChange={e => set("tenant_phone", e.target.value)} dir="ltr" placeholder="05X-XXXXXXX" />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> אימייל</Label>
                  <Input value={form.tenant_email} onChange={e => set("tenant_email", e.target.value)} dir="ltr" type="email" placeholder="email@example.com" />
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-1">
              <MapPin className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-slate-500 font-semibold mb-1">כתובת מגורים (אופציונלי)</Label>
              <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="רחוב, עיר" className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0" />
            </div>
          </div>

          {/* Notes */}
          <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-1">
              <FileText className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-slate-500 font-semibold mb-1">הערות</Label>
              <Textarea
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                rows={2}
                placeholder="הערות נוספות..."
                className="border-0 bg-transparent p-0 shadow-none focus:ring-0 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-lg">
          <Button variant="outline" onClick={onClose} className="rounded-xl h-11 px-5 font-semibold">
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-xl h-11 px-6 font-bold bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
          >
            {contact ? "שמור שינויים" : "הוסף איש קשר"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}