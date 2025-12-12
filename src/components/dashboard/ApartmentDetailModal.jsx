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

const STATUS_COLORS = {
  'סדיר': 'bg-green-100 text-green-700',
  'חייב': 'bg-yellow-100 text-yellow-700',
  'חייב משמעותי': 'bg-orange-100 text-orange-700',
  'מועמד לתביעה': 'bg-slate-100 text-slate-700',
  'בתביעה': 'bg-red-100 text-red-700',
  'בהסדר': 'bg-blue-100 text-blue-700'
};

export default function ApartmentDetailModal({ record, isOpen, onClose, onSave, isAdmin }) {
  const [editedRecord, setEditedRecord] = useState(record);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setEditedRecord(record);
  }, [record]);

  if (!record) return null;

  const formatCurrency = (num) => 
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(editedRecord);
    setIsSaving(false);
  };

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-700">{value || '-'}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <span>פרטי דירה {editedRecord?.apartmentNumber}</span>
            {!isAdmin && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Lock className="w-3 h-3 ml-1" />
                מצב צפייה
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {!isAdmin && (
          <Alert className="bg-blue-50 border-blue-200">
            <Lock className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              אתה מחובר כצופה - לא ניתן לערוך נתונים
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          {/* פרטים כלליים */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700 pb-2 border-b">פרטי דירה</h3>
              <InfoRow icon={Home} label="מספר דירה" value={editedRecord?.apartmentNumber} />
              <InfoRow icon={User} label="בעל דירה" value={editedRecord?.ownerName || 'לא צוין'} />
              <InfoRow icon={Phone} label="טלפון" value={editedRecord?.phonePrimary || 'אין מספר'} />
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700 pb-2 border-b">מידע נוסף</h3>
              <InfoRow icon={Calendar} label="חודשי פיגור" value={editedRecord?.monthsInArrears || 0} />
              <InfoRow icon={Wallet} label="תשלום חודשי" value={formatCurrency(editedRecord?.monthlyPayment)} />
            </div>
          </div>

          <Separator />

          {/* נתוני חוב */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              פירוט חובות
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-xs text-slate-500">סה״כ חוב</p>
                <p className="text-lg font-bold text-rose-600">{formatCurrency(record.totalDebt)}</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-xs text-slate-500">חוב חודשי</p>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(record.monthlyDebt)}</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-xs text-slate-500">חוב מיוחד</p>
                <p className="text-lg font-bold text-purple-600">{formatCurrency(record.specialDebt)}</p>
              </div>
            </div>
          </div>

          {/* פרטים נוספים */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-slate-500">פרטים חודשיים</Label>
              <p className="text-sm bg-slate-50 rounded p-2 mt-1">{record.detailsMonthly || 'אין'}</p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">פרטים מיוחדים</Label>
              <p className="text-sm bg-slate-50 rounded p-2 mt-1">{record.detailsSpecial || 'אין'}</p>
            </div>
          </div>

          <Separator />

          {/* שדות עריכה למנהל */}
          {isAdmin && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                <Scale className="w-4 h-4" />
                ניהול משפטי
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>שלב משפטי</Label>
                  <Select 
                    value={editedRecord?.legalStage || 'אין'} 
                    onValueChange={(v) => setEditedRecord({...editedRecord, legalStage: v})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="אין">אין</SelectItem>
                      <SelectItem value="פנייה ראשונית">פנייה ראשונית</SelectItem>
                      <SelectItem value="מכתב התראה">מכתב התראה</SelectItem>
                      <SelectItem value="בתביעה">בתביעה</SelectItem>
                      <SelectItem value="הסדר תשלומים">הסדר תשלומים</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>סטטוס (ידני)</Label>
                  <Select 
                    value={editedRecord?.status || 'סדיר'} 
                    onValueChange={(v) => setEditedRecord({...editedRecord, status: v})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="סדיר">סדיר</SelectItem>
                      <SelectItem value="חייב">חייב</SelectItem>
                      <SelectItem value="חייב משמעותי">חייב משמעותי</SelectItem>
                      <SelectItem value="מועמד לתביעה">מועמד לתביעה</SelectItem>
                      <SelectItem value="בתביעה">בתביעה</SelectItem>
                      <SelectItem value="בהסדר">בהסדר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>תאריך קשר אחרון</Label>
                  <Input 
                    type="date" 
                    value={editedRecord?.lastContactDate || ''} 
                    onChange={(e) => setEditedRecord({...editedRecord, lastContactDate: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>תאריך פעולה הבאה</Label>
                  <Input 
                    type="date" 
                    value={editedRecord?.nextActionDate || ''} 
                    onChange={(e) => setEditedRecord({...editedRecord, nextActionDate: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>הערות</Label>
                <Textarea 
                  value={editedRecord?.notes || ''} 
                  onChange={(e) => setEditedRecord({...editedRecord, notes: e.target.value})}
                  placeholder="הוסף הערות..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 ml-2" />
            סגור
          </Button>
          {isAdmin && (
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 ml-2" />
              {isSaving ? 'שומר...' : 'שמור'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}