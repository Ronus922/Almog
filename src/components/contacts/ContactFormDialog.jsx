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

  // Auto-derive primary name/phone/email from contact_type
  useEffect(() => {
    if (form.contact_type === "בעל דירה") {
      setForm(f => ({
        ...f,
        name:  f.owner_name  || f.name,
        phone: f.owner_phone || f.phone,
        email: f.owner_email || f.email,
      }));
    } else if (form.contact_type === "שוכר") {
      setForm(f => ({
        ...f,
        name:  f.tenant_name  || f.name,
        phone: f.tenant_phone || f.phone,
        email: f.tenant_email || f.email,
      }));
    }
  }, [form.contact_type]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };

  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  const handleSave = () => {
    if (!form.name || !form.phone) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{contact ? "עריכת איש קשר" : "איש קשר חדש"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Basic */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>מספר דירה</Label>
              <Input value={form.apartment_number} onChange={e => set("apartment_number", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>סטטוס</Label>
              <Select value={form.contact_type} onValueChange={v => set("contact_type", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="בחר..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="בעל דירה">בעל דירה</SelectItem>
                  <SelectItem value="שוכר">שוכר</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Owner */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">בעל דירה</p>
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
          <div className="border border-slate-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">שוכר</p>
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

          {/* Primary contact override */}
          <div className="border border-blue-100 bg-blue-50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">איש קשר ראשי (לשליחת וואטסאפ) *</p>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <Label>שם *</Label>
                <Input value={form.name} onChange={e => set("name", e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>טלפון *</Label>
                  <Input value={form.phone} onChange={e => set("phone", e.target.value)} className="mt-1" dir="ltr" placeholder="972501234567" />
                </div>
                <div>
                  <Label>אימייל</Label>
                  <Input value={form.email} onChange={e => set("email", e.target.value)} className="mt-1" dir="ltr" type="email" />
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