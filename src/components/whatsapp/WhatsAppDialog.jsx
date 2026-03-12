import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { MessageCircle, Send, Paperclip, X } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'reminder',
    label: 'תזכורת חוב כללית',
    text: (name, debt) =>
      `שלום ${name || 'דייר יקר'},\nאנו פונים אליך בנוגע לחוב בסך ${debt} ₪ לבניין אלמוג.\nנבקשך לסדר את התשלום בהקדם האפשרי.\nלפרטים נוספים צרו קשר עם ועד הבית.\nתודה.`,
  },
  {
    id: 'urgent',
    label: 'הודעה דחופה - חוב גבוה',
    text: (name, debt) =>
      `שלום ${name || 'דייר יקר'},\nחוב בסך ${debt} ₪ טרם שולם.\nנבקשך לפנות אלינו בהקדם לסידור התשלום, אחרת נאלץ להעביר את הטיפול לגורמים משפטיים.\nלתיאום: פנה/י לוועד הבית.\nתודה.`,
  },
  {
    id: 'warning_letter',
    label: 'הודעה על מכתב התראה',
    text: (name) =>
      `שלום ${name || 'דייר יקר'},\nברצוננו להודיעך כי נשלח לך מכתב התראה רשמי בגין חוב פתוח.\nנבקשך ליצור קשר עם ועד הבית לסידור העניין.\nתודה.`,
  },
  {
    id: 'custom',
    label: 'הודעה מותאמת אישית',
    text: () => '',
  },
];

export default function WhatsAppDialog({ open, onClose, record }) {
  const [templateId, setTemplateId] = useState('reminder');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);

  const phone = record?.phonePrimary || record?.phoneOwner || record?.phoneTenant || '';
  const name = record?.ownerName?.split(/[\/,]/)[0]?.trim() || '';
  const debtFormatted = record?.totalDebt
    ? new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(record.totalDebt)
    : '0';

  const handleTemplateChange = (id) => {
    setTemplateId(id);
    const tpl = TEMPLATES.find((t) => t.id === id);
    if (tpl && id !== 'custom') {
      setMessage(tpl.text(name, debtFormatted));
    } else {
      setMessage('');
    }
  };

  // Initialize message when dialog opens
  React.useEffect(() => {
    if (open) {
      const tpl = TEMPLATES.find((t) => t.id === 'reminder');
      setTemplateId('reminder');
      setMessage(tpl.text(name, debtFormatted));
    }
  }, [open, record?.id]);

  const handleSend = async () => {
    if (!phone || !message.trim()) return;
    setSending(true);
    try {
      await base44.functions.invoke('sendWhatsApp', { phone, message });
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
            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">בחר תבנית</label>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
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