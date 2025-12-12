import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Home, Phone, Wallet, Calendar, FileText, Scale, 
  Save, X, AlertTriangle, Lock, User, Pencil, Check
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ApartmentDetailModal({ record, isOpen, onClose, onSave, isAdmin }) {
  const { data: allStatuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => base44.entities.Status.list('order'),
  });

  const legalStatuses = allStatuses.filter(s => s.type === 'LEGAL');
  const activeLegalStatuses = legalStatuses.filter(s => s.is_active);
  const defaultStatus = legalStatuses.find(s => s.is_default === true);
  
  // מציאת הסטטוס הנוכחי (כולל לא פעילים)
  const currentStatus = legalStatuses.find(s => s.id === record?.legal_status_id);
  const [editedRecord, setEditedRecord] = useState(record);
  const [isSaving, setIsSaving] = useState(false);
  const [lastContactDateError, setLastContactDateError] = useState('');
  const [nextActionDateError, setNextActionDateError] = useState('');
  
  // Inline edit states
  const [editingPhoneOwner, setEditingPhoneOwner] = useState(false);
  const [phoneOwnerValue, setPhoneOwnerValue] = useState('');
  const [phoneOwnerError, setPhoneOwnerError] = useState('');
  const [savingPhoneOwner, setSavingPhoneOwner] = useState(false);

  const [editingPhoneTenant, setEditingPhoneTenant] = useState(false);
  const [phoneTenantValue, setPhoneTenantValue] = useState('');
  const [phoneTenantError, setPhoneTenantError] = useState('');
  const [savingPhoneTenant, setSavingPhoneTenant] = useState(false);

  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const [editingMonths, setEditingMonths] = useState(false);
  const [monthsValue, setMonthsValue] = useState('');
  const [monthsError, setMonthsError] = useState('');
  const [savingMonths, setSavingMonths] = useState(false);
  
  const [editingPayment, setEditingPayment] = useState(false);
  const [paymentValue, setPaymentValue] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    // תיקון אוטומטי של legal_status_id לא תקין
    if (record && defaultStatus) {
      const validLegalStatusIds = legalStatuses.filter(s => s.is_active).map(s => s.id);
      const needsFix = !record.legal_status_id || !validLegalStatusIds.includes(record.legal_status_id);
      
      if (needsFix) {
        setEditedRecord({ ...record, legal_status_id: defaultStatus.id, legal_status_overridden: false });
      } else {
        setEditedRecord(record);
      }
    } else {
      setEditedRecord(record);
    }
    
    setLastContactDateError('');
    setNextActionDateError('');
    setEditingPhoneOwner(false);
    setEditingPhoneTenant(false);
    setEditingPhone(false);
    setEditingMonths(false);
    setEditingPayment(false);
    setPhoneOwnerError('');
    setPhoneTenantError('');
    setPhoneError('');
    setMonthsError('');
    setPaymentError('');
  }, [record, defaultStatus, legalStatuses]);

  if (!record) return null;

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatCurrency = (num) => 
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);

  const formatPhone = (phone) => {
    if (!phone) return 'אין מספר';
    const cleaned = phone.replace(/\D/g, '');
    if (/^0+$/.test(cleaned)) return 'אין מספר';
    return phone;
  };

  const handleSave = async () => {
    setLastContactDateError('');
    setNextActionDateError('');
    
    // ולידציה: תאריך קשר אחרון לא יכול להיות עתידי
    if (editedRecord?.lastContactDate) {
      const selectedDate = new Date(editedRecord.lastContactDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate > today) {
        setLastContactDateError('לא ניתן לבחור תאריך עתידי');
        return;
      }
    }
    
    // ולידציה: תאריך פעולה הבאה לא יכול להיות בעבר
    if (editedRecord?.nextActionDate) {
      const selectedDate = new Date(editedRecord.nextActionDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        setNextActionDateError('לא ניתן לבחור תאריך עבר');
        return;
      }
    }
    
    setIsSaving(true);
    await onSave(editedRecord);
    setIsSaving(false);
  };

  const validatePhone = (phone) => {
    if (!phone || phone.trim() === '') return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 7 || cleaned.length > 11) {
      return 'מספר טלפון לא תקין';
    }
    return '';
  };

  const validateMonths = (months) => {
    if (months === '' || months === null) return '';
    const num = parseInt(months);
    if (isNaN(num) || num < 0) {
      return 'חודשי פיגור חייב להיות מספר שלם חיובי';
    }
    return '';
  };

  const validatePayment = (payment) => {
    const num = parseFloat(payment);
    if (isNaN(num) || num < 0) {
      return 'תשלום חודשי חייב להיות מספר תקין';
    }
    return '';
  };

  const handleEditPhoneOwner = () => {
    setPhoneOwnerValue(editedRecord?.phoneOwner || '');
    setPhoneOwnerError('');
    setEditingPhoneOwner(true);
  };

  const handleCancelPhoneOwner = () => {
    setEditingPhoneOwner(false);
    setPhoneOwnerError('');
  };

  const handleSavePhoneOwner = async () => {
    const error = validatePhone(phoneOwnerValue);
    if (error) {
      setPhoneOwnerError(error);
      return;
    }

    setSavingPhoneOwner(true);
    try {
      await base44.entities.DebtorRecord.update(record.id, { phoneOwner: phoneOwnerValue });
      setEditedRecord({ ...editedRecord, phoneOwner: phoneOwnerValue });
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      toast.success('טלפון בעלים עודכן בהצלחה');
      setEditingPhoneOwner(false);
    } catch (err) {
      toast.error('שגיאה בעדכון, נסה שוב');
    } finally {
      setSavingPhoneOwner(false);
    }
  };

  const handleEditPhoneTenant = () => {
    setPhoneTenantValue(editedRecord?.phoneTenant || '');
    setPhoneTenantError('');
    setEditingPhoneTenant(true);
  };

  const handleCancelPhoneTenant = () => {
    setEditingPhoneTenant(false);
    setPhoneTenantError('');
  };

  const handleSavePhoneTenant = async () => {
    const error = validatePhone(phoneTenantValue);
    if (error) {
      setPhoneTenantError(error);
      return;
    }

    setSavingPhoneTenant(true);
    try {
      await base44.entities.DebtorRecord.update(record.id, { phoneTenant: phoneTenantValue });
      setEditedRecord({ ...editedRecord, phoneTenant: phoneTenantValue });
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      toast.success('טלפון שוכר עודכן בהצלחה');
      setEditingPhoneTenant(false);
    } catch (err) {
      toast.error('שגיאה בעדכון, נסה שוב');
    } finally {
      setSavingPhoneTenant(false);
    }
  };

  const handleEditPhone = () => {
    setPhoneValue(editedRecord?.phonePrimary || '');
    setPhoneError('');
    setEditingPhone(true);
  };

  const handleCancelPhone = () => {
    setEditingPhone(false);
    setPhoneError('');
  };

  const handleSavePhone = async () => {
    const error = validatePhone(phoneValue);
    if (error) {
      setPhoneError(error);
      return;
    }

    setSavingPhone(true);
    try {
      await base44.entities.DebtorRecord.update(record.id, { phonePrimary: phoneValue });
      setEditedRecord({ ...editedRecord, phonePrimary: phoneValue });
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      toast.success('טלפון עודכן בהצלחה');
      setEditingPhone(false);
    } catch (err) {
      toast.error('שגיאה בעדכון, נסה שוב');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleEditMonths = () => {
    setMonthsValue(editedRecord?.monthsInArrears?.toString() || '');
    setMonthsError('');
    setEditingMonths(true);
  };

  const handleCancelMonths = () => {
    setEditingMonths(false);
    setMonthsError('');
  };

  const handleSaveMonths = async () => {
    const error = validateMonths(monthsValue);
    if (error) {
      setMonthsError(error);
      return;
    }

    setSavingMonths(true);
    try {
      const numValue = monthsValue === '' ? null : parseInt(monthsValue);
      await base44.entities.DebtorRecord.update(record.id, { monthsInArrears: numValue });
      setEditedRecord({ ...editedRecord, monthsInArrears: numValue });
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      toast.success('חודשי פיגור עודכן בהצלחה');
      setEditingMonths(false);
    } catch (err) {
      toast.error('שגיאה בעדכון, נסה שוב');
    } finally {
      setSavingMonths(false);
    }
  };

  const handleEditPayment = () => {
    setPaymentValue(editedRecord?.monthlyPayment?.toString() || '0');
    setPaymentError('');
    setEditingPayment(true);
  };

  const handleCancelPayment = () => {
    setEditingPayment(false);
    setPaymentError('');
  };

  const handleSavePayment = async () => {
    const error = validatePayment(paymentValue);
    if (error) {
      setPaymentError(error);
      return;
    }

    setSavingPayment(true);
    try {
      const numValue = parseFloat(paymentValue);
      await base44.entities.DebtorRecord.update(record.id, { monthlyPayment: numValue });
      setEditedRecord({ ...editedRecord, monthlyPayment: numValue });
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      toast.success('תשלום חודשי עודכן בהצלחה');
      setEditingPayment(false);
    } catch (err) {
      toast.error('שגיאה בעדכון, נסה שוב');
    } finally {
      setSavingPayment(false);
    }
  };

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 md:gap-4 py-2 md:py-3" dir="rtl">
      <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 flex items-center justify-center">
        <Icon className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
      </div>
      <div className="flex-1 text-right">
        <p className="text-xs text-slate-500 font-semibold mb-1">{label}</p>
        <p className="text-sm md:text-base font-bold text-slate-800 break-words">{value || '-'}</p>
      </div>
    </div>
  );

  const EditableInfoRow = ({ icon: Icon, label, value, isEditing, editValue, onEdit, onCancel, onSave, onChange, error, saving, formatDisplay }) => (
    <div className="flex items-start gap-3 md:gap-4 py-2 md:py-3" dir="rtl">
      <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 flex items-center justify-center">
        <Icon className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
      </div>
      <div className="flex-1 text-right">
        <p className="text-xs text-slate-500 font-semibold mb-1">{label}</p>
        {!isEditing ? (
          <div className="flex items-center gap-2 justify-end">
            <p className="text-sm md:text-base font-bold text-slate-800 break-words">
              {formatDisplay ? formatDisplay(value) : (value || '-')}
            </p>
            {isAdmin && (
              <button
                onClick={onEdit}
                className="p-1 hover:bg-slate-200 rounded transition-colors"
                title="ערוך"
              >
                <Pencil className="w-4 h-4 text-slate-600" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              type="text"
              value={editValue}
              onChange={(e) => onChange(e.target.value)}
              className="h-10 rounded-lg text-right"
              dir="rtl"
              disabled={saving}
            />
            {error && (
              <p className="text-xs text-red-600 font-semibold text-right flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {error}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={onCancel}
                disabled={saving}
                className="h-8 px-3 rounded-lg"
              >
                <X className="w-3 h-3 ml-1" />
                ביטול
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={saving}
                className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin">⏳</span>
                    שומר...
                  </span>
                ) : (
                  <>
                    <Check className="w-3 h-3 ml-1" />
                    שמור
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl sm:rounded-3xl w-[95vw] sm:w-full" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-2xl font-bold flex items-center justify-between">
            <span className="bg-gradient-to-l from-slate-800 to-slate-600 bg-clip-text text-transparent">
              פרטי דירה {editedRecord?.apartmentNumber}
            </span>
            {!isAdmin && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mr-2">
                <Lock className="w-4 h-4 ml-2" />
                מצב צפייה
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {!isAdmin && (
          <Alert className="bg-gradient-to-l from-blue-50 to-blue-100 border-blue-300 rounded-xl" dir="rtl">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-blue-600" />
              <AlertDescription className="text-blue-800 font-semibold">
                אתה מחובר כצופה - לא ניתן לערוך נתונים
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="space-y-6 md:space-y-8 py-4" dir="rtl">
          {/* פרטים כלליים */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="space-y-2 bg-slate-50/50 rounded-2xl p-4 md:p-6">
              <h3 className="font-bold text-slate-800 pb-2 md:pb-3 border-b-2 border-blue-200 text-right flex items-center gap-2 text-sm md:text-base">
                <Home className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                פרטים עיקריים
              </h3>
              <InfoRow icon={Home} label="מספר דירה" value={editedRecord?.apartmentNumber} />
              <InfoRow icon={User} label="בעל דירה" value={editedRecord?.ownerName || 'לא צוין'} />
              <EditableInfoRow
                icon={Phone}
                label="טלפון בעלים"
                value={editedRecord?.phoneOwner}
                isEditing={editingPhoneOwner}
                editValue={phoneOwnerValue}
                onEdit={handleEditPhoneOwner}
                onCancel={handleCancelPhoneOwner}
                onSave={handleSavePhoneOwner}
                onChange={setPhoneOwnerValue}
                error={phoneOwnerError}
                saving={savingPhoneOwner}
                formatDisplay={formatPhone}
              />
              <EditableInfoRow
                icon={Phone}
                label="טלפון שוכר"
                value={editedRecord?.phoneTenant}
                isEditing={editingPhoneTenant}
                editValue={phoneTenantValue}
                onEdit={handleEditPhoneTenant}
                onCancel={handleCancelPhoneTenant}
                onSave={handleSavePhoneTenant}
                onChange={setPhoneTenantValue}
                error={phoneTenantError}
                saving={savingPhoneTenant}
                formatDisplay={formatPhone}
              />
              <EditableInfoRow
                icon={Phone}
                label="טלפון להצגה"
                value={editedRecord?.phonePrimary}
                isEditing={editingPhone}
                editValue={phoneValue}
                onEdit={handleEditPhone}
                onCancel={handleCancelPhone}
                onSave={handleSavePhone}
                onChange={setPhoneValue}
                error={phoneError}
                saving={savingPhone}
                formatDisplay={formatPhone}
              />
            </div>
            
            <div className="space-y-2 bg-slate-50/50 rounded-2xl p-4 md:p-6">
              <h3 className="font-bold text-slate-800 pb-2 md:pb-3 border-b-2 border-amber-200 text-right flex items-center gap-2 text-sm md:text-base">
                <Wallet className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
                מידע נוסף
              </h3>
              <EditableInfoRow
                icon={Wallet}
                label="תשלום חודשי"
                value={editedRecord?.monthlyPayment}
                isEditing={editingPayment}
                editValue={paymentValue}
                onEdit={handleEditPayment}
                onCancel={handleCancelPayment}
                onSave={handleSavePayment}
                onChange={setPaymentValue}
                error={paymentError}
                saving={savingPayment}
                formatDisplay={formatCurrency}
              />
            </div>
          </div>

          <Separator className="my-6" />

          {/* נתוני חוב */}
          <div className="bg-gradient-to-l from-slate-50 to-slate-100 rounded-2xl p-4 md:p-6">
            <h3 className="text-base md:text-lg font-bold text-slate-800 mb-3 md:mb-4 flex items-center gap-2 md:gap-3 text-right">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-rose-100 flex items-center justify-center">
                <Wallet className="w-4 h-4 md:w-5 md:h-5 text-rose-600" />
              </div>
              פירוט חובות
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="text-right p-4 md:p-5 bg-white rounded-xl md:rounded-2xl shadow-sm border-r-4 border-rose-500">
                <p className="text-xs text-slate-500 font-bold mb-1 md:mb-2">סה״כ חוב</p>
                <p className="text-xl md:text-2xl font-extrabold text-rose-600">{formatCurrency(record.totalDebt)}</p>
              </div>
              <div className="text-right p-4 md:p-5 bg-white rounded-xl md:rounded-2xl shadow-sm border-r-4 border-amber-500">
                <p className="text-xs text-slate-500 font-bold mb-1 md:mb-2">חוב חודשי</p>
                <p className="text-xl md:text-2xl font-extrabold text-amber-600">{formatCurrency(record.monthlyDebt)}</p>
              </div>
              <div className="text-right p-4 md:p-5 bg-white rounded-xl md:rounded-2xl shadow-sm border-r-4 border-purple-500">
                <p className="text-xs text-slate-500 font-bold mb-1 md:mb-2">חוב מיוחד</p>
                <p className="text-xl md:text-2xl font-extrabold text-purple-600">{formatCurrency(record.specialDebt)}</p>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* שדות עריכה למנהל */}
          {isAdmin && (
            <div className="space-y-4 md:space-y-6 bg-blue-50/30 rounded-2xl p-4 md:p-6">
              <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2 md:gap-3 text-right">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-100 flex items-center justify-center">
                  <Scale className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                </div>
                ניהול משפטי
              </h3>

              <div className="text-right">
                <Label className="text-sm font-bold text-slate-700 mb-2 block">סטטוס משפטי</Label>
                <Select 
                  value={editedRecord?.legal_status_id || ''} 
                  onValueChange={(v) => setEditedRecord({...editedRecord, legal_status_id: v || defaultStatus?.id, legal_status_overridden: true})}
                >
                  <SelectTrigger className="mt-2 h-12 rounded-xl text-right">
                    <SelectValue placeholder="בחר סטטוס משפטי" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {currentStatus && !currentStatus.is_active && (
                      <SelectItem key={currentStatus.id} value={currentStatus.id}>
                        {currentStatus.name} (לא פעיל)
                      </SelectItem>
                    )}
                    {activeLegalStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center gap-2">
                          <Badge className={`${status.color} text-xs transition-colors`}>
                            {status.name}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentStatus && (
                  <div className="mt-2">
                    <Badge className={`${currentStatus.color} transition-colors`}>
                      {currentStatus.name}
                      {!currentStatus.is_active && ' (לא פעיל)'}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="text-right">
                  <Label className="text-sm font-bold text-slate-700 mb-2 block">תאריך קשר אחרון</Label>
                  <Input 
                    type="date" 
                    value={editedRecord?.lastContactDate || ''} 
                    max={getTodayDate()}
                    onChange={(e) => {
                      setEditedRecord({...editedRecord, lastContactDate: e.target.value});
                      setLastContactDateError('');
                    }}
                    className={`mt-2 h-12 rounded-xl text-right ${lastContactDateError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    dir="rtl"
                  />
                  {lastContactDateError && (
                    <p className="text-xs text-red-600 font-semibold mt-2 text-right flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {lastContactDateError}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Label className="text-sm font-bold text-slate-700 mb-2 block">תאריך פעולה הבאה</Label>
                  <Input 
                    type="date" 
                    value={editedRecord?.nextActionDate || ''} 
                    min={getTodayDate()}
                    onChange={(e) => {
                      setEditedRecord({...editedRecord, nextActionDate: e.target.value});
                      setNextActionDateError('');
                    }}
                    className={`mt-2 h-12 rounded-xl text-right ${nextActionDateError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    dir="rtl"
                  />
                  {nextActionDateError && (
                    <p className="text-xs text-red-600 font-semibold mt-2 text-right flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {nextActionDateError}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <Label className="text-sm font-bold text-slate-700 mb-2 block">הערות</Label>
                <Textarea 
                  value={editedRecord?.notes || ''} 
                  onChange={(e) => setEditedRecord({...editedRecord, notes: e.target.value})}
                  placeholder="הוסף הערות..."
                  className="mt-2 rounded-xl text-right resize-none"
                  rows={4}
                  dir="rtl"
                  style={{ direction: 'rtl', textAlign: 'right' }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 md:gap-4 pt-4 md:pt-6 border-t-2" dir="rtl">
          <Button variant="outline" onClick={onClose} className="rounded-xl h-11 md:h-12 px-4 md:px-6 font-semibold w-full sm:w-auto">
            <X className="w-4 h-4 md:w-5 md:h-5 ml-2" />
            סגור
          </Button>
          {isAdmin && (
            <Button onClick={handleSave} disabled={isSaving} className="rounded-xl h-11 md:h-12 px-4 md:px-6 font-semibold bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 w-full sm:w-auto">
              <Save className="w-4 h-4 md:w-5 md:h-5 ml-2" />
              {isSaving ? 'שומר...' : 'שמור שינויים'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}