import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Send, Users } from "lucide-react";
import { useAlert } from "@/components/notifications/AlertContext";

export default function SendWhatsAppBulkDialog({ open, onClose, contacts, settings }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const { showAlert } = useAlert();

  const { data: templates = [] } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: () => base44.entities.WhatsAppTemplate.list(),
  });

  const applyTemplate = (content) => setMessage(content);

  const handleSend = async () => {
    if (!message.trim() || contacts.length === 0) return;
    if (!settings?.greenApiInstanceId || !settings?.greenApiToken) {
      showAlert("חסרים פרטי Green API בהגדרות", "error");
      return;
    }
    setSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const contact of contacts) {
      try {
        const phone = contact.phone.replace(/\D/g, "");
        const chatId = phone.endsWith("@c.us") ? phone : `${phone}@c.us`;
        const personalizedMsg = message
          .replace(/{{name}}/g, contact.name)
          .replace(/{{phone}}/g, contact.phone);

        const res = await fetch(
          `https://api.green-api.com/waInstance${settings.greenApiInstanceId}/sendMessage/${settings.greenApiToken}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatId, message: personalizedMsg }),
          }
        );
        if (res.ok) {
          successCount++;
          await base44.entities.Contact.update(contact.id, { last_whatsapp_sent_at: new Date().toISOString() });
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setSending(false);
    setResults({ successCount, failCount });
  };

  const handleClose = () => {
    setMessage("");
    setResults(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            שליחת וואטסאפ קבוצתי
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <Users className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">
            ישלח ל-{contacts.length} אנשי קשר
          </span>
        </div>

        {results ? (
          <div className="space-y-3 py-4 text-center">
            <div className="text-2xl font-bold text-green-600">{results.successCount} ✓</div>
            <p className="text-sm text-slate-600">הודעות נשלחו בהצלחה</p>
            {results.failCount > 0 && (
              <p className="text-sm text-red-500">{results.failCount} נכשלו</p>
            )}
            <Button onClick={handleClose} className="mt-4">סגור</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-slate-600">בחר תבנית</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {templates.map(t => (
                    <Badge
                      key={t.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-blue-50"
                      onClick={() => applyTemplate(t.content)}
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label>תוכן ההודעה</Label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                placeholder="כתוב הודעה... השתמש ב-{{name}} לשם אישי"
                className="mt-1"
              />
              <p className="text-xs text-slate-400 mt-1">משתנים: {`{{name}}`}, {`{{phone}}`}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>ביטול</Button>
              <Button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> שולח...</> : <><Send className="w-4 h-4" /> שלח</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}