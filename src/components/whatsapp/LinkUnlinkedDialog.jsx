import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, Link, X, AlertCircle } from 'lucide-react';

/**
 * דיאלוג שיוך ידני בלבד — אין שיוך אוטומטי.
 * המשתמש בוחר במפורש את הגורם לשיוך, או סוגר בלי לשייך.
 * שיחה unlinked היא מצב תקין ולגיטימי.
 */
export default function LinkUnlinkedDialog({ open, onClose, senderPhone, senderChatId, onLinked }) {
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState(null); // בחירה מפורשת בלבד
  const [linking, setLinking] = useState(false);
  const queryClient = useQueryClient();

  const normalizePhone = (p) => (p || '').replace(/[^0-9]/g, '');
  const senderPhoneClean = normalizePhone(senderPhone);

  // טוען אנשי קשר בלבד (הישות הנתמכת כרגע לשיוך)
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts-for-link'],
    queryFn: () => base44.entities.Contact.list(),
    staleTime: 1000 * 60,
    enabled: open,
  });

  // סינון לפי חיפוש חופשי — ללא auto-select, ללא העדפה לפי מספר
  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const qDigits = q.replace(/[^0-9]/g, '');
    return (
      (c.owner_name || '').toLowerCase().includes(q) ||
      (c.tenant_name || '').toLowerCase().includes(q) ||
      (c.apartment_number || '').toLowerCase().includes(q) ||
      (qDigits && normalizePhone(c.owner_phone).includes(qDigits)) ||
      (qDigits && normalizePhone(c.tenant_phone).includes(qDigits))
    );
  });

  // ביצוע השיוך — רק לאחר בחירה מפורשת + לחיצה על "שייך"
  const handleConfirmLink = async () => {
    if (!selectedContact) return;
    setLinking(true);
    try {
      // מצא את כל הודעות ה-unlinked מאותו מספר / chatId
      const allUnlinked = await base44.entities.ChatMessage.filter({ link_status: 'unlinked' });
      const toUpdate = allUnlinked.filter((m) => {
        const msgPhone = normalizePhone(m.contact_phone || m.sender_phone_raw || '');
        const phoneMatch = senderPhoneClean && msgPhone === senderPhoneClean;
        const chatIdMatch = senderChatId && m.sender_chat_id === senderChatId;
        return phoneMatch || chatIdMatch;
      });

      await Promise.all(
        toUpdate.map((m) =>
          base44.entities.ChatMessage.update(m.id, {
            contact_id: selectedContact.id,
            link_status: 'linked',
          })
        )
      );

      toast.success(`שויכו ${toUpdate.length} הודעות לדירה ${selectedContact.apartment_number}`);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      onLinked?.(selectedContact);
      onClose();
    } catch (e) {
      toast.error('שגיאה בשיוך: ' + e.message);
    } finally {
      setLinking(false);
    }
  };

  const handleClose = () => {
    // סגירה בלי שיוך — שיחה נשארת unlinked. זה מצב תקין.
    setSearch('');
    setSelectedContact(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-background shadow-lg border p-0 overflow-hidden flex flex-col sm:rounded-lg"
        style={{ maxWidth: '472px', width: '100%' }}
        dir="rtl"
      >
        {/* כפתור X בפינה שמאלית עליונה */}
        <button
          onClick={handleClose}
          className="absolute left-4 top-4 z-10 rounded-lg bg-white/20 p-1.5 hover:bg-white/40 transition-colors"
          title="סגור"
        >
          <X className="h-5 w-5 text-white" />
        </button>

        {/* כותרת עליונה עם גרדיאנט */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-lg">
          <h2 className="text-white text-lg font-bold text-right">שיוך שיחה לגורם קיים</h2>
        </div>

        {/* אזור תוכן */}
        <div className="space-y-4 px-6 pt-5 pb-2 flex-1 overflow-y-auto" dir="rtl">
          {/* שדה פילטר קבוע בראש הרשימה */}
          <div className="sticky top-0 bg-background z-10">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="חפש לפי שם..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedContact(null); }}
                className="h-10 pr-10 border border-slate-200 rounded-lg text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* רשימת אנשי קשר */}
          {isLoading ? (
            <div className="text-center py-8 text-slate-500 text-sm">טוען אנשי קשר...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {contacts.length === 0 ? 'אין אנשי קשר זמינים' : 'לא נמצאו תוצאות'}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => {
                const isChosen = selectedContact?.id === c.id;
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      isChosen
                        ? 'bg-blue-50 border-blue-300'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="contact"
                      value={c.id}
                      checked={isChosen}
                      onChange={() => setSelectedContact(isChosen ? null : c)}
                      disabled={linking}
                      className="w-4 h-4 flex-shrink-0 accent-blue-600"
                    />
                    <div className="flex-1 text-right min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{c.owner_name || c.tenant_name || 'ללא שם'}</p>
                      {c.apartment_number && (
                        <p className="text-xs text-blue-600 font-medium mt-0.5">דירה {c.apartment_number}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* footer תחתון */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
          <Button 
            onClick={handleClose}
            variant="outline"
            className="h-9"
          >
            ביטול
          </Button>
          <Button
            onClick={handleConfirmLink}
            disabled={!selectedContact || linking}
            className="h-9 bg-[#3563d0] text-white hover:bg-[#2852b5] px-4"
          >
            שמור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}