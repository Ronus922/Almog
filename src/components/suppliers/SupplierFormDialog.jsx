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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X } from 'lucide-react';
import CategorySelect from './CategorySelect';
import DocumentUploadSection from './DocumentUploadSection';

export default function SupplierFormDialog({ isOpen, onClose, supplier, onSave }) {
  const [form, setForm] = useState({
    company_name: '',
    category_id: '',
    company_phone: '',
    contact_person_name: '',
    contact_mobile_whatsapp: '',
    email: '',
    full_address: '',
    business_description: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (supplier) {
      setForm(supplier);
    } else {
      setForm({
        company_name: '',
        category_id: '',
        company_phone: '',
        contact_person_name: '',
        contact_mobile_whatsapp: '',
        email: '',
        full_address: '',
        business_description: '',
      });
    }
    setErrors({});
  }, [supplier, isOpen]);

  const validateEmail = (email) => {
    if (!email) return true;
    // מאפשר רק אנגלית ותווים של אימייל
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!form.company_name.trim()) {
      newErrors.company_name = 'שם החברה חובה';
    }

    if (!form.category_id) {
      newErrors.category_id = 'קטגוריה חובה';
    }

    if (!form.contact_person_name.trim()) {
      newErrors.contact_person_name = 'שם איש קשר חובה';
    }

    if (!form.contact_mobile_whatsapp.trim()) {
      newErrors.contact_mobile_whatsapp = 'טלפון נייד חובה';
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
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-background shadow-lg border overflow-hidden flex flex-col sm:rounded-lg p-0"
        style={{ width: "min(460px, 95vw)", height: "min(750px, 90vh)" }}
        dir="rtl" 
        aria-describedby={undefined}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 rounded-lg bg-white/20 hover:bg-white/40 p-1.5 focus:outline-none transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <DialogTitle className="text-white text-lg font-bold">
            {supplier ? 'עדכן ספק' : 'ספק חדש'}
          </DialogTitle>
          <DialogDescription className="text-blue-100 text-sm mt-1">
            {supplier ? 'עדכן את פרטי הספק' : 'הוסף ספק חדש למערכת'}
          </DialogDescription>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="business" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="documents" className="text-sm">פרטים כלליים</TabsTrigger>
              <TabsTrigger value="business" className="text-sm">פרטי העסק</TabsTrigger>
            </TabsList>

            {/* Tab 1: פרטים כלליים - מסמכים בלבד */}
            <TabsContent value="documents" className="space-y-4">
              {supplier?.id ? (
                <DocumentUploadSection supplierId={supplier.id} />
              ) : (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 text-right">
                  שמור את הספק תחילה כדי להעלות מסמכים
                </div>
              )}
            </TabsContent>

            {/* Tab 2: פרטי העסק - כל השדות */}
            <TabsContent value="business" className="space-y-4">
              <div>
                <Label htmlFor="company_name" className="text-right block mb-1">שם החברה *</Label>
                <Input
                  id="company_name"
                  placeholder="הזן שם חברה"
                  value={form.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  className={`h-9 text-right ${errors.company_name ? 'border-red-500' : ''}`}
                  dir="rtl"
                />
                {errors.company_name && <span className="text-red-500 text-xs mt-1 block">{errors.company_name}</span>}
              </div>

              <div>
                <Label htmlFor="category_id" className="text-right block mb-1">קטגוריה *</Label>
                <CategorySelect
                  value={form.category_id}
                  onChange={(value) => handleChange('category_id', value)}
                />
                {errors.category_id && <span className="text-red-500 text-xs mt-1 block">{errors.category_id}</span>}
              </div>

              <div>
                <Label htmlFor="contact_person_name" className="text-right block mb-1">שם איש קשר 1 *</Label>
                <Input
                  id="contact_person_name"
                  placeholder="שם איש קשר"
                  value={form.contact_person_name}
                  onChange={(e) => handleChange('contact_person_name', e.target.value)}
                  className={`h-9 text-right ${errors.contact_person_name ? 'border-red-500' : ''}`}
                  dir="rtl"
                />
                {errors.contact_person_name && <span className="text-red-500 text-xs mt-1 block">{errors.contact_person_name}</span>}
              </div>

              <div>
                <Label htmlFor="contact_mobile_whatsapp" className="text-right block mb-1">טלפון נייד / וואטסאפ *</Label>
                <Input
                  id="contact_mobile_whatsapp"
                  placeholder="הזן מספר טלפון נייד"
                  value={form.contact_mobile_whatsapp}
                  onChange={(e) => handleChange('contact_mobile_whatsapp', e.target.value)}
                  className={`h-9 text-right ${errors.contact_mobile_whatsapp ? 'border-red-500' : ''}`}
                  dir="rtl"
                />
                {errors.contact_mobile_whatsapp && <span className="text-red-500 text-xs mt-1 block">{errors.contact_mobile_whatsapp}</span>}
              </div>

              <div>
                <Label htmlFor="company_phone" className="text-right block mb-1">טלפון במשרד / קווי</Label>
                <Input
                  id="company_phone"
                  placeholder="הזן מספר טלפון קווי"
                  value={form.company_phone}
                  onChange={(e) => handleChange('company_phone', e.target.value)}
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
                <Label htmlFor="full_address" className="text-right block mb-1">כתובת מלאה</Label>
                <Input
                  id="full_address"
                  placeholder="הזן כתובת"
                  value={form.full_address}
                  onChange={(e) => handleChange('full_address', e.target.value)}
                  className="h-9 text-right"
                  dir="rtl"
                />
              </div>

              <div>
                <Label htmlFor="business_description" className="text-right block mb-1">תיאור העסק</Label>
                <Textarea
                  id="business_description"
                  placeholder="תאר את העסק וההיצע"
                  value={form.business_description}
                  onChange={(e) => handleChange('business_description', e.target.value)}
                  className="h-24 text-right resize-none"
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
            disabled={!form.company_name || !form.category_id || !form.contact_person_name.trim() || !form.contact_mobile_whatsapp.trim()}
            className="h-9 bg-[#3563d0] text-white px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow hover:bg-primary/90"
          >
            {supplier ? 'שמור שינויים' : 'הוסף ספק'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}