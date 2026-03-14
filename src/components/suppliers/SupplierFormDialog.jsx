import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SupplierFormDialog({ isOpen, onClose, supplier, onSave }) {
  const [form, setForm] = useState({
    supplier_name: '',
    occupation_description: '',
    contact_person_name: '',
    phone: '',
    whatsapp_phone: '',
    email: '',
    address: '',
    notes: '',
    status: 'active',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (supplier) {
      setForm(supplier);
    } else {
      setForm({
        supplier_name: '',
        occupation_description: '',
        contact_person_name: '',
        phone: '',
        whatsapp_phone: '',
        email: '',
        address: '',
        notes: '',
        status: 'active',
      });
    }
    setErrors({});
  }, [supplier, isOpen]);

  const validateEmail = (email) => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? value.trim() : value
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!form.supplier_name.trim()) {
      newErrors.supplier_name = 'שם הספק חובה';
    }

    if (!form.occupation_description.trim()) {
      newErrors.occupation_description = 'תיאור העיסוק חובה';
    }

    if (form.email && !validateEmail(form.email)) {
      newErrors.email = 'כתובת אימייל לא תקינה';
    }

    return newErrors;
  };

  const handleSave = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSave(form);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-w-lg bg-background shadow-lg border overflow-hidden flex flex-col sm:rounded-lg p-0"
        style={{ maxWidth: "552px", maxHeight: "820px", height: "92vh", width: "100%" }}
        dir="rtl" 
        aria-describedby={undefined}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex-shrink-0">
          <DialogTitle className="text-white text-lg font-bold">
            {supplier ? 'עדכן ספק' : 'ספק חדש'}
          </DialogTitle>
          <DialogDescription className="text-blue-100 text-sm mt-1">
            {supplier ? 'עדכן את פרטי הספק' : 'הוסף ספק חדש למערכת'}
          </DialogDescription>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="occupation" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="occupation" className="text-sm">פרטי עיסוק</TabsTrigger>
              <TabsTrigger value="contact" className="text-sm">יצירת קשר</TabsTrigger>
            </TabsList>

            {/* Tab 1: פרטי עיסוק */}
            <TabsContent value="occupation" className="space-y-4">
              <div>
                <Label htmlFor="supplier_name" className="text-right block mb-1">שם ספק *</Label>
                <Input
                  id="supplier_name"
                  placeholder="הזן שם ספק"
                  value={form.supplier_name}
                  onChange={(e) => handleChange('supplier_name', e.target.value)}
                  className={`h-9 text-right ${errors.supplier_name ? 'border-red-500' : ''}`}
                  dir="rtl"
                />
                {errors.supplier_name && <span className="text-red-500 text-xs mt-1 block">{errors.supplier_name}</span>}
              </div>

              <div>
                <Label htmlFor="occupation_description" className="text-right block mb-1">תיאור עיסוק *</Label>
                <Textarea
                  id="occupation_description"
                  placeholder="תאר את שירות/עיסוק הספק"
                  value={form.occupation_description}
                  onChange={(e) => handleChange('occupation_description', e.target.value)}
                  className={`h-24 text-right resize-none ${errors.occupation_description ? 'border-red-500' : ''}`}
                  dir="rtl"
                />
                {errors.occupation_description && <span className="text-red-500 text-xs mt-1 block">{errors.occupation_description}</span>}
              </div>

              <div>
                <Label htmlFor="status" className="text-right block mb-1">סטטוס</Label>
                <Select value={form.status} onValueChange={(value) => handleChange('status', value)}>
                  <SelectTrigger className="h-9 text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">פעיל</SelectItem>
                    <SelectItem value="inactive">לא פעיל</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes" className="text-right block mb-1">הערות</Label>
                <Textarea
                  id="notes"
                  placeholder="הערות כלליות"
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="h-20 text-right resize-none"
                  dir="rtl"
                />
              </div>
            </TabsContent>

            {/* Tab 2: יצירת קשר */}
            <TabsContent value="contact" className="space-y-4">
              <div>
                <Label htmlFor="contact_person_name" className="text-right block mb-1">איש קשר</Label>
                <Input
                  id="contact_person_name"
                  placeholder="שם איש קשר"
                  value={form.contact_person_name}
                  onChange={(e) => handleChange('contact_person_name', e.target.value)}
                  className="h-9 text-right"
                  dir="rtl"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-right block mb-1">טלפון</Label>
                <Input
                  id="phone"
                  placeholder="הזן מספר טלפון"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="h-9 text-right"
                  dir="rtl"
                />
              </div>

              <div>
                <Label htmlFor="whatsapp_phone" className="text-right block mb-1">וואטסאפ</Label>
                <Input
                  id="whatsapp_phone"
                  placeholder="הזן מספר וואטסאפ"
                  value={form.whatsapp_phone}
                  onChange={(e) => handleChange('whatsapp_phone', e.target.value)}
                  className="h-9 text-right"
                  dir="rtl"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-right block mb-1">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="הזן כתובת אימייל"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`h-9 text-right ${errors.email ? 'border-red-500' : ''}`}
                  dir="rtl"
                />
                {errors.email && <span className="text-red-500 text-xs mt-1 block">{errors.email}</span>}
              </div>

              <div>
                <Label htmlFor="address" className="text-right block mb-1">כתובת</Label>
                <Input
                  id="address"
                  placeholder="הזן כתובת"
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="h-9 text-right"
                  dir="rtl"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="h-9">
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.supplier_name || !form.occupation_description}
            className="h-9 bg-[#3563d0] text-white px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90"
          >
            {supplier ? 'שמור שינויים' : 'הוסף ספק'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}