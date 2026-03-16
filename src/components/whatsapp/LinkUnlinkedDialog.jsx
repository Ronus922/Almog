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
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">שיוך שיחה לגורם קיים</DialogTitle>
          <DialogDescription>בחר את הגורם לשיוך הודעות מ-{senderPhone}</DialogDescription>
        </DialogHeader>

        {/* הסבר — מדגיש שהשיוך אופציונלי */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex gap-3 items-start mb-1">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800 leading-relaxed">
            <span className="font-semibold">שיוך הוא אופציונלי.</span> ניתן לסגור חלון זה ולהשאיר את השיחה כ"לא משויכת" — זה מצב תקין.
            שיוך יתבצע רק לאחר בחירת גורם ולחיצה על "שייך".
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-2">
          הודעות ממספר <span className="font-mono font-semibold text-gray-700">{senderPhone}</span>
        </p>

        {/* חיפוש */}
        <div className="relative mb-2">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            placeholder="חיפוש לפי שם, מספר דירה או טלפון..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedContact(null); }}
            className="pr-9"
            autoFocus
          />
        </div>

        {/* רשימת תוצאות — ללא auto-select */}
        <div className="max-h-64 overflow-y-auto space-y-1 mb-3 border border-gray-100 rounded-lg p-1 bg-gray-50">
          {isLoading ? (
            <p className="text-center text-gray-400 text-sm py-6">טוען...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">לא נמצאו תוצאות</p>
              <p className="text-gray-400 text-xs mt-1">ניתן לסגור ולהשאיר unlinked</p>
            </div>
          ) : (
            filtered.map((c) => {
              const isChosen = selectedContact?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedContact(isChosen ? null : c)}
                  disabled={linking}
                  className={`w-full text-right px-3 py-2.5 rounded-lg flex items-center justify-between gap-2 border transition-all ${
                    isChosen
                      ? 'bg-blue-50 border-blue-300 shadow-sm'
                      : 'bg-white border-transparent hover:bg-blue-50 hover:border-blue-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {c.owner_name || c.tenant_name || 'ללא שם'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      דירה {c.apartment_number}
                      {c.owner_phone && ` · ${c.owner_phone}`}
                      {!c.owner_phone && c.tenant_phone && ` · ${c.tenant_phone}`}
                    </div>
                  </div>
                  {isChosen ? (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* פעולות — שתי אפשרויות ברורות */}
        <div className="flex gap-2 justify-between items-center">
          <Button
            variant="outline"
            onClick={handleClose}
            className="gap-1.5 text-gray-600"
          >
            <X className="w-4 h-4" />
            השאר לא משויך
          </Button>
          <Button
            onClick={handleConfirmLink}
            disabled={!selectedContact || linking}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Link className="w-4 h-4" />
            {linking ? 'משייך...' : selectedContact ? `שייך לדירה ${selectedContact.apartment_number}` : 'בחר גורם לשיוך'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}