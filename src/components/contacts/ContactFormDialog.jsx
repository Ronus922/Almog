import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from "lucide-react";

const EMPTY = {
  apartment_number: "", contact_type: "",
  owner_name: "", owner_phone: "", owner_email: "",
  tenant_name: "", tenant_phone: "", tenant_email: "",
  address: "", notes: "", tags: [],
  name: "", phone: "", email: "",
};

export default function ContactFormDialog({ open, onClose, contact, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (open) {
      setForm(contact ? { ...EMPTY, ...contact, tags: contact.tags || [] } : EMPTY);
      setTagInput("");
    }
  }, [open, contact]);

  const selectPrimary = (type) => {
    setForm(f => ({
      ...f,
      contact_type: type,
      name:  type === "בעל דירה" ? f.owner_name  : f.tenant_name,
      phone: type === "בעל דירה" ? f.owner_phone : f.tenant_phone,
      email: type === "בעל דירה" ? f.owner_email : f.tenant_email,
    }));
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };

  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  const handleSave = () => {
    if (!form.contact_type) return;
    const name  = form.contact_type === "בעל דירה" ? form.owner_name  : form.tenant_name;
    const phone = form.contact_type === "בעל דירה" ? form.owner_phone : form.tenant_phone;
    const email = form.contact_type === "בעל דירה" ? form.owner_email : form.tenant_email;
    if (!name || !phone) return;
    onSave({ ...form, name, phone, email });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{contact ? "עריכת איש קשר" : "איש קשר חדש"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Basic */}
          <div>
            <Label>מספר דירה</Label>
            <Input value={form.apartment_number} onChange={e => set("apartment_number", e.target.value)} className="mt-1" />
          </div>
          <p className="text-xs text-slate-500">סמן ✓ ליד בעל הדירה או השוכר שישמש כ<strong>איש קשר ראשי</strong> לשליחת וואטסאפ:</p>

          {/* Owner */}
          <div className={`border rounded-lg p-3 space-y-2 cursor-pointer transition-colors ${form.contact_type === "בעל דירה" ? "border-blue-400 bg-blue-50" : "border-slate-200"}`}>
            <div className="flex items-center gap-2" onClick={() => selectPrimary("בעל דירה")}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${form.contact_type === "בעל דירה" ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                {form.contact_type === "בעל דירה" && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
              </div>
              <p className="text-sm font-semibold text-slate-700">בעל דירה <span className="text-xs font-normal text-slate-400">(ראשי לוואטסאפ)</span></p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <Label>שם</Label>
                <Input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>טלפון</Label>
                  <Input value={form.owner_phone} onChange={e => set("owner_phone", e.target.value)} className="mt-1" dir="ltr" />
                </div>
                <div>
                  <Label>אימייל</Label>
                  <Input value={form.owner_email} onChange={e => set("owner_email", e.target.value)} className="mt-1" dir="ltr" type="email" />
                </div>
              </div>
            </div>
          </div>

          {/* Tenant */}
          <div className={`border rounded-lg p-3 space-y-2 cursor-pointer transition-colors ${form.contact_type === "שוכר" ? "border-purple-400 bg-purple-50" : "border-slate-200"}`}>
            <div className="flex items-center gap-2" onClick={() => selectPrimary("שוכר")}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${form.contact_type === "שוכר" ? "border-purple-500 bg-purple-500" : "border-slate-300"}`}>
                {form.contact_type === "שוכר" && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
              </div>
              <p className="text-sm font-semibold text-slate-700">שוכר <span className="text-xs font-normal text-slate-400">(ראשי לוואטסאפ)</span></p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <Label>שם</Label>
                <Input value={form.tenant_name} onChange={e => set("tenant_name", e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>טלפון</Label>
                  <Input value={form.tenant_phone} onChange={e => set("tenant_phone", e.target.value)} className="mt-1" dir="ltr" />
                </div>
                <div>
                  <Label>אימייל</Label>
                  <Input value={form.tenant_email} onChange={e => set("tenant_email", e.target.value)} className="mt-1" dir="ltr" type="email" />
                </div>
              </div>
            </div>
          </div>



          {/* Address */}
          <div>
            <Label>כתובת מגורים (אופציונלי)</Label>
            <Input value={form.address} onChange={e => set("address", e.target.value)} className="mt-1" />
          </div>

          {/* Tags */}
          <div>
            <Label>תגיות</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="הוסף תגית..."
              />
              <Button variant="outline" size="icon" onClick={addTag}><Plus className="w-4 h-4" /></Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} <X className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label>הערות</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-1" rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={handleSave} disabled={!form.name || !form.phone} className="bg-[#3563d0] hover:bg-[#2a50b0] text-white">
            {contact ? "שמור שינויים" : "הוסף איש קשר"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}