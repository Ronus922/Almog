import React, { useState } from 'react';
import AppModal from "@/components/ui/app-modal";
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
  Save, X, AlertTriangle, Lock, User, Pencil, Check, MessageSquare, FileDown
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/AuthContext';
import InlineEditableField from './InlineEditableField';
import DebtSeverityBadge from './DebtSeverityBadge';
import { calculateDebtStatusDebug } from '../utils/debtStatusCalculator';
import CommentsSection from '../comments/CommentsSection';

export default function ApartmentDetailModal({ record, isOpen, onClose, onSave, isAdmin, settings }) {
  const { currentUser } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const { data: allStatuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => base44.entities.Status.list('order'),
  });

  const legalStatuses = allStatuses.filter(s => s.type === 'LEGAL');
  const activeLegalStatuses = legalStatuses.filter(s => s.is_active);
  
  // State מקומי לסטטוס משפטי - נפרד מ-editedRecord
  const [selectedLegalStatusId, setSelectedLegalStatusId] = useState('');
  const [editedRecord, setEditedRecord] = useState(record);
  const [isSaving, setIsSaving] = useState(false);
  const [lastContactDateError, setLastContactDateError] = useState('');
  const [nextActionDateError, setNextActionDateError] = useState('');

  const [savingStatus, setSavingStatus] = useState(false);
  const [statusSaveError, setStatusSaveError] = useState('');
  const statusRequestIdRef = React.useRef(0);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!record) return;
    
    setEditedRecord(record);
    
    // אתחול state מקומי לסטטוס משפטי
    const initialStatusId = record.legal_status_id || '';
    setSelectedLegalStatusId(String(initialStatusId));
    
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

  // Computed phone for display - choose first available
  const displayPhone = editedRecord?.phoneOwner || editedRecord?.phoneTenant || record.phoneOwner || record.phoneTenant;

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

  // Validation functions
  const validatePhone = (phone) => {
    if (!phone || phone.trim() === '') return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 7 || cleaned.length > 11) {
      return 'מספר טלפון לא תקין';
    }
    return '';
  };

  // Universal field save handler with optimistic update
  const handleFieldSave = async (fieldName, value) => {
    console.log('[FIELD_SAVE] Saving field', fieldName, value, record.id);
    
    const updatePayload = { [fieldName]: value };
    
    // Set phonesManualOverride for phone fields
    if (['phoneOwner', 'phoneTenant', 'phonePrimary'].includes(fieldName)) {
      updatePayload.phonesManualOverride = true;
    }
    
    // Optimistic update - מיידי
    setEditedRecord(prev => ({ ...prev, ...updatePayload }));
    
    queryClient.setQueryData(['debtorRecords'], (old) => {
      if (!old) return old;
      return old.map(r => r.id === record.id ? { ...r, ...updatePayload } : r);
    });
    
    // Server update
    await base44.entities.DebtorRecord.update(record.id, updatePayload);
    
    toast.success(`${fieldName === 'phoneOwner' ? 'טלפון בעלים' : fieldName === 'phoneTenant' ? 'טלפון שוכר' : fieldName === 'phonePrimary' ? 'טלפון להצגה' : 'שדה'} עודכן בהצלחה`);
  };

  const handleLegalStatusChange = async (newStatusId) => {
    // ולידציה בסיסית
    if (!newStatusId || newStatusId === '') {
      setStatusSaveError('חובה לבחור סטטוס');
      return;
    }

    if (!currentUser) {
      setStatusSaveError('משתמש לא מחובר');
      return;
    }

    // Last-write-wins: increment request ID
    const currentRequestId = ++statusRequestIdRef.current;

    // שמירת ערך ישן לצורך rollback
    const oldStatusId = editedRecord.legal_status_id;
    const newStatus = legalStatuses.find(s => s.id === newStatusId);
    const oldStatus = legalStatuses.find(s => s.id === oldStatusId);

    // 1) OPTIMISTIC UPDATE - מיידי לפני השרת
    setSelectedLegalStatusId(String(newStatusId));
    setStatusSaveError('');
    setSavingStatus(true);

    // עדכון מיידי בטבלת הדשבורד (cache)
    queryClient.setQueryData(['debtorRecords'], (old) => {
      if (!old) return old;
      return old.map(r => r.id === record.id ? { ...r, legal_status_id: newStatusId } : r);
    });

    // עדכון מיידי ב-state המקומי
    setEditedRecord(prev => ({
      ...prev,
      legal_status_id: newStatusId
    }));

    // 2) שליחה לשרת (ברקע, לא blocking)
    const now = new Date().toISOString();
    const updatePayload = {
      legal_status_id: newStatusId,
      legal_status_source: 'MANUAL',
      legal_status_lock: true,
      legal_status_updated_at: now,
      legal_status_updated_by: currentUser.email || currentUser.username
    };

    // Promise שלא מבוטל על unmount
    (async () => {
      try {
        const updatedRecord = await base44.entities.DebtorRecord.update(record.id, updatePayload);

        // Last-write-wins: ignore stale responses
        if (currentRequestId !== statusRequestIdRef.current) {
          console.log('[STATUS CHANGE] Ignoring stale response', { currentRequestId, latest: statusRequestIdRef.current });
          return;
        }

        // רישום היסטוריה (non-blocking)
        base44.entities.LegalStatusHistory.create({
          debtor_record_id: record.id,
          apartment_number: record.apartmentNumber,
          old_status_id: oldStatusId || null,
          old_status_name: oldStatus?.name || 'לא הוגדר',
          new_status_id: newStatusId,
          new_status_name: newStatus?.name || '',
          changed_at: now,
          changed_by: currentUser.email || currentUser.username,
          source: 'MANUAL'
        }).catch(() => {});

        // עדכון נקודתי של cache (ללא refetch כבד)
        queryClient.setQueryData(['debtorRecords'], (old) => {
          if (!old) return old;
          return old.map(r => r.id === record.id ? { ...r, ...updatedRecord } : r);
        });

        setEditedRecord(prev => ({
          ...prev,
          legal_status_id: updatedRecord.legal_status_id,
          legal_status_source: 'MANUAL',
          legal_status_lock: true,
          legal_status_updated_at: updatedRecord.legal_status_updated_at || now,
          legal_status_updated_by: updatedRecord.legal_status_updated_by || (currentUser.email || currentUser.username)
        }));

        setSavingStatus(false);
        
      } catch (err) {
        // Last-write-wins: ignore stale errors
        if (currentRequestId !== statusRequestIdRef.current) {
          return;
        }

        // ROLLBACK מיידי
        setSelectedLegalStatusId(String(oldStatusId || ''));
        
        queryClient.setQueryData(['debtorRecords'], (old) => {
          if (!old) return old;
          return old.map(r => r.id === record.id ? { ...r, legal_status_id: oldStatusId } : r);
        });

        setEditedRecord(prev => ({
          ...prev,
          legal_status_id: oldStatusId
        }));

        setStatusSaveError('שמירה נכשלה');
        setSavingStatus(false);
      }
    })();
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { loadHebrewFont } = await import('../export/hebrewFont');
      
      // Fetch comments
      const comments = await base44.entities.Comment.filter({ debtor_record_id: record.id }, '-created_date');
      const currentStatus = legalStatuses.find(s => s.id === selectedLegalStatusId);
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Add Hebrew font
      const hebrewFont = await loadHebrewFont();
      if (hebrewFont) {
        doc.addFileToVFS('Heebo-Regular.ttf', hebrewFont);
        doc.addFont('Heebo-Regular.ttf', 'Heebo', 'normal');
        doc.setFont('Heebo');
      }
      doc.setR2L(true);

      let yPos = 20;
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - (2 * margin);

      // Title
      doc.setFontSize(22);
      doc.setTextColor(30, 64, 175);
      doc.text(`פרטי דירה ${record.apartmentNumber}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 10;

      // Section: פרטים עיקריים
      doc.setFontSize(16);
      doc.setTextColor(51, 65, 85);
      yPos += 5;
      doc.text('פרטים עיקריים', pageWidth - margin, yPos, { align: 'right' });
      yPos += 8;

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      const details = [
        ['מספר דירה:', record.apartmentNumber],
        ['בעל דירה:', record.ownerName || 'לא צוין'],
        ['טלפון בעלים:', formatPhone(record.phoneOwner)],
        ['טלפון שוכר:', formatPhone(record.phoneTenant)]
      ];

      details.forEach(([label, value]) => {
        doc.setFont('Heebo', 'bold');
        doc.text(label, pageWidth - margin, yPos, { align: 'right' });
        doc.setFont('Heebo', 'normal');
        doc.text(String(value), pageWidth - margin - 45, yPos, { align: 'right' });
        yPos += 7;
      });

      // Section: סטטוס משפטי
      if (currentStatus) {
        yPos += 5;
        doc.setFontSize(16);
        doc.setTextColor(51, 65, 85);
        doc.text('סטטוס משפטי', pageWidth - margin, yPos, { align: 'right' });
        yPos += 8;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('Heebo', 'bold');
        doc.text(currentStatus.name, pageWidth - margin, yPos, { align: 'right' });
        yPos += 7;
        
        if (editedRecord?.legal_status_updated_at) {
          doc.setFont('Heebo', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          doc.text(`עודכן: ${new Date(editedRecord.legal_status_updated_at).toLocaleString('he-IL')}`, pageWidth - margin, yPos, { align: 'right' });
          yPos += 5;
        }
      }

      // Section: פירוט חובות
      yPos += 5;
      doc.setFontSize(16);
      doc.setTextColor(153, 27, 27);
      doc.text('פירוט חובות', pageWidth - margin, yPos, { align: 'right' });
      yPos += 8;

      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38);
      doc.setFont('Heebo', 'bold');
      doc.text(`סה״כ חוב: ${formatCurrency(record.totalDebt)}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 8;

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont('Heebo', 'normal');
      doc.text(`דמי ניהול: ${formatCurrency(record.monthlyDebt)}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 6;
      doc.text(`מים חמים: ${formatCurrency(record.specialDebt)}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 10;

      // Section: הערות
      if (comments && comments.length > 0) {
        doc.setFontSize(16);
        doc.setTextColor(51, 65, 85);
        doc.text('הערות ותיעוד', pageWidth - margin, yPos, { align: 'right' });
        yPos += 8;

        comments.forEach(comment => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(10);
          doc.setTextColor(30, 64, 175);
          doc.setFont('Heebo', 'bold');
          doc.text(comment.author_name, pageWidth - margin, yPos, { align: 'right' });
          
          doc.setTextColor(148, 163, 184);
          doc.setFont('Heebo', 'normal');
          doc.text(new Date(comment.created_date).toLocaleDateString('he-IL'), margin, yPos, { align: 'left' });
          yPos += 6;
          
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          const lines = doc.splitTextToSize(comment.content, contentWidth - 10);
          lines.forEach(line => {
            if (yPos > 280) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(line, pageWidth - margin - 5, yPos, { align: 'right' });
            yPos += 5;
          });
          yPos += 5;
        });
      }

      doc.save(`דירה_${record.apartmentNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF הורד בהצלחה');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('שגיאה בייצוא PDF');
    } finally {
      setIsExporting(false);
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



  const currentStatusLabel = legalStatuses.find(s => s.id === selectedLegalStatusId)?.name || 'לא הוגדר';
  const currentStatusColor = legalStatuses.find(s => s.id === selectedLegalStatusId)?.color || 'bg-slate-100 text-slate-700';

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      title={`פרטי דירה ${record.apartmentNumber}`}
      subtitle={`${record.ownerName || 'ללא שם בעלים'} • ${displayPhone ? `טלפון: ${formatPhone(displayPhone)}` : 'ללא טלפון'}`}
      statusPill={{
        text: currentStatusLabel,
        color: `${currentStatusColor} border`
      }}
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="rounded-xl h-11 px-6 font-semibold">
            <X className="w-5 h-5 ml-2" />
            סגור
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPDF} 
            disabled={isExporting}
            className="rounded-xl h-11 px-6 font-semibold"
          >
            <FileDown className="w-5 h-5 ml-2" />
            {isExporting ? 'מייצא...' : 'יצא ל-PDF'}
          </Button>
          {isAdmin && (
            <Button onClick={handleSave} disabled={isSaving} className="rounded-xl h-11 px-6 font-semibold bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
              <Save className="w-5 h-5 ml-2" />
              {isSaving ? 'שומר...' : 'שמור שינויים'}
            </Button>
          )}
        </>
      }
    >
        {!isAdmin && (
          <Alert className="bg-gradient-to-l from-blue-50 to-blue-100 border-blue-300 rounded-xl mb-6" dir="rtl">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-blue-600" />
              <AlertDescription className="text-blue-800 font-semibold">
                אתה מחובר כצופה - לא ניתן לערוך נתונים
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="space-y-2 md:space-y-3 py-1" dir="rtl">
          {/* פרטים כלליים */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1 bg-slate-50/50 rounded-2xl p-3 md:p-4">
              <h3 className="font-bold text-slate-800 pb-2 border-b-2 border-blue-200 text-right flex items-center gap-2 text-sm md:text-base mb-2">
                <Home className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                פרטים עיקריים
              </h3>
              <InfoRow icon={Home} label="מספר דירה" value={editedRecord?.apartmentNumber} />
              <InfoRow icon={User} label="בעל דירה" value={editedRecord?.ownerName || 'לא צוין'} />
            </div>
            
            <div className="space-y-1 bg-slate-50/50 rounded-2xl p-3 md:p-4">
              <h3 className="font-bold text-slate-800 pb-2 md:pb-3 border-b-2 border-amber-200 text-right flex items-center gap-2 text-sm md:text-base">
                <FileText className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
                מידע נוסף
              </h3>
              <InfoRow 
                icon={FileText} 
                label="פרטים מהייבוא" 
                value={editedRecord?.detailsMonthly || 'אין נתונים'} 
              />
              
              <div className="flex items-start gap-3 md:gap-4 py-2 md:py-3" dir="rtl">
                <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-xs text-slate-500 font-semibold mb-1">דמי ניהול לחודשים:</p>
                  <div className="text-sm text-slate-700 bg-white rounded-lg p-3 border border-slate-200">
                    {editedRecord?.managementMonthsRaw ? (
                      <div className="space-y-1">
                        {editedRecord.managementMonthsRaw.split(/[,،\n]/).map((item, idx) => {
                          const trimmed = item.trim();
                          return trimmed ? (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="text-blue-600 font-bold">•</span>
                              <span className="flex-1">{trimmed}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <span className="text-slate-500">אין נתונים</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-1 md:my-2" />

          {/* טלפונים */}
          <div className="bg-slate-50/50 rounded-2xl p-3 md:p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
              <InlineEditableField
                icon={Phone}
                label="טלפון בעלים"
                value={editedRecord?.phoneOwner}
                recordId={record.id}
                fieldName="phoneOwner"
                isAdmin={isAdmin}
                onSave={handleFieldSave}
                formatDisplay={formatPhone}
                validate={validatePhone}
              />

              <InlineEditableField
                icon={Phone}
                label="טלפון שוכר"
                value={editedRecord?.phoneTenant}
                recordId={record.id}
                fieldName="phoneTenant"
                isAdmin={isAdmin}
                onSave={handleFieldSave}
                formatDisplay={formatPhone}
                validate={validatePhone}
              />
            </div>
          </div>

          <Separator className="my-1 md:my-2" />

          {/* נתוני חוב */}
          <div className="bg-gradient-to-l from-slate-50 to-slate-100 rounded-2xl p-3 md:p-4">
            <h3 className="text-base md:text-lg font-bold text-slate-800 mb-2 md:mb-3 flex items-center gap-2 md:gap-3 text-right">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-rose-100 flex items-center justify-center">
                <Wallet className="w-4 h-4 md:w-5 md:h-5 text-rose-600" />
              </div>
              פירוט חובות
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
              <div className="text-center p-4 md:p-5 bg-white rounded-xl md:rounded-2xl shadow-sm border-r-4 border-rose-500">
                <p className="text-xs text-slate-500 font-bold mb-1 md:mb-2">סה״כ חוב</p>
                <p className="text-sm md:text-base font-bold text-rose-600">{formatCurrency(record.totalDebt)}</p>
              </div>
              <div className="text-center p-4 md:p-5 bg-white rounded-xl md:rounded-2xl shadow-sm border-r-4 border-amber-500">
                <p className="text-xs text-slate-500 font-bold mb-1 md:mb-2">דמי ניהול</p>
                <p className="text-sm md:text-base font-bold text-amber-600">{formatCurrency(record.monthlyDebt)}</p>
              </div>
              <div className="text-center p-4 md:p-5 bg-white rounded-xl md:rounded-2xl shadow-sm border-r-4 border-purple-500">
                <p className="text-xs text-slate-500 font-bold mb-1 md:mb-2">מים חמים</p>
                <p className="text-sm md:text-base font-bold text-purple-600">{formatCurrency(record.specialDebt)}</p>
              </div>
            </div>
          </div>

          <Separator className="my-1 md:my-2" />

          {/* שדות עריכה למנהל */}
          {isAdmin && (
            <div className="space-y-2 md:space-y-3 bg-blue-50/30 rounded-2xl p-3 md:p-4">
              <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2 md:gap-3 text-right">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-100 flex items-center justify-center">
                  <Scale className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                </div>
                ניהול משפטי
              </h3>

              <div className="text-right">
                <Label className="text-sm font-bold text-slate-700 mb-2 block">סטטוס משפטי</Label>
                <Select 
                  value={selectedLegalStatusId} 
                  onValueChange={handleLegalStatusChange}
                  disabled={!editedRecord || activeLegalStatuses.length === 0 || savingStatus}
                >
                  <SelectTrigger className="mt-2 h-12 rounded-xl text-right">
                    <SelectValue placeholder={activeLegalStatuses.length === 0 ? "אין סטטוסים זמינים" : "בחר סטטוס משפטי"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl z-[9999]" position="popper">
                    {activeLegalStatuses.map((status) => (
                      <SelectItem key={status.id} value={String(status.id)}>
                        <div className="flex items-center gap-2">
                          <Badge className={`${status.color} text-xs transition-all duration-200 hover:opacity-80`}>
                            {status.name}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* סטטוס נוכחי + מידע Audit */}
                <div className="mt-3 space-y-2">
                  {(() => {
                    const currentStatus = legalStatuses.find(s => s.id === selectedLegalStatusId);
                    return currentStatus && (
                      <div className="flex items-center gap-2">
                        <Badge className={`${currentStatus.color} transition-all duration-200 hover:opacity-80`}>
                          {currentStatus.name}
                        </Badge>
                        {savingStatus && (
                          <span className="text-xs text-blue-600 font-semibold">שומר...</span>
                        )}
                        {statusSaveError && (
                          <span className="text-xs text-red-600 font-semibold">{statusSaveError}</span>
                        )}
                      </div>
                    );
                  })()}

                  {!selectedLegalStatusId && (
                    <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                      לא הוגדר סטטוס משפטי
                    </div>
                  )}

                  {editedRecord?.legal_status_updated_at && (
                    <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">עודכן לאחרונה:</span>
                        <span>{new Date(editedRecord.legal_status_updated_at).toLocaleString('he-IL')}</span>
                      </div>
                      {editedRecord.legal_status_updated_by && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-semibold">על ידי:</span>
                          <span>{editedRecord.legal_status_updated_by}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>



              <div className="text-right">
                <Label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  הערות ותיעוד
                </Label>
                <CommentsSection
                  debtorRecordId={record.id}
                  apartmentNumber={record.apartmentNumber}
                  currentUser={currentUser}
                  isAdmin={isAdmin}
                />
              </div>
            </div>
          )}
        </div>
    </AppModal>
  );
}