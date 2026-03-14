import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
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
      <DialogContent 
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-w-lg w-full p-0 overflow-hidden flex flex-col border shadow-lg rounded-lg bg-background"
        style={{ maxHeight: '90vh', maxWidth: '472px' }}
        dir="rtl"
      >
        {/* כפתור סגירה */}
        <DialogClose className="absolute left-4 top-4 rounded-lg bg-white/20 p-1.5 hover:bg-white/40 transition-colors z-10">
          <X className="h-5 w-5 text-white" />
          <span className="sr-only">סגור</span>
        </DialogClose>

        {/* כותרת */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 rounded-t-lg flex items-center gap-3">
          <MessageCircle className="w-5 h-5 text-white" />
          <div>
            <div className="text-white text-lg font-bold">שליחת הודעת וואטסאפ</div>
            <p className="text-green-100 text-sm mt-1">{name || '-'} — דירה {record?.apartmentNumber}</p>
          </div>
        </div>

        {/* תוכן ראשי */}
        <div className="space-y-4 mt-2 flex-1 overflow-y-auto px-6 pt-4 pb-6">
          {/* פרטי נמען */}
          <div className="bg-slate-50 rounded-lg p-4 text-sm border border-slate-200">
            <p className="text-slate-500 text-xs mb-1">פרטי נמען:</p>
            <p className="font-semibold text-slate-800">{phone || 'אין מספר טלפון'}</p>
          </div>

          {/* בחירת תבנית */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">בחר תבנית</label>
              <Link to="/WhatsAppTemplates" onClick={onClose} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Settings className="w-3 h-3" />
                נהל תבניות
              </Link>
            </div>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger className="h-10 border-slate-200 rounded-lg" dir="rtl">
                <SelectValue placeholder="בחר תבנית..." />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
                <SelectItem value="custom">✏️ הודעה מותאמת אישית</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* תוכן ההודעה */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">תוכן ההודעה</label>
            <Textarea
              value={message}
              onChange={(e) => { setMessage(e.target.value); setTemplateId('custom'); }}
              rows={5}
              className="rounded-lg text-sm resize-none border-slate-200 bg-white"
              placeholder="כתוב הודעה..."
              dir="rtl"
            />
            <p className="text-xs text-slate-500 text-right">{message.length} תווים</p>
          </div>

          {/* צירוף קובץ */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">צרף קובץ (אופציונלי)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,application/pdf"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            {attachedFile ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <Paperclip className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-800 flex-1 truncate">{attachedFile.name}</span>
                <button 
                  onClick={() => { setAttachedFile(null); fileInputRef.current.value = ''; }} 
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                type="button" 
                className="w-full rounded-lg h-10 gap-2 justify-center" 
                onClick={() => fileInputRef.current.click()}
              >
                <Paperclip className="w-4 h-4" />
                בחר תמונה / PDF
              </Button>
            )}
          </div>
        </div>

        {/* כפתורי פעולה */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={sending}
            className="rounded-lg h-9"
          >
            ביטול
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !phone || !message.trim()}
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg h-9 gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? 'שולח...' : 'שלח הודעה'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}