import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { MessageCircle, Send, Paperclip, X, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

export default function WhatsAppDialog({ open, onClose, record }) {
  const [templateId, setTemplateId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);

  const { data: templates = [] } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: () => base44.entities.WhatsAppTemplate.list(),
  });

  const phone = record?.phonePrimary || record?.phoneOwner || record?.phoneTenant || '';
  const name = record?.ownerName?.split(/[\/,]/)[0]?.trim() || '';
  const debtFormatted = record?.totalDebt
    ? new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(record.totalDebt)
    : '0';

  const monthlyFormatted = record?.monthlyDebt
    ? new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(record.monthlyDebt)
    : '0';
  const specialFormatted = record?.specialDebt
    ? new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(record.specialDebt)
    : '0';

  const applyTemplate = (content) => {
    return content
      .replace(/\{\{name\}\}/g, name || 'דייר יקר')
      .replace(/\{\{debt\}\}/g, debtFormatted)
      .replace(/\{\{monthly\}\}/g, monthlyFormatted)
      .replace(/\{\{special\}\}/g, specialFormatted);
  };

  const handleTemplateChange = (id) => {
    setTemplateId(id);
    if (id === 'custom') {
      setMessage('');
      return;
    }
    const tpl = templates.find((t) => t.id === id);
    if (tpl) setMessage(applyTemplate(tpl.content));
  };

  // Initialize message when dialog opens
  React.useEffect(() => {
    if (open) {
      setAttachedFile(null);
      if (templates.length > 0) {
        const first = templates[0];
        setTemplateId(first.id);
        setMessage(applyTemplate(first.content));
      } else {
        setTemplateId('custom');
        setMessage('');
      }
    }
  }, [open, record?.id, templates.length]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error('ניתן לצרף רק תמונות (JPG, PNG, GIF) או PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('גודל הקובץ לא יכול לעלות על 10MB');
      return;
    }
    setAttachedFile(file);
  };

  const handleSend = async () => {
    if (!phone || !message.trim()) return;
    setSending(true);
    try {
      let fileUrl = null;
      let fileName = null;
      if (attachedFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: attachedFile });
        fileUrl = file_url;
        fileName = attachedFile.name;
      }
      await base44.functions.invoke('sendWhatsApp', { phone, message, fileUrl, fileName });

      // שמור הערה עם תאריך ונוסח ההודעה
      const now = new Date();
      const dateStr = now.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      const commentContent = `📱 הודעת וואטסאפ נשלחה ב-${dateStr} ${timeStr}:\n\n${message}`;
      const user = await base44.auth.me();
      await base44.entities.Comment.create({
        debtor_record_id: record.id,
        apartment_number: record.apartmentNumber,
        content: commentContent,
        author_name: user?.full_name || user?.email || 'מערכת',
        author_email: user?.email || '',
      });

      toast.success('ההודעה נשלחה בהצלחה!');
      onClose();
    } catch (err) {
      toast.error('שגיאה בשליחת ההודעה: ' + (err?.response?.data?.error || err.message));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <MessageCircle className="w-5 h-5 text-green-600" />
            שליחת הודעת וואטסאפ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Recipient info */}
          <div className="bg-slate-50 rounded-xl p-3 text-sm">
            <p className="text-slate-500">שולח אל:</p>
            <p className="font-semibold text-slate-800">{name || '-'} — דירה {record?.apartmentNumber}</p>
            <p className="text-slate-600 font-mono">{phone || 'אין מספר טלפון'}</p>
          </div>

          {/* Template selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-slate-700">בחר תבנית</label>
              <Link to="/WhatsAppTemplates" onClick={onClose} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Settings className="w-3 h-3" />
                נהל תבניות
              </Link>
            </div>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="בחר תבנית..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
                <SelectItem value="custom">✏️ הודעה מותאמת אישית</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">תוכן ההודעה</label>
            <Textarea
              value={message}
              onChange={(e) => { setMessage(e.target.value); setTemplateId('custom'); }}
              rows={6}
              className="rounded-xl text-sm resize-none"
              placeholder="כתוב הודעה..."
              dir="rtl"
            />
            <p className="text-xs text-slate-400 mt-1 text-left">{message.length} תווים</p>
          </div>

          {/* File attachment */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">צרף קובץ (אופציונלי)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,application/pdf"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            {attachedFile ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <Paperclip className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-800 flex-1 truncate">{attachedFile.name}</span>
                <button onClick={() => { setAttachedFile(null); fileInputRef.current.value = ''; }} className="text-slate-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button variant="outline" type="button" className="rounded-xl gap-2" onClick={() => fileInputRef.current.click()}>
                <Paperclip className="w-4 h-4" />
                בחר תמונה / PDF
              </Button>
            )}
          </div>

          <div className="flex gap-2 justify-start pt-1">
            <Button
              onClick={handleSend}
              disabled={sending || !phone || !message.trim()}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <Send className="w-4 h-4" />
              {sending ? 'שולח...' : 'שלח הודעה'}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={sending}>ביטול</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}