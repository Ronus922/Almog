import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, X, AlertCircle, Link2, CheckCircle2, Phone, Home } from 'lucide-react';

export default function LinkUnlinkedDialog({ open, onClose, senderPhone, senderChatId, onLinked }) {
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [linking, setLinking] = useState(false);
  const queryClient = useQueryClient();

  const normalizePhone = (p) => (p || '').replace(/[^0-9]/g, '');
  const senderPhoneClean = normalizePhone(senderPhone);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts-for-link'],
    queryFn: () => base44.entities.Contact.list(),
    staleTime: 1000 * 60,
    enabled: open,
  });

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

  const handleConfirmLink = async () => {
    if (!selectedContact) return;
    setLinking(true);
    try {
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
    setSearch('');
    setSelectedContact(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] p-0 overflow-hidden flex flex-col rounded-2xl shadow-2xl border-0"
        style={{ maxWidth: '500px', width: '100%', maxHeight: '85vh' }}
        dir="rtl"
      >
        {/* כותרת */}
        <div className="relative bg-gradient-to-l from-blue-600 to-indigo-700 px-6 py-5">
          <button
            onClick={handleClose}
            className="absolute left-4 top-4 rounded-xl bg-white/20 p-1.5 hover:bg-white/35 transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Link2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-white text-[18px] font-black leading-tight">שיוך שיחה לאיש קשר</h2>
              <p className="text-blue-100 text-xs mt-0.5 font-medium">בחר את הגורם לשיוך הידני</p>
            </div>
          </div>
        </div>

        {/* גוף הדיאלוג */}
        <div className="flex flex-col gap-4 px-6 pt-5 pb-2 flex-1 overflow-hidden bg-slate-50">

          {/* הסבר */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800 leading-relaxed">
              <span className="font-bold">שיוך הוא אופציונלי.</span>{' '}
              ניתן לסגור ולהשאיר את השיחה כ"לא משויכת". שיוך יתבצע רק לאחר בחירת גורם ולחיצה על "שייך".
            </div>
          </div>

          {/* מספר שולח */}
          <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 shadow-sm">
            <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-500">הודעות ממספר:</span>
            <span className="font-bold text-slate-800 text-sm font-mono">{senderPhone}</span>
          </div>

          {/* חיפוש */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="חיפוש לפי שם, מספר דירה או טלפון..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedContact(null); }}
              className="h-11 pr-10 rounded-xl border-slate-200 bg-white text-sm shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              autoFocus
            />
          </div>

          {/* רשימת תוצאות */}
          <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm" style={{ maxHeight: '280px' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                טוען...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Search className="w-8 h-8 text-slate-300" />
                <p className="text-slate-400 text-sm font-medium">לא נמצאו תוצאות</p>
                <p className="text-slate-300 text-xs">ניתן לסגור ולהשאיר השיחה ללא שיוך</p>
              </div>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {filtered.map((c) => {
                  const isChosen = selectedContact?.id === c.id;
                  const displayName = c.owner_name || c.tenant_name || 'ללא שם';
                  const phone = c.owner_phone || c.tenant_phone;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedContact(isChosen ? null : c)}
                      disabled={linking}
                      className={`w-full text-right px-3 py-2.5 rounded-lg flex items-center justify-between gap-3 transition-all border ${
                        isChosen
                          ? 'bg-blue-50 border-blue-300 shadow-sm'
                          : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 text-xs font-bold ${
                          isChosen ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {displayName.charAt(0)}
                        </div>
                        <div className="min-w-0 text-right">
                          <p className="font-semibold text-sm text-slate-900 truncate">{displayName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {c.apartment_number && (
                              <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                                <Home className="w-3 h-3" />
                                דירה {c.apartment_number}
                              </span>
                            )}
                            {phone && (
                              <span className="text-xs text-slate-400 font-mono">{phone}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isChosen ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* פוטר */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
          {selectedContact ? (
            <span className="text-sm text-slate-600 font-medium truncate">
              נבחר: <span className="text-blue-700 font-bold">{selectedContact.owner_name || selectedContact.tenant_name}</span>
            </span>
          ) : (
            <span className="text-sm text-slate-400">לא נבחר גורם</span>
          )}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleClose}
              className="h-10 rounded-xl border-slate-200 px-4 text-sm font-semibold"
            >
              ביטול
            </Button>
            <Button
              onClick={handleConfirmLink}
              disabled={!selectedContact || linking}
              className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 text-sm font-bold shadow-sm disabled:opacity-40"
            >
              {linking ? (
                <span className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  משייך...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Link2 className="w-4 h-4" />
                  שייך
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}