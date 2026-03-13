import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

export default function ContactFormDialog({ open, onClose, contact, onSave }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", tags: [], notes: "" });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (open) {
      setForm(contact ? { ...contact, tags: contact.tags || [] } : { name: "", phone: "", email: "", tags: [], notes: "" });
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
    if (!form.name || !form.phone) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{contact ? "עריכת איש קשר" : "איש קשר חדש"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>שם *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label>טלפון *</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" dir="ltr" placeholder="972501234567" />
          </div>
          <div>
            <Label>מייל</Label>
            <Input value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" dir="ltr" type="email" />
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
          <div>
            <Label>הערות</Label>
            <Textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" rows={2} />
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