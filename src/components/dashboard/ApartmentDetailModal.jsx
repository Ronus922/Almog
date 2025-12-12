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
  Save, X, AlertTriangle, Lock, User
} from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ApartmentDetailModal({ record, isOpen, onClose, onSave, isAdmin }) {
  const [editedRecord, setEditedRecord] = useState(record);
  const [isSaving, setIsSaving] = useState(false);
  const [lastContactDateError, setLastContactDateError] = useState('');
  const [nextActionDateError, setNextActionDateError] = useState('');

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => base44.entities.Status.list('order'),
  });

  const activeStatuses = statuses.filter(s => s.is_active);

  React.useEffect(() => {
    setEditedRecord(record);
    setLastContactDateError('');
    setNextActionDateError('');
  }, [record]);

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
                פרטי דירה
              </h3>
              <InfoRow icon={Home} label="מספר דירה" value={editedRecord?.apartmentNumber} />
              <InfoRow icon={User} label="בעל דירה" value={editedRecord?.ownerName || 'לא צוין'} />
              <InfoRow icon={Phone} label="טלפון בעלים" value={formatPhone(editedRecord?.phoneOwner)} />
              <InfoRow icon={Phone} label="טלפון שוכר" value={formatPhone(editedRecord?.phoneTenant)} />
              <InfoRow icon={Phone} label="טלפון להצגה" value={formatPhone(editedRecord?.phonePrimary)} />
            </div>
            
            <div className="space-y-2 bg-slate-50/50 rounded-2xl p-4 md:p-6">
              <h3 className="font-bold text-slate-800 pb-2 md:pb-3 border-b-2 border-amber-200 text-right flex items-center gap-2 text-sm md:text-base">
                <Wallet className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
                מידע נוסף
              </h3>
              <InfoRow icon={Calendar} label="חודשי פיגור" value={editedRecord?.monthsInArrears || 0} />
              <InfoRow icon={Wallet} label="תשלום חודשי" value={formatCurrency(editedRecord?.monthlyPayment)} />
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

          {/* פרטים נוספים */}
          <div className="space-y-4">
            <div className="text-right">
              <Label className="text-sm font-bold text-slate-700 mb-2 block">פרטים חודשיים</Label>
              <p className="text-sm bg-slate-50 rounded-xl p-4 text-right" style={{ direction: 'rtl', unicodeBidi: 'plaintext' }}>
                {record.detailsMonthly || 'אין'}
              </p>
            </div>
            <div className="text-right">
              <Label className="text-sm font-bold text-slate-700 mb-2 block">פרטים מיוחדים</Label>
              <p className="text-sm bg-slate-50 rounded-xl p-4 text-right" style={{ direction: 'rtl', unicodeBidi: 'plaintext' }}>
                {record.detailsSpecial || 'אין'}
              </p>
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
                <Label className="text-sm font-bold text-slate-700 mb-2 block">סטטוס</Label>
                <Select 
                  value={editedRecord?.status || ''} 
                  onValueChange={(v) => setEditedRecord({...editedRecord, status: v})}
                  dir="rtl"
                >
                  <SelectTrigger className="mt-2 h-12 rounded-xl text-right" dir="rtl">
                    <SelectValue placeholder="בחר סטטוס..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="rounded-xl">
                    {activeStatuses.map(status => (
                      <SelectItem key={status.id} value={status.name}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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