import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, ArrowRight, X, ExternalLink, 
  CheckCircle2, AlertCircle, Home, User, Phone 
} from "lucide-react";
import { toast } from 'sonner';

export default function StatusWorkflowWizard({ isOpen, onClose, initialStatusId = null, onOpenDetails }) {
  const [step, setStep] = useState(initialStatusId ? 'working' : 'select');
  const [selectedStatusId, setSelectedStatusId] = useState(initialStatusId || '');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLegalStatusId, setSelectedLegalStatusId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const queryClient = useQueryClient();

  const { data: allStatuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => base44.entities.Status.list('order'),
  });

  const { data: allRecords = [] } = useQuery({
    queryKey: ['debtorRecords'],
    queryFn: () => base44.entities.DebtorRecord.list(),
  });

  const legalStatuses = allStatuses.filter(s => s.type === 'LEGAL');
  const activeLegalStatuses = legalStatuses.filter(s => s.is_active);

  // סינון רשומות לפי הסטטוס שנבחר
  const filteredRecords = allRecords.filter(r => 
    r.legal_status_id === selectedStatusId
  );

  const currentRecord = filteredRecords[currentIndex];
  const totalRecords = filteredRecords.length;
  const progress = totalRecords > 0 ? ((currentIndex) / totalRecords) * 100 : 0;

  useEffect(() => {
    if (currentRecord) {
      setSelectedLegalStatusId(String(currentRecord.legal_status_id || ''));
    }
  }, [currentRecord]);

  const handleStartWorkflow = () => {
    if (!selectedStatusId) {
      toast.error('יש לבחור סטטוס לטיפול');
      return;
    }
    setStep('working');
    setCurrentIndex(0);
  };

  const handleSaveAndNext = async () => {
    if (!currentRecord) return;

    const newStatusId = selectedLegalStatusId;
    const oldStatusId = currentRecord.legal_status_id;

    // אם לא היה שינוי, פשוט עובר הלאה
    if (newStatusId === oldStatusId) {
      handleNext();
      return;
    }

    setIsSaving(true);

    try {
      const currentUser = await base44.auth.me();
      const now = new Date().toISOString();
      
      const updatePayload = {
        legal_status_id: newStatusId,
        legal_status_source: 'MANUAL',
        legal_status_lock: true,
        legal_status_updated_at: now,
        legal_status_updated_by: currentUser.email || currentUser.username
      };

      console.log('[WIZARD] Updating record:', {
        recordId: currentRecord.id,
        apartmentNumber: currentRecord.apartmentNumber,
        oldStatusId,
        newStatusId
      });

      const updatedRecord = await base44.entities.DebtorRecord.update(currentRecord.id, updatePayload);
      
      console.log('[WIZARD] Server response:', {
        statusId: updatedRecord?.legal_status_id,
        lock: updatedRecord?.legal_status_lock
      });

      // רישום היסטוריה
      const newStatus = legalStatuses.find(s => s.id === newStatusId);
      const oldStatus = legalStatuses.find(s => s.id === oldStatusId);

      await base44.entities.LegalStatusHistory.create({
        debtor_record_id: currentRecord.id,
        apartment_number: currentRecord.apartmentNumber,
        old_status_id: oldStatusId || null,
        old_status_name: oldStatus?.name || 'לא הוגדר',
        new_status_id: newStatusId,
        new_status_name: newStatus?.name || '',
        changed_at: now,
        changed_by: currentUser.email || currentUser.username,
        source: 'MANUAL'
      });

      // עדכון cache
      queryClient.setQueryData(['debtorRecords'], (old) => {
        if (!old) return old;
        return old.map(r => r.id === currentRecord.id ? { ...r, ...updatedRecord } : r);
      });

      console.log('[WIZARD SUCCESS] Record updated');

      // מעבר הלאה
      handleNext();
    } catch (err) {
      console.error('[WIZARD ERROR]', err);
      toast.error('שמירה נכשלה – נסה שוב');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalRecords - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // סיום
      toast.success('הושלם הטיפול בכל הרשומות');
      handleClose();
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleOpenDetails = () => {
    if (onOpenDetails && currentRecord) {
      onOpenDetails(currentRecord);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedStatusId('');
    setCurrentIndex(0);
    setSelectedLegalStatusId('');
    onClose();
  };

  const formatPhone = (phone) => {
    if (!phone) return 'אין מספר';
    const cleaned = phone.replace(/\D/g, '');
    if (/^0+$/.test(cleaned)) return 'אין מספר';
    return phone;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800">
            עדכון דירה-דירה
          </DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-6 py-4">
            <div>
              <Label className="text-base font-bold text-slate-700 mb-3 block">
                באיזה סטטוס תרצה לטפל?
              </Label>
              <Select value={selectedStatusId} onValueChange={setSelectedStatusId}>
                <SelectTrigger className="h-12 rounded-xl text-right">
                  <SelectValue placeholder="בחר סטטוס לטיפול..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {activeLegalStatuses.map((status) => {
                    const count = allRecords.filter(r => r.legal_status_id === status.id).length;
                    return (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center gap-3 justify-between w-full">
                          <Badge className={`${status.color} text-xs`}>
                            {status.name}
                          </Badge>
                          <span className="text-sm text-slate-500 font-semibold">
                            {count} דירות
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={handleClose}>
                <X className="w-4 h-4 ml-2" />
                ביטול
              </Button>
              <Button onClick={handleStartWorkflow} disabled={!selectedStatusId}>
                <ArrowLeft className="w-4 h-4 ml-2" />
                התחל עבודה
              </Button>
            </div>
          </div>
        )}

        {step === 'working' && currentRecord && (
          <div className="space-y-6 py-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-700">
                  נותרו לטיפול: {totalRecords - currentIndex}
                </span>
                <span className="text-slate-500">
                  {currentIndex + 1} / {totalRecords}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Record Info */}
            <div className="bg-slate-50 rounded-xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Home className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-semibold mb-1">מספר דירה</p>
                  <p className="text-xl font-bold text-slate-800">{currentRecord.apartmentNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 font-semibold mb-1">בעל דירה</p>
                    <p className="text-sm font-bold text-slate-700">
                      {currentRecord.ownerName || '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 font-semibold mb-1">טלפון</p>
                    <p className="text-sm font-bold text-slate-700" dir="rtl">
                      {formatPhone(currentRecord.phonePrimary)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Selection */}
            <div>
              <Label className="text-base font-bold text-slate-700 mb-3 block">
                סטטוס משפטי
              </Label>
              <Select 
                value={selectedLegalStatusId} 
                onValueChange={setSelectedLegalStatusId}
                disabled={isSaving}
              >
                <SelectTrigger className="h-12 rounded-xl text-right">
                  <SelectValue placeholder="בחר סטטוס..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {activeLegalStatuses.map((status) => (
                    <SelectItem key={status.id} value={String(status.id)}>
                      <div className="flex items-center gap-2">
                        <Badge className={`${status.color} text-xs`}>
                          {status.name}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {currentRecord.legal_status_updated_at && (
                <div className="mt-2 text-xs text-slate-500">
                  עודכן לאחרונה: {new Date(currentRecord.legal_status_updated_at).toLocaleString('he-IL')}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleOpenDetails}
                className="flex-1 sm:flex-none"
              >
                <ExternalLink className="w-4 h-4 ml-2" />
                פתח פרטי דירה
              </Button>

              <div className="flex gap-3 flex-1 justify-end">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  disabled={isSaving}
                >
                  <ArrowRight className="w-4 h-4 ml-2" />
                  דלג
                </Button>
                <Button
                  onClick={handleSaveAndNext}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      שומר...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      שמור והבא
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={handleClose}
              className="w-full"
            >
              <X className="w-4 h-4 ml-2" />
              יציאה
            </Button>
          </div>
        )}

        {step === 'working' && !currentRecord && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">הושלם!</h3>
            <p className="text-slate-600 mb-6">כל הרשומות עודכנו בהצלחה</p>
            <Button onClick={handleClose}>
              סגור
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}