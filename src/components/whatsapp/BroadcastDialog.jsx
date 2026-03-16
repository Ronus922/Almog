import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Send, Users, CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { toast } from 'sonner';

const GROUP_OPTIONS = [
  { key: 'owners',    label: 'בעלי נכסים' },
  { key: 'tenants',   label: 'שוכרים' },
  { key: 'operators', label: 'מפעילים' },
  { key: 'suppliers', label: 'ספקים' },
];

const STEPS = ['בחירת קהל', 'כתיבת הודעה', 'תצוגה מקדימה', 'שליחה'];

export default function BroadcastDialog({ open, onClose }) {
  const [step, setStep] = useState(0);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null); // { sent, failed, total }
  const [campaignId, setCampaignId] = useState(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
    staleTime: 1000 * 60,
    enabled: open,
  });

  const { data: operators = [] } = useQuery({
    queryKey: ['operators'],
    queryFn: () => base44.entities.Operator.list(),
    staleTime: 1000 * 60,
    enabled: open,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    staleTime: 1000 * 60,
    enabled: open,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: () => base44.entities.WhatsAppTemplate.list(),
    enabled: open,
  });

  // בניית רשימת נמענים לפי קבוצות שנבחרו
  const recipients = useMemo(() => {
    if (selectedGroups.length === 0) return [];
    const list = [];
    const isAll = selectedGroups.includes('all');

    if (isAll || selectedGroups.includes('owners')) {
      contacts.forEach((c) => {
        if (c.owner_phone) {
          list.push({ name: c.owner_name || 'בעל דירה', phone: c.owner_phone, type: 'owner', contactId: c.id });
        }
      });
    }

    if (isAll || selectedGroups.includes('tenants')) {
      contacts.forEach((c) => {
        if (c.tenant_phone) {
          list.push({ name: c.tenant_name || 'שוכר', phone: c.tenant_phone, type: 'tenant', contactId: c.id });
        }
      });
    }

    if (isAll || selectedGroups.includes('operators')) {
      operators.forEach((op) => {
        if (op.phone) {
          list.push({ name: op.company_name || op.contact_name || 'מפעיל', phone: op.phone, type: 'operator', operatorId: op.id });
        }
      });
    }

    if (isAll || selectedGroups.includes('suppliers')) {
      suppliers.forEach((s) => {
        const phone = s.contact_mobile_whatsapp || s.company_phone;
        if (phone) {
          list.push({ name: s.company_name || 'ספק', phone, type: 'supplier', supplierId: s.id });
        }
      });
    }

    // dedup by phone
    const seen = new Set();
    return list.filter((r) => {
      const clean = r.phone.replace(/\D/g, '');
      if (seen.has(clean)) return false;
      seen.add(clean);
      return true;
    });
  }, [selectedGroups, contacts, operators, suppliers]);

  const toggleGroup = (key) => {
    if (key === 'all') {
      setSelectedGroups(selectedGroups.length === GROUP_OPTIONS.length ? [] : GROUP_OPTIONS.map(g => g.key));
      return;
    }
    setSelectedGroups((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSend = async () => {
    if (!message.trim() || recipients.length === 0) return;
    setSending(true);
    let sentCount = 0;
    let failedCount = 0;

    // יצירת קמפיין
    let campaign;
    try {
      campaign = await base44.entities.BroadcastCampaign.create({
        title: `תפוצה ${new Date().toLocaleDateString('he-IL')}`,
        message,
        target_groups: selectedGroups,
        status: 'running',
        total_recipients: recipients.length,
        sent_count: 0,
        failed_count: 0,
        started_at: new Date().toISOString(),
      });
      setCampaignId(campaign.id);
    } catch (e) {
      toast.error('שגיאה ביצירת קמפיין: ' + e.message);
      setSending(false);
      return;
    }

    // שליחה לכל נמען
    for (const recipient of recipients) {
      let recipientRecord;
      try {
        // יצירת רשומת tracking לנמען
        recipientRecord = await base44.entities.BroadcastRecipient.create({
          campaign_id: campaign.id,
          recipient_name: recipient.name,
          recipient_phone: recipient.phone,
          recipient_type: recipient.type,
          contact_id: recipient.contactId || null,
          supplier_id: recipient.supplierId || null,
          operator_id: recipient.operatorId || null,
          status: 'pending',
        });

        // שליחה דרך Green API
        const personalizedMsg = message.replace(/{{name}}/g, recipient.name);
        const res = await base44.functions.invoke('sendWhatsApp', {
          phone: recipient.phone,
          message: personalizedMsg,
        });

        const extId = res?.data?.idMessage || null;

        // עדכון סטטוס נמען: נשלח
        await base44.entities.BroadcastRecipient.update(recipientRecord.id, {
          status: 'sent',
          external_message_id: extId,
          sent_at: new Date().toISOString(),
        });

        // שמירת ChatMessage אם יש contact_id
        if (recipient.contactId) {
          await base44.entities.ChatMessage.create({
            contact_id: recipient.contactId,
            contact_phone: recipient.phone,
            link_status: 'linked',
            direction: 'sent',
            message_type: 'text',
            content: personalizedMsg,
            timestamp: new Date().toISOString(),
          });
        }

        sentCount++;
      } catch (err) {
        failedCount++;
        if (recipientRecord) {
          await base44.entities.BroadcastRecipient.update(recipientRecord.id, {
            status: 'failed',
            error_message: err?.message || 'שגיאה לא ידועה',
          });
        }
        console.error('[Broadcast] שגיאה בשליחה ל-' + recipient.phone, err);
      }
    }

    // עדכון סיכום קמפיין
    await base44.entities.BroadcastCampaign.update(campaign.id, {
      status: failedCount === recipients.length ? 'failed' : 'completed',
      sent_count: sentCount,
      failed_count: failedCount,
      completed_at: new Date().toISOString(),
    });

    setSending(false);
    setResults({ sent: sentCount, failed: failedCount, total: recipients.length });
    setStep(3);
  };

  const handleClose = () => {
    setStep(0);
    setSelectedGroups([]);
    setMessage('');
    setResults(null);
    setCampaignId(null);
    setSending(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        {/* כותרת */}
        <div className="bg-gradient-to-l from-green-600 to-emerald-600 -mx-6 -mt-6 px-6 py-5 rounded-t-lg mb-4">
          <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
            <Send className="w-5 h-5" />
            מרכז תפוצה
          </DialogTitle>
          <p className="text-green-100 text-sm mt-1">שליחת הודעות לקבוצות</p>
        </div>

        {/* סרגל שלבים */}
        {!results && (
          <div className="flex items-center justify-between mb-5 px-1">
            {STEPS.slice(0, 3).map((s, i) => (
              <React.Fragment key={i}>
                <div className={`flex flex-col items-center gap-1 ${i === step ? 'opacity-100' : i < step ? 'opacity-60' : 'opacity-30'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className="text-xs text-gray-600 whitespace-nowrap">{s}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ---- שלב 0: בחירת קהל ---- */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">בחר קבוצות יעד:</p>
              <div className="space-y-2">
                {/* הכל */}
                <button
                  onClick={() => toggleGroup('all')}
                  className={`w-full text-right px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all flex items-center justify-between ${
                    selectedGroups.length === GROUP_OPTIONS.length
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'
                  }`}
                >
                  <span>הכל</span>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedGroups.length === GROUP_OPTIONS.length ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                    {selectedGroups.length === GROUP_OPTIONS.length && <span className="text-white text-xs">✓</span>}
                  </div>
                </button>
                {GROUP_OPTIONS.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => toggleGroup(g.key)}
                    className={`w-full text-right px-4 py-3 rounded-xl border-2 text-sm transition-all flex items-center justify-between ${
                      selectedGroups.includes(g.key)
                        ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'
                    }`}
                  >
                    <span>{g.label}</span>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedGroups.includes(g.key) ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                      {selectedGroups.includes(g.key) && <span className="text-white text-xs">✓</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {recipients.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-blue-800">{recipients.length} נמענים עומדים לקבל הודעה</span>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(1)}
                disabled={selectedGroups.length === 0 || recipients.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                המשך
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ---- שלב 1: כתיבת הודעה ---- */}
        {step === 1 && (
          <div className="space-y-4">
            {templates.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">תבנית מהירה:</p>
                <div className="flex flex-wrap gap-2">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setMessage(t.content)}
                      className="px-3 py-1.5 text-xs rounded-full border border-green-300 text-green-700 hover:bg-green-50 font-medium transition-colors"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">תוכן ההודעה:</p>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="כתוב את ההודעה... ניתן להשתמש ב-{{name}} לשם אישי"
                dir="rtl"
                className="resize-none rounded-xl border-gray-200 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1 text-left">{message.length} תווים</p>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)} className="gap-2">
                <ChevronRight className="w-4 h-4" />
                חזור
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!message.trim()}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <Eye className="w-4 h-4" />
                תצוגה מקדימה
              </Button>
            </div>
          </div>
        )}

        {/* ---- שלב 2: תצוגה מקדימה + אישור ---- */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1 font-semibold">תצוגת הודעה:</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{message.replace(/{{name}}/g, 'שם הנמען')}</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
              <p className="text-sm font-bold text-amber-800">סיכום שליחה</p>
              <p className="text-sm text-amber-700">
                ייווצרו <span className="font-bold">{recipients.length}</span> הודעות
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedGroups.map((g) => (
                  <span key={g} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {GROUP_OPTIONS.find(o => o.key === g)?.label || g}
                  </span>
                ))}
              </div>
            </div>

            {/* רשימת נמענים */}
            <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 rounded-xl p-2 bg-white">
              {recipients.slice(0, 50).map((r, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-1 text-xs rounded-lg hover:bg-gray-50">
                  <span className="text-gray-500">{r.phone}</span>
                  <span className="text-gray-800 font-medium">{r.name}</span>
                </div>
              ))}
              {recipients.length > 50 && (
                <p className="text-xs text-center text-gray-400 py-1">ועוד {recipients.length - 50} נמענים...</p>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ChevronRight className="w-4 h-4" />
                עריכה
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> שולח...</>
                ) : (
                  <><Send className="w-4 h-4" /> אשר ושלח</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ---- שלב 3: תוצאות ---- */}
        {step === 3 && results && (
          <div className="space-y-4 text-center py-2">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">הקמפיין הושלם</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="text-2xl font-bold text-green-700">{results.sent}</div>
                <div className="text-xs text-green-600 mt-0.5">נשלחו בהצלחה</div>
              </div>
              <div className={`border rounded-xl p-3 ${results.failed > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`text-2xl font-bold ${results.failed > 0 ? 'text-red-600' : 'text-gray-400'}`}>{results.failed}</div>
                <div className={`text-xs mt-0.5 ${results.failed > 0 ? 'text-red-500' : 'text-gray-400'}`}>נכשלו</div>
              </div>
            </div>

            {results.failed > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 text-right">
                <XCircle className="w-4 h-4 inline ml-1" />
                {results.failed} הודעות לא נשלחו. הכישלונות תועדו בנפרד לכל נמען.
              </div>
            )}

            {campaignId && (
              <p className="text-xs text-gray-400">מזהה קמפיין: {campaignId}</p>
            )}

            <Button onClick={handleClose} className="w-full bg-green-600 hover:bg-green-700 text-white">
              סגור
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}