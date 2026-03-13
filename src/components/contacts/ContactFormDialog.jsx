import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export default function ContactFormDialog({ open, onClose, contact, onSave }) {
  const [form, setForm] = useState({
    apartment_number: "",
    owner_name: "",
    owner_phone: "",
    owner_email: "",
    tenant_name: "",
    tenant_phone: "",
    tenant_email: "",
    contact_type: "owner",
    address: "",
    notes: "",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{contact ? "עריכת איש קשר" : "איש קשר חדש"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Apartment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>מספר דירה *</Label>
              <Input
                value={form.apartment_number}
                onChange={e => setForm(f => ({ ...f, apartment_number: e.target.value }))}
                className="mt-1"
                disabled={contact !== null}
              />
            </div>
            <div>
              <Label>איש קשר ראשי (להודעות)</Label>
              <Select value={form.contact_type} onValueChange={v => setForm(f => ({ ...f, contact_type: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">בעל דירה</SelectItem>
                  <SelectItem value="tenant">שוכר</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Owner Info */}
          <div className="border-t pt-3">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">פרטי בעל הדירה</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>שם</Label>
                <Input
                  value={form.owner_name}
                  onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>טלפון</Label>
                <Input
                  value={form.owner_phone}
                  onChange={e => setForm(f => ({ ...f, owner_phone: e.target.value }))}
                  className="mt-1"
                  dir="ltr"
                />
              </div>
              <div>
                <Label>מייל</Label>
                <Input
                  value={form.owner_email}
                  onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))}
                  className="mt-1"
                  dir="ltr"
                  type="email"
                />
              </div>
            </div>
          </div>

          {/* Tenant Info */}
          <div className="border-t pt-3">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">פרטי השוכר</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>שם</Label>
                <Input
                  value={form.tenant_name}
                  onChange={e => setForm(f => ({ ...f, tenant_name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>טלפון</Label>
                <Input
                  value={form.tenant_phone}
                  onChange={e => setForm(f => ({ ...f, tenant_phone: e.target.value }))}
                  className="mt-1"
                  dir="ltr"
                />
              </div>
              <div>
                <Label>מייל</Label>
                <Input
                  value={form.tenant_email}
                  onChange={e => setForm(f => ({ ...f, tenant_email: e.target.value }))}
                  className="mt-1"
                  dir="ltr"
                  type="email"
                />
              </div>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="border-t pt-3 space-y-3">
            <div>
              <Label>כתובת מגורים (אופציונלי)</Label>
              <Input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label>הערות</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label>תגיות</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="הוסף תגית..."
                />
                <Button variant="outline" size="icon" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 cursor-pointer"
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

        <div className="flex justify-end gap-2 mt-4 border-t pt-4">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button
            onClick={handleSave}
            disabled={!form.apartment_number}
            className="bg-[#3563d0] hover:bg-[#2a50b0] text-white"
          >
            {contact ? "שמור שינויים" : "הוסף איש קשר"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}