import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, Link } from 'lucide-react';

/**
 * דיאלוג לשיוך רטרואקטיבי של הודעות unlinked לאיש קשר קיים.
 * מקבל: phone, chatId — ומאפשר בחירת Contact קיים.
 * בעת שיוך: מעדכן כל הודעות unlinked מאותו מספר.
 */
export default function LinkUnlinkedDialog({ open, onClose, senderPhone, senderChatId, onLinked }) {
  const [search, setSearch] = useState('');
  const [linking, setLinking] = useState(false);
  const queryClient = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
    staleTime: 1000 * 60,
  });

  // נרמל מספר טלפון לחיפוש
  const normalizePhone = (p) => (p || '').replace(/[^0-9]/g, '');

  const senderPhoneClean = normalizePhone(senderPhone);

  // סנן לפי חיפוש
  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.owner_name || '').toLowerCase().includes(q) ||
      (c.tenant_name || '').toLowerCase().includes(q) ||
      (c.apartment_number || '').toLowerCase().includes(q) ||
      normalizePhone(c.owner_phone).includes(q.replace(/[^0-9]/g, '')) ||
      normalizePhone(c.tenant_phone).includes(q.replace(/[^0-9]/g, ''))
    );
  });

  const handleLink = async (contact) => {
    setLinking(true);
    try {
      // שלב 1: מצא את כל הודעות ה-unlinked מאותו מספר
      const allMessages = await base44.entities.ChatMessage.filter({ link_status: 'unlinked' });
      const toUpdate = allMessages.filter((m) => {
        const msgPhone = normalizePhone(m.contact_phone || m.sender_phone_raw);
        return msgPhone === senderPhoneClean ||
          (senderChatId && m.sender_chat_id === senderChatId);
      });

      // שלב 2: עדכן את כולן ל-linked עם contact_id אמיתי
      await Promise.all(
        toUpdate.map((m) =>
          base44.entities.ChatMessage.update(m.id, {
            contact_id: contact.id,
            link_status: 'linked',
          })
        )
      );

      toast.success(`שויכו ${toUpdate.length} הודעות לדירה ${contact.apartment_number}`);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      onLinked?.(contact);
      onClose();
    } catch (e) {
      toast.error('שגיאה בשיוך: ' + e.message);
    } finally {
      setLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>שיוך שיחה לאיש קשר</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 mb-3">
          הודעות ממספר <span className="font-mono font-semibold">{senderPhone}</span> לא משויכות לאיש קשר.
          בחר איש קשר לשיוך רטרואקטיבי של כל ההודעות ממספר זה.
        </p>
        <div className="relative mb-3">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            placeholder="חיפוש לפי שם, דירה או טלפון..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <div className="max-h-72 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">לא נמצאו תוצאות</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => handleLink(c)}
                disabled={linking}
                className="w-full text-right px-3 py-2 rounded-lg hover:bg-blue-50 flex items-center justify-between gap-2 border border-transparent hover:border-blue-200 transition-all"
              >
                <div>
                  <div className="font-medium text-sm">{c.owner_name || c.tenant_name || 'ללא שם'}</div>
                  <div className="text-xs text-gray-500">
                    דירה {c.apartment_number}
                    {c.owner_phone && ` · ${c.owner_phone}`}
                    {c.tenant_phone && ` · ${c.tenant_phone}`}
                  </div>
                </div>
                <Link className="w-4 h-4 text-blue-500 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}