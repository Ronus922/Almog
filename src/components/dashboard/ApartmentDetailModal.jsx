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
  Save, X, AlertTriangle, Lock, User, Pencil, Check, MessageSquare, FileDown, Printer, History, CalendarClock } from
"lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAlert } from '@/components/notifications/AlertContext';
import { useAuth } from '@/components/auth/AuthContext';
import InlineEditableField from './InlineEditableField';
import DebtSeverityBadge from './DebtSeverityBadge';
import { calculateDebtStatusDebug } from '../utils/debtStatusCalculator';
import CommentsSection from '../comments/CommentsSection';
import { getPhonePrimaryForTable } from '../utils/phoneDisplay';

export default function ApartmentDetailModal({ record, isOpen, onClose, onSave, isAdmin, settings }) {
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();
  const [isExporting, setIsExporting] = useState(false);
  const { data: allStatuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => base44.entities.Status.list('order')
  });

  const legalStatuses = allStatuses.filter((s) => s.type === 'LEGAL');
  const activeLegalStatuses = legalStatuses.filter((s) => s.is_active);

  // State מקומי לסטטוס משפטי - נפרד מ-editedRecord
  const [selectedLegalStatusId, setSelectedLegalStatusId] = useState('');
  const [editedRecord, setEditedRecord] = useState(record);
  const [isSaving, setIsSaving] = useState(false);
  const [lastContactDateError, setLastContactDateError] = useState('');
  const [nextActionDateError, setNextActionDateError] = useState('');

  const [savingStatus, setSavingStatus] = useState(false);
  const [statusSaveError, setStatusSaveError] = useState('');
  const statusRequestIdRef = React.useRef(0);
  
  const [phoneEditMode, setPhoneEditMode] = useState(null);
  const [phoneEditValue, setPhoneEditValue] = useState('');

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

  // Computed phone for display - same logic as table
  const displayPhone = getPhonePrimaryForTable(editedRecord || record);

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
    queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
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
    setEditedRecord((prev) => ({ ...prev, ...updatePayload }));

    queryClient.setQueryData(['debtorRecords'], (old) => {
      if (!old) return old;
      return old.map((r) => r.id === record.id ? { ...r, ...updatePayload } : r);
    });

    // Server update
    await base44.entities.DebtorRecord.update(record.id, updatePayload);

    // רענן את ה-cache מהשרת
    queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });

    showAlert(`${fieldName === 'phoneOwner' ? 'טלפון בעלים' : fieldName === 'phoneTenant' ? 'טלפון שוכר' : fieldName === 'phonePrimary' ? 'טלפון להצגה' : 'שדה'} עודכן בהצלחה`, 'success');
  };

  const handleLegalStatusChange = async (newStatusId) => {
    // טיפול בנקה סטטוס — העברה לטאב חייבים
    if (newStatusId === '__clear__') {
      newStatusId = null;
    }

    if (!currentUser) {
      setStatusSaveError('משתמש לא מחובר');
      return;
    }

    // Last-write-wins: increment request ID
    const currentRequestId = ++statusRequestIdRef.current;

    // שמירת ערך ישן לצורך rollback
    const oldStatusId = editedRecord.legal_status_id;
    const newStatus = legalStatuses.find((s) => s.id === newStatusId);
    const oldStatus = legalStatuses.find((s) => s.id === oldStatusId);

    // 1) OPTIMISTIC UPDATE - מיידי לפני השרת
    setSelectedLegalStatusId(newStatusId ? String(newStatusId) : '');
    setStatusSaveError('');
    setSavingStatus(true);

    // עדכון מיידי בטבלת הדשבורד (cache)
    queryClient.setQueryData(['debtorRecords'], (old) => {
      if (!old) return old;
      return old.map((r) => r.id === record.id ? { ...r, legal_status_id: newStatusId || null, isArchived: record.isArchived && !newStatusId ? false : r.isArchived } : r);
    });

    // עדכון מיידי ב-state המקומי
    setEditedRecord((prev) => ({
      ...prev,
      legal_status_id: newStatusId || null
    }));

    // 2) שליחה לשרת (ברקע, לא blocking)
    const now = new Date().toISOString();

    // אם משנים סטטוס — מוציאים מארכיון אוטומטית
    const shouldUnarchive = record.isArchived === true;

    const updatePayload = {
      legal_status_id: newStatusId,
      legal_status_source: 'MANUAL',
      legal_status_lock: true,
      legal_status_updated_at: now,
      legal_status_updated_by: currentUser.email || currentUser.username,
      ...(shouldUnarchive ? { isArchived: false } : {})
    };

    // אופטימיסטי: הוצאה מארכיון
    if (shouldUnarchive) {
      queryClient.setQueryData(['debtorRecords'], (old) => {
        if (!old) return old;
        return old.map((r) => r.id === record.id ? { ...r, isArchived: false, legal_status_id: newStatusId } : r);
      });
      setEditedRecord((prev) => ({ ...prev, isArchived: false, legal_status_id: newStatusId }));
      showAlert('הרשומה הוצאה מהארכיון והועברה לטאב המתאים', 'success');
    }

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

        // שליחת התראות מייל (non-blocking)
        console.log('[EMAIL] Sending notification...', { debtorRecordId: record.id, oldStatusId, newStatusId });
        base44.functions.invoke('sendStatusChangeNotification', {
          debtorRecordId: record.id,
          oldStatusId: oldStatusId,
          newStatusId: newStatusId
        }).then((response) => {
          console.log('[EMAIL CLIENT] ✅ Full response:', response);
          console.log('[EMAIL CLIENT] Response.data:', response.data);

          if (response.data?.success) {
            const summary = response.data.summary;
            const results = response.data.results || [];

            console.log('[EMAIL CLIENT] Summary:', summary);
            console.log('[EMAIL CLIENT] Results:', results);

            if (summary && summary.success > 0) {
              showAlert(`✉️ נשלחו ${summary.success} מיילים בהצלחה`, 'success');

              if (summary.failed > 0) {
                const failedEmails = results.filter((r) => !r.success).map((r) => r.email).join(', ');
                showAlert(`${summary.failed} מיילים נכשלו: ${failedEmails}`, 'warning');
              }
            } else if (results.length === 0) {
              showAlert('לא הוגדרו כתובות מייל לסטטוס זה', 'info');
            } else {
              showAlert('כל המיילים נכשלו', 'error');
            }
          } else {
            console.log('[EMAIL CLIENT] ❌ No success in response');
            showAlert('לא התקבלה אישור על שליחת מיילים', 'warning');
          }
        }).catch((err) => {
          console.error('[EMAIL CLIENT] ❌ Error:', err);
          showAlert(`שגיאה בשליחת מייל: ${err.message}`, 'error');
        });

        // עדכון נקודתי של cache (ללא refetch כבד)
        queryClient.setQueryData(['debtorRecords'], (old) => {
          if (!old) return old;
          return old.map((r) => r.id === record.id ? { ...r, ...updatedRecord } : r);
        });

        setEditedRecord((prev) => ({
          ...prev,
          legal_status_id: updatedRecord.legal_status_id,
          legal_status_source: 'MANUAL',
          legal_status_lock: true,
          legal_status_updated_at: updatedRecord.legal_status_updated_at || now,
          legal_status_updated_by: updatedRecord.legal_status_updated_by || currentUser.email || currentUser.username
        }));

        setSavingStatus(false);

      } catch (err) {
        // Last-write-wins: ignore stale errors
        if (currentRequestId !== statusRequestIdRef.current) {
          return;
        }

        // ROLLBACK מיידי
        setSelectedLegalStatusId(oldStatusId ? String(oldStatusId) : '');

        queryClient.setQueryData(['debtorRecords'], (old) => {
          if (!old) return old;
          return old.map((r) => r.id === record.id ? { ...r, legal_status_id: oldStatusId } : r);
        });

        setEditedRecord((prev) => ({
          ...prev,
          legal_status_id: oldStatusId
        }));

        setStatusSaveError('שמירה נכשלה');
        setSavingStatus(false);
      }
    })();
  };

  const handlePrint = async () => {
    try {
      // Fetch comments
      const comments = await base44.entities.Comment.filter({ debtor_record_id: record.id }, '-created_date');
      const currentStatus = legalStatuses.find((s) => s.id === selectedLegalStatusId);

      // Create print window
      const printWindow = window.open('', '_blank');

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>פרטי דירה ${record.apartmentNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;700;800&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: 'Noto Sans Hebrew', Arial, sans-serif;
            }
            
            body {
              direction: rtl;
              padding: 40px;
              background: white;
            }
            
            h1 {
              color: #1e40af;
              border-bottom: 3px solid #1e40af;
              padding-bottom: 10px;
              margin-bottom: 20px;
              font-size: 28px;
              font-weight: 800;
            }
            
            h3 {
              color: #334155;
              margin: 0 0 10px 0;
              font-size: 18px;
              font-weight: 700;
            }
            
            .section {
              margin-bottom: 20px;
              padding: 15px;
              border-radius: 8px;
            }
            
            .section-main {
              background: #f8fafc;
            }
            
            .section-status {
              background: #eff6ff;
            }
            
            .section-debt {
              background: #fef2f2;
              border: 2px solid #fca5a5;
            }
            
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            
            .debt-total {
              font-size: 24px;
              font-weight: bold;
              color: #dc2626;
              margin-bottom: 10px;
            }
            
            .comment-box {
              background: #f8fafc;
              border-right: 4px solid #3b82f6;
              padding: 12px;
              margin-bottom: 10px;
              border-radius: 4px;
            }
            
            .comment-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 12px;
              color: #64748b;
            }
            
            .comment-author {
              font-weight: bold;
              color: #1e40af;
            }
            
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #e2e8f0;
              text-align: center;
              color: #94a3b8;
              font-size: 12px;
            }
            
            @media print {
              body { padding: 20px; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>פרטי דירה ${record.apartmentNumber}</h1>
          
          <div class="section section-main">
            <h3>פרטים עיקריים</h3>
            <div class="grid">
              <div><strong>מספר דירה:</strong> ${record.apartmentNumber}</div>
              <div><strong>בעל דירה:</strong> ${record.ownerName || 'לא צוין'}</div>
              <div><strong>טלפון בעלים:</strong> ${formatPhone(editedRecord?.phoneOwner || record.phoneOwner)}</div>
              <div><strong>טלפון שוכר:</strong> ${formatPhone(editedRecord?.phoneTenant || record.phoneTenant)}</div>
            </div>
          </div>

          ${currentStatus ? `
            <div class="section section-status">
              <h3>סטטוס משפטי</h3>
              <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${currentStatus.name}</div>
              ${editedRecord?.legal_status_updated_at ? `
                <div style="font-size: 12px; color: #64748b;">
                  עודכן: ${new Date(editedRecord.legal_status_updated_at).toLocaleString('he-IL')}
                  ${editedRecord?.legal_status_updated_by ? ` על ידי: ${editedRecord.legal_status_updated_by}` : ''}
                </div>
              ` : ''}
            </div>
          ` : ''}

          <div class="section section-debt">
            <h3 style="color: #991b1b;">פירוט חובות</h3>
            <div class="debt-total">
              סה״כ חוב: ${formatCurrency(record.totalDebt)}
            </div>
            <div class="grid">
              <div><strong>דמי ניהול:</strong> ${formatCurrency(record.monthlyDebt)}</div>
              <div><strong>מים חמים:</strong> ${formatCurrency(record.specialDebt)}</div>
            </div>
          </div>

          ${record.managementMonthsRaw ? `
            <div class="section section-main">
              <h3>דמי ניהול לחודשים</h3>
              <div style="white-space: pre-wrap;">${record.managementMonthsRaw}</div>
            </div>
          ` : ''}

          ${editedRecord?.detailsMonthly ? `
            <div class="section section-main">
              <h3>פרטים מהייבוא</h3>
              <div>${editedRecord.detailsMonthly}</div>
            </div>
          ` : ''}

          ${comments && comments.length > 0 ? `
            <div style="margin-top: 20px;">
              <h3 style="color: #334155; margin-bottom: 10px;">הערות ותיעוד</h3>
              ${comments.map((comment) => `
                <div class="comment-box">
                  <div class="comment-header">
                    <span class="comment-author">${comment.author_name}</span>
                    <span>${new Date(comment.created_date).toLocaleString('he-IL')}</span>
                  </div>
                  <div style="white-space: pre-wrap;">${comment.content}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="footer">
            נוצר ב-${new Date().toLocaleString('he-IL')} • מערכת ניהול חייבים
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };

    } catch (error) {
      console.error('Print error:', error);
      showAlert('שגיאה בהדפסה', 'error');
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // Fetch comments
      const comments = await base44.entities.Comment.filter({ debtor_record_id: record.id }, '-created_date');
      const currentStatus = legalStatuses.find((s) => s.id === selectedLegalStatusId);

      // Create HTML content
      const printContent = document.createElement('div');
      printContent.style.cssText = 'position: absolute; left: -9999px; width: 800px; background: white; padding: 40px; font-family: Arial, sans-serif; direction: rtl;';

      printContent.innerHTML = `
        <div style="direction: rtl; text-align: right;">
          <h1 style="color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; margin-bottom: 20px;">
            פרטי דירה ${record.apartmentNumber}
          </h1>
          
          <div style="margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px;">
            <h3 style="color: #334155; margin: 0 0 10px 0;">פרטים עיקריים</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div><strong>מספר דירה:</strong> ${record.apartmentNumber}</div>
              <div><strong>בעל דירה:</strong> ${record.ownerName || 'לא צוין'}</div>
              <div><strong>טלפון בעלים:</strong> ${formatPhone(editedRecord?.phoneOwner || record.phoneOwner)}</div>
              <div><strong>טלפון שוכר:</strong> ${formatPhone(editedRecord?.phoneTenant || record.phoneTenant)}</div>
            </div>
          </div>

          ${editedRecord?.detailsMonthly ? `
            <div style="margin-bottom: 20px; background: #fef9e7; padding: 15px; border-radius: 8px;">
              <h3 style="color: #334155; margin: 0 0 10px 0;">פרטים מהייבוא</h3>
              <div style="color: #334155;">${editedRecord.detailsMonthly}</div>
            </div>
          ` : ''}

          ${record.managementMonthsRaw ? `
            <div style="margin-bottom: 20px; background: #f0f9ff; padding: 15px; border-radius: 8px;">
              <h3 style="color: #334155; margin: 0 0 10px 0;">דמי ניהול לחודשים</h3>
              <div style="white-space: pre-wrap; color: #334155;">${record.managementMonthsRaw}</div>
            </div>
          ` : ''}

          ${currentStatus ? `
            <div style="margin-bottom: 20px; background: #eff6ff; padding: 15px; border-radius: 8px; border: 2px solid #bfdbfe;">
              <h3 style="color: #334155; margin: 0 0 10px 0;">סטטוס משפטי</h3>
              <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${currentStatus.name}</div>
              ${editedRecord?.legal_status_updated_at ? `
                <div style="font-size: 12px; color: #64748b;">
                  עודכן: ${new Date(editedRecord.legal_status_updated_at).toLocaleString('he-IL')}
                  ${editedRecord?.legal_status_updated_by ? ` על ידי: ${editedRecord.legal_status_updated_by}` : ''}
                </div>
              ` : ''}
            </div>
          ` : ''}

          <div style="margin-bottom: 20px; background: #fef2f2; border: 2px solid #fca5a5; padding: 15px; border-radius: 8px;">
            <h3 style="color: #991b1b; margin: 0 0 10px 0;">פירוט חובות</h3>
            <div style="font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 10px;">
              סה״כ חוב: ${formatCurrency(record.totalDebt)}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div><strong>דמי ניהול:</strong> ${formatCurrency(record.monthlyDebt)}</div>
              <div><strong>מים חמים:</strong> ${formatCurrency(record.specialDebt)}</div>
            </div>
          </div>

          ${comments && comments.length > 0 ? `
            <div style="margin-top: 20px;">
              <h3 style="color: #334155; margin-bottom: 10px;">הערות ותיעוד</h3>
              ${comments.map((comment) => `
                <div style="background: #f8fafc; border-right: 4px solid #3b82f6; padding: 12px; margin-bottom: 10px; border-radius: 4px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; color: #64748b;">
                    <strong style="color: #1e40af;">${comment.author_name}</strong>
                    <span>${new Date(comment.created_date).toLocaleString('he-IL')}</span>
                  </div>
                  <div style="white-space: pre-wrap;">${comment.content}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
            נוצר ב-${new Date().toLocaleString('he-IL')} • מערכת ניהול חייבים
          </div>
        </div>
      `;

      document.body.appendChild(printContent);

      // Convert to canvas
      const canvas = await html2canvas(printContent, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      document.body.removeChild(printContent);

      pdf.save(`דירה_${record.apartmentNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
      showAlert('PDF הורד בהצלחה', 'success');
    } catch (error) {
      console.error('PDF export error:', error);
      showAlert('שגיאה בייצוא PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const InfoRow = ({ icon: Icon, label, value }) =>
  <div className="flex items-start gap-3 md:gap-4 py-2 md:py-3" dir="rtl">
      <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 flex items-center justify-center">
        <Icon className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
      </div>
      <div className="flex-1 text-right">
        <p className="text-xs text-slate-500 font-semibold mb-1">{label}</p>
        <p className="text-sm md:text-base font-bold text-slate-800 break-words">{value || '-'}</p>
      </div>
    </div>;




  const currentStatusLabel = legalStatuses.find((s) => s.id === selectedLegalStatusId)?.name || 'לא הוגדר';
  const currentStatusColor = legalStatuses.find((s) => s.id === selectedLegalStatusId)?.color || 'bg-slate-100 text-slate-700';

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      title={`פרטי דירה ${record.apartmentNumber}`}
      subtitle={`${record.ownerName || 'ללא שם בעלים'} • ${displayPhone ? formatPhone(displayPhone) : 'ללא טלפון'}`}
      statusPill={{
        text: currentStatusLabel,
        color: `${currentStatusColor} border`
      }}
      onHeaderClose={onClose}
      footer={
        <>
          {isAdmin && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="h-10 min-w-[140px] rounded-[14px] border-0 bg-[linear-gradient(180deg,#2d6cff_0%,#1f5cf2_100%)] px-4 text-[15px] font-black text-white shadow-[0_14px_28px_rgba(37,99,235,0.35)] transition hover:brightness-[1.04]"
            >
              <Save className="mr-2 h-3 w-3" />
              {isSaving ? 'שומר...' : 'שמור'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="h-10 min-w-[90px] rounded-[14px] border border-slate-200 bg-white px-3 text-[14px] font-bold text-[#243858] shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition hover:bg-slate-50"
          >
            <FileDown className="mr-1.5 h-3 w-3" />
            PDF
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="h-10 min-w-[90px] rounded-[14px] border border-slate-200 bg-white px-3 text-[14px] font-bold text-[#243858] shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition hover:bg-slate-50"
          >
            <Printer className="mr-1.5 h-3 w-3" />
            הדפסה
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = `/DebtorHistory?id=${record.id}`;
            }}
            className="h-10 min-w-[110px] rounded-[14px] border border-slate-200 bg-white px-3 text-[14px] font-bold text-[#243858] shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition hover:bg-slate-50"
          >
            <History className="mr-1.5 h-3 w-3" />
            היסטוריה
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
              onClose();
            }}
            className="h-10 min-w-[90px] rounded-[14px] border border-slate-200 bg-white px-3 text-[14px] font-bold text-[#243858] shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition hover:bg-slate-50"
          >
            סגור
          </Button>
        </>
      }>

        {!isAdmin && (
          <div className="rounded-[20px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] mb-5" dir="rtl">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-blue-600" />
              <AlertDescription className="text-blue-700 font-semibold">
                אתה מחובר כצופה — לא ניתן לערוך נתונים
              </AlertDescription>
            </div>
          </div>
        )}

        <div className="space-y-5" dir="rtl">
          {/* Two main info cards */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Right card: Main apartment details */}
            <div className="rounded-[20px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#f5f8fc] text-[#7f95b5]">
                  <Home className="w-5 h-5" />
                </div>
                <h3 className="text-[24px] leading-none font-black tracking-[-0.02em] text-[#253b5b] text-right flex-1">פרטים עיקריים</h3>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-3 py-2">
                <div>
                  <p className="text-[13px] font-semibold text-[#95a3b8]">מספר דירה</p>
                  <p className="text-[26px] leading-[1.2] font-black text-[#233754]">{editedRecord?.apartmentNumber}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#f7f9fc] text-[#93a4bc]">
                  <Home className="w-4 h-4" />
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-3 py-2">
                <div>
                  <p className="text-[13px] font-semibold text-[#95a3b8]">בעל הדירה</p>
                  <p className="text-[22px] leading-[1.28] font-black text-[#233754]">{editedRecord?.ownerName || 'לא צוין'}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#f7f9fc] text-[#93a4bc]">
                  <User className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Left card: Additional info */}
            <div className="rounded-[20px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#f5f8fc] text-[#7f95b5]">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-[24px] leading-none font-black tracking-[-0.02em] text-[#253b5b] text-right flex-1">מידע נוסף</h3>
              </div>
              <div className="space-y-3">
                {editedRecord?.detailsMonthly && (
                  <div className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 py-2">
                    <div>
                      <p className="text-[13px] font-semibold text-[#95a3b8]">פרטים מהייבוא</p>
                      <p className="text-[15px] leading-[1.3] font-semibold text-[#233754]">{editedRecord.detailsMonthly}</p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#f7f9fc] text-[#93a4bc]">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>
                )}
                {editedRecord?.managementMonthsRaw && (
                  <div className="space-y-2">
                    <p className="text-[13px] font-semibold text-[#95a3b8]">דמי ניהול לחודשים:</p>
                    <div className="space-y-1 rounded-[16px] border border-slate-200 bg-[#fbfdff] px-4 py-3">
                      {editedRecord.managementMonthsRaw.split(/[,،\n]/).map((item, idx) => {
                        const trimmed = item.trim();
                        return trimmed ? (
                          <div key={idx} className="flex items-start gap-2 text-[13px] text-[#233754]">
                            <span className="flex-shrink-0 text-blue-600 font-bold">•</span>
                            <span className="flex-1">{trimmed}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-[18px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                {isAdmin ? (
                  <button
                    onClick={() => {
                      setPhoneEditMode('phoneOwner');
                      setPhoneEditValue(editedRecord?.phoneOwner || record.phoneOwner || '');
                    }}
                    className="flex items-center gap-2 text-[#7f93b0] hover:text-blue-600 transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#f7f9fc] hover:bg-blue-100 text-[#8ea0b8] hover:text-blue-600 transition-all">
                      <Phone className="w-4 h-4" />
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-[#7f93b0]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#f7f9fc] text-[#8ea0b8]">
                      <Phone className="w-4 h-4" />
                    </div>
                  </div>
                )}
                <div className="space-y-1 text-right">
                  <p className="text-[13px] font-semibold text-[#95a3b8]">טלפון בעלים</p>
                  <p className="text-[26px] leading-none font-black text-[#233754]">{formatPhone(editedRecord?.phoneOwner || record.phoneOwner || 'אין')}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[18px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                {isAdmin ? (
                  <button
                    onClick={() => {
                      setPhoneEditMode('phoneTenant');
                      setPhoneEditValue(editedRecord?.phoneTenant || record.phoneTenant || '');
                    }}
                    className="flex items-center gap-2 text-[#7f93b0] hover:text-blue-600 transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#f7f9fc] hover:bg-blue-100 text-[#8ea0b8] hover:text-blue-600 transition-all">
                      <Phone className="w-4 h-4" />
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-[#7f93b0]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#f7f9fc] text-[#8ea0b8]">
                      <Phone className="w-4 h-4" />
                    </div>
                  </div>
                )}
                <div className="space-y-1 text-right">
                  <p className="text-[13px] font-semibold text-[#95a3b8]">טלפון שוכר</p>
                  <p className="text-[26px] leading-none font-black text-[#233754]">{formatPhone(editedRecord?.phoneTenant || record.phoneTenant || 'אין')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Phone Edit Dialog */}
          {phoneEditMode && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 rounded-2xl" onClick={() => setPhoneEditMode(null)}>
              <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <p className="text-lg font-bold text-[#253b5b] mb-4">עדכן {phoneEditMode === 'phoneOwner' ? 'טלפון בעלים' : 'טלפון שוכר'}</p>
                <Input
                  value={phoneEditValue}
                  onChange={(e) => setPhoneEditValue(e.target.value)}
                  placeholder="הכנס מספר טלפון"
                  className="mb-4 h-12 rounded-lg"
                  dir="rtl"
                />
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setPhoneEditMode(null)}
                    className="h-10 rounded-lg"
                  >
                    ביטול
                  </Button>
                  <Button
                    onClick={async () => {
                      await handleFieldSave(phoneEditMode, phoneEditValue);
                      setPhoneEditMode(null);
                    }}
                    className="h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    שמור
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Debt summary section */}
          <div className="rounded-[22px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#fff1f2] text-[#ff5b6e]">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <h3 className="text-[26px] leading-none font-black tracking-[-0.02em] text-[#253b5b]">פירוט חובות</h3>
                </div>
              </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Total debt KPI */}
              <div className="relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-[#fffefe] px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="absolute inset-y-0 right-0 w-[5px] rounded-r-[20px] bg-[#ff4d6d]" />
                <div className="space-y-2 text-right">
                  <p className="text-[14px] font-semibold text-[#97a6bb]">סה״כ חוב</p>
                  <p className="text-[26px] leading-none font-black tracking-[-0.03em] text-[#ff4d6d]">{formatCurrency(record.totalDebt)}</p>
                </div>
              </div>
              {/* Management fees KPI */}
              <div className="relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-[#fffefe] px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="absolute inset-y-0 right-0 w-[5px] rounded-r-[20px] bg-[#f5a623]" />
                <div className="space-y-2 text-right">
                  <p className="text-[14px] font-semibold text-[#97a6bb]">דמי ניהול</p>
                  <p className="text-[26px] leading-none font-black tracking-[-0.03em] text-[#f59e0b]">{formatCurrency(record.monthlyDebt)}</p>
                </div>
              </div>
              {/* Water fees KPI */}
              <div className="relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-[#fffefe] px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="absolute inset-y-0 right-0 w-[5px] rounded-r-[20px] bg-[#8b5cf6]" />
                <div className="space-y-2 text-right">
                  <p className="text-[14px] font-semibold text-[#97a6bb]">מים חמים</p>
                  <p className="text-[26px] leading-none font-black tracking-[-0.03em] text-[#8b5cf6]">{formatCurrency(record.specialDebt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Legal management section */}
          {isAdmin && (
          <div className="rounded-[22px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#eef4ff] text-[#3b82f6]">
                      <Scale className="w-6 h-6" />
                    </div>
                    <h3 className="text-[26px] leading-none font-black tracking-[-0.02em] text-[#253b5b]">ניהול משפטי</h3>
                  </div>
                </div>

              <div className="space-y-4 text-right">
                <div>
                  <p className="mb-2 text-[14px] font-semibold text-[#7f8ea5]">סטטוס משפטי</p>
                  <Select
                    value={selectedLegalStatusId}
                    onValueChange={handleLegalStatusChange}
                    disabled={!editedRecord || activeLegalStatuses.length === 0 || savingStatus}
                  >
                    <SelectTrigger className="flex min-h-[58px] items-center rounded-[18px] border border-slate-200 bg-[#fbfdff] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] h-[58px] text-[16px] font-semibold text-[#223755]">
                      <SelectValue placeholder={activeLegalStatuses.length === 0 ? "אין סטטוסים זמינים" : "בחר סטטוס משפטי"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl z-[9999]" position="popper">
                       <SelectItem value="__clear__">
                         <span className="inline-flex items-center rounded-full px-3 py-0.5 text-[12px] font-semibold bg-slate-100 text-slate-500">
                           — ללא סטטוס משפטי —
                         </span>
                       </SelectItem>
                       {activeLegalStatuses.map((status) => (
                         <SelectItem key={status.id} value={String(status.id)}>
                           <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-[12px] font-semibold ${status.color || 'bg-slate-100 text-slate-700'}`}>
                             {status.name}
                           </span>
                         </SelectItem>
                       ))}
                     </SelectContent>
                  </Select>

                {/* סטטוס נוכחי + מידע Audit */}
                <div className="mt-3 space-y-2">
                  {(() => {
                const currentStatus = legalStatuses.find((s) => s.id === selectedLegalStatusId);
                return currentStatus &&
                <div className="flex items-center gap-2">
                        


                        {savingStatus &&
                  <span className="text-xs text-blue-600 font-semibold">שומר...</span>
                  }
                        {statusSaveError &&
                  <span className="text-xs text-red-600 font-semibold">{statusSaveError}</span>
                  }
                      </div>;

              })()}

                  {!selectedLegalStatusId &&
              <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                      לא הוגדר סטטוס משפטי
                    </div>
              }

                  {editedRecord?.legal_status_updated_at &&
              <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">עודכן לאחרונה:</span>
                        <span>{new Date(editedRecord.legal_status_updated_at).toLocaleString('he-IL')}</span>
                      </div>
                      {editedRecord.legal_status_updated_by &&
                <div className="flex items-center gap-2 mt-1">
                          <span className="font-semibold">על ידי:</span>
                          <span>{editedRecord.legal_status_updated_by}</span>
                        </div>
                }
                    </div>
              }
                </div>
              </div>



                {/* פעולה הבאה */}
                <div className="rounded-[16px] border border-slate-200 bg-[#f8faff] px-4 py-4">
                  <div className="mb-3 flex items-center gap-2 text-[14px] font-bold text-[#253b5b]">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    פעולה הבאה
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-1.5 text-[12px] font-semibold text-[#7f8ea5]">תאריך פעולה הבאה</p>
                      <input
                        type="date"
                        value={editedRecord?.nextActionDate || ''}
                        onChange={(e) => setEditedRecord(prev => ({ ...prev, nextActionDate: e.target.value }))}
                        className="w-full h-[44px] rounded-[12px] border border-slate-200 bg-white px-3 text-[14px] font-semibold text-[#223755] focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                        dir="rtl"
                        disabled={!isAdmin}
                      />
                      {editedRecord?.nextActionDate && new Date(editedRecord.nextActionDate) < new Date(new Date().toDateString()) && (
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-red-500">
                          <span>⚠️</span> תאריך זה עבר — הרשומה תופיע בטאב "פעולות הבאות"
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="mb-1.5 text-[12px] font-semibold text-[#7f8ea5]">תיאור הפעולה</p>
                      <input
                        type="text"
                        value={editedRecord?.notes?.startsWith('פעולה:') ? editedRecord.notes.split('\n')[0].replace('פעולה: ', '') : ''}
                        placeholder="לדוגמה: שיחת טלפון, שליחת מכתב..."
                        onChange={(e) => {
                          const actionLine = e.target.value ? `פעולה: ${e.target.value}` : '';
                          const existingNotes = (editedRecord?.notes || '').replace(/^פעולה:.*\n?/, '');
                          setEditedRecord(prev => ({ ...prev, notes: actionLine ? `${actionLine}\n${existingNotes}` : existingNotes }));
                        }}
                        className="w-full h-[44px] rounded-[12px] border border-slate-200 bg-white px-3 text-[14px] font-semibold text-[#223755] placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        dir="rtl"
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-[14px] font-bold text-[#253b5b]">
                    <MessageSquare className="w-4 h-4" />
                    הערות ותיעוד
                  </div>
                  <CommentsSection
                    debtorRecordId={record.id}
                    apartmentNumber={record.apartmentNumber}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
    </AppModal>);

}