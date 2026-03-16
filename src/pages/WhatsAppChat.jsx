import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Search, Info, Paperclip, AlertCircle, Link, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import ChatMessageBubble from '@/components/whatsapp/ChatMessageBubble';
import LinkedContactInfo from '@/components/whatsapp/LinkedContactInfo';
import LinkUnlinkedDialog from '@/components/whatsapp/LinkUnlinkedDialog';
import ConversationGroupFilter from '@/components/whatsapp/ConversationGroupFilter';
import BroadcastDialog from '@/components/whatsapp/BroadcastDialog';

export default function WhatsAppChat() {
  const [selectedContact, setSelectedContact] = useState(null);
  // selectedContact יכול להיות: Contact רגיל, או { _isUnlinked: true, phone, chatId }
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [fileInput, setFileInput] = useState(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [groupFilter, setGroupFilter] = useState('all');
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  // flag: האם המשתמש גלל ידנית למעלה (כדי לא לכפות scroll לתחתית)
  const userScrolledUp = useRef(false);

  // Get operators for display names
  const { data: operators = [] } = useQuery({
    queryKey: ['operators'],
    queryFn: () => base44.entities.Operator.list(),
    staleTime: 1000 * 60 * 5,
  });

  // Get suppliers for group filter
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    staleTime: 1000 * 60 * 5,
  });

  // Helper: get primary display name
  const getPrimaryName = (contact) => {
    if (!contact) return '';
    if (contact._isUnlinked) return contact.phone || 'מספר לא מוכר';
    if (contact._isSupplier) return contact.company_name || contact.contact_person_name || 'ספק';
    if (contact.operator_is_primary_contact && contact.operator_id) {
      const op = operators.find(o => o.id === contact.operator_id);
      if (op) return op.company_name || op.contact_name;
    }
    if (contact.tenant_is_primary_contact && contact.tenant_name) return contact.tenant_name;
    return contact.owner_name || contact.tenant_name || 'ללא שם';
  };

  // Helper: get secondary row info
  const getSecondaryInfo = (contact) => {
    if (!contact || contact._isUnlinked) return null;
    const isOperatorPrimary = contact.operator_is_primary_contact && contact.operator_id && operators.find(o => o.id === contact.operator_id);
    const isTenantPrimary = !isOperatorPrimary && contact.tenant_is_primary_contact && contact.tenant_name;
    if (isOperatorPrimary) {
      if (contact.owner_name) return 'בעלים: ' + contact.owner_name;
      if (contact.tenant_name) return 'שוכר: ' + contact.tenant_name;
      return null;
    }
    if (isTenantPrimary) {
      if (contact.owner_name) return 'בעלים: ' + contact.owner_name;
      return null;
    }
    if (contact.tenant_name) return 'שוכר: ' + contact.tenant_name;
    return null;
  };

  // ==========================================
  // קביעת קבוצת גורם לכל שיחה (לצורך פילטר)
  // עדיפות: מפעיל > שוכר > בעל דירה
  // ==========================================
  const getConvGroup = useCallback((conv) => {
    if (conv._isUnlinked) return 'unlinked';

    // בדיקה האם זה ספק
    if (conv._isSupplier) return 'suppliers';

    // עדיפות: מפעיל
    if (conv.operator_is_primary_contact && conv.operator_id) return 'operators';

    // עדיפות: שוכר
    if (conv.tenant_is_primary_contact && conv.tenant_name) return 'tenants';

    // ברירת מחדל: בעל נכס
    return 'owners';
  }, []);

  // ==========================================
  // שאילתת אנשי קשר + שיחות unlinked
  // מחשבת last activity אמיתי לכל שיחה
  // ==========================================
  const { data: allConversations = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const [allContacts, allMessages] = await Promise.all([
        base44.entities.Contact.list(),
        base44.entities.ChatMessage.list(),
      ]);

      // --- שיחות רגילות (linked) ---
      const linkedConvs = allContacts.map((contact) => {
        const msgs = allMessages.filter((m) => m.contact_id === contact.id);
        const lastMsg = msgs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        return {
          ...contact,
          lastMessageTime: lastMsg?.timestamp || null,
          lastMessage: lastMsg || null,
        };
      });

      // --- שיחות unlinked: קבץ לפי contact_phone ---
      const unlinkedMsgs = allMessages.filter((m) => m.link_status === 'unlinked');
      const unlinkedByPhone = {};
      for (const m of unlinkedMsgs) {
        const phone = m.contact_phone || m.sender_phone_raw || 'unknown';
        if (!unlinkedByPhone[phone]) {
          unlinkedByPhone[phone] = { msgs: [], chatId: m.sender_chat_id };
        }
        unlinkedByPhone[phone].msgs.push(m);
      }

      const unlinkedConvs = Object.entries(unlinkedByPhone).map(([phone, { msgs, chatId }]) => {
        const sorted = msgs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return {
          _isUnlinked: true,
          id: 'unlinked_' + phone,
          phone,
          chatId,
          lastMessageTime: sorted[0]?.timestamp || null,
          lastMessage: sorted[0] || null,
        };
      });

      // --- שיחות ספקים ---
      // ספקים שיש להם מספר טלפון וואטסאפ
      const suppliersList = await base44.entities.Supplier.list();
      const supplierConvs = suppliersList
        .filter((s) => s.contact_mobile_whatsapp || s.company_phone)
        .map((s) => {
          const phone = s.contact_mobile_whatsapp || s.company_phone;
          const msgs = allMessages.filter((m) => {
            const mPhone = (m.contact_phone || '').replace(/\D/g, '');
            return mPhone && mPhone === phone.replace(/\D/g, '');
          });
          const lastMsg = msgs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
          return {
            ...s,
            _isSupplier: true,
            id: 'supplier_' + s.id,
            _supplierId: s.id,
            _supplierPhone: phone,
            lastMessageTime: lastMsg?.timestamp || null,
            lastMessage: lastMsg || null,
          };
        });

      return [...linkedConvs, ...unlinkedConvs, ...supplierConvs];
    },
    staleTime: 1000 * 15,
    gcTime: 1000 * 60,
  });

  // ==========================================
  // הודעות לשיחה הנבחרת
  // ==========================================
  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', selectedContact?.id],
    queryFn: async () => {
      if (!selectedContact) return [];
      let msgs;
      if (selectedContact._isUnlinked) {
        // שיחה unlinked: filter לפי phone
        const all = await base44.entities.ChatMessage.filter({ link_status: 'unlinked' });
        const phone = selectedContact.phone;
        msgs = all.filter((m) => (m.contact_phone || m.sender_phone_raw) === phone);
      } else {
        msgs = await base44.entities.ChatMessage.filter({ contact_id: selectedContact.id }, 'timestamp');
      }
      // מיון עתיק ראשון
      return msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },
    enabled: !!selectedContact,
    staleTime: 0,
    refetchInterval: 5000,
    gcTime: 1000 * 60,
  });

  // ==========================================
  // Real-time subscription
  // ==========================================
  useEffect(() => {
    if (!selectedContact?.id) return;
    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.contact_id === selectedContact.id) {
        queryClient.setQueryData(['chatMessages', selectedContact.id], (old = []) => {
          const exists = old.find((m) => m.id === event.data.id);
          if (exists) return old;
          return [...old, event.data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
      }
    });
    return () => unsubscribe?.();
  }, [selectedContact?.id, queryClient]);

  // ==========================================
  // Scroll לתחתית — רק כשצריך
  // ==========================================
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // כשנכנסים לשיחה חדשה — scroll מיידי לתחתית
  useEffect(() => {
    userScrolledUp.current = false;
    // instant (לא smooth) כדי שלא נראה ניחות מאמצע
    const timer = setTimeout(() => scrollToBottom('instant'), 50);
    return () => clearTimeout(timer);
  }, [selectedContact?.id, scrollToBottom]);

  // כשמגיעות הודעות חדשות — scroll לתחתית רק אם המשתמש לא גלל למעלה
  useEffect(() => {
    if (!userScrolledUp.current) {
      scrollToBottom('smooth');
    }
  }, [messages, scrollToBottom]);

  // זיהוי גלילה ידנית למעלה
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUp.current = distFromBottom > 100;
  }, []);

  // ==========================================
  // Send message
  // ==========================================
  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      const phone = selectedContact.owner_phone || selectedContact.tenant_phone;
      if (!phone) throw new Error('אין מספר טלפון זמין');
      const msg = await base44.entities.ChatMessage.create({
        contact_id: selectedContact.id,
        contact_phone: phone,
        link_status: 'linked',
        direction: 'sent',
        message_type: 'text',
        content,
        timestamp: new Date().toISOString(),
      });
      try {
        await base44.functions.invoke('sendWhatsApp', { phone, message: content });
      } catch (error) {
        console.error('Failed to send via Green API:', error);
      }
      return msg;
    },
    onSuccess: () => {
      setMessageInput('');
      userScrolledUp.current = false;
      queryClient.invalidateQueries({ queryKey: ['chatMessages', selectedContact.id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error) => console.error('Message send error:', error),
  });

  // ==========================================
  // Filter + sort conversations
  // newest activity first תמיד
  // ==========================================
  const filteredConversations = allConversations
    .filter((conv) => {
      const q = searchQuery.toLowerCase();
      if (conv._isUnlinked) return conv.phone?.includes(q) || q === '';
      if (conv._isSupplier) {
        return (
          (conv.company_name || '').toLowerCase().includes(q) ||
          (conv.contact_person_name || '').toLowerCase().includes(q)
        );
      }
      return (
        (conv.owner_name || '').toLowerCase().includes(q) ||
        (conv.tenant_name || '').toLowerCase().includes(q) ||
        (conv.apartment_number || '').toLowerCase().includes(q)
      );
    })
    .filter((conv) => conv.lastMessageTime !== null) // הצג רק שיחות עם פעילות
    .filter((conv) => {
      // פילטר קבוצות
      if (groupFilter === 'all') return true;
      return getConvGroup(conv) === groupFilter;
    })
    .sort((a, b) => {
      const tA = a.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
      const tB = b.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
      return tB - tA; // newest first
    });

  const handleSendMessage = () => {
    if (messageInput.trim() && selectedContact && !selectedContact._isUnlinked) {
      sendMessageMutation.mutate(messageInput);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedContact || selectedContact._isUnlinked) return;
    const phone = selectedContact.owner_phone || selectedContact.tenant_phone;
    if (!phone) { toast.error('אין מספר טלפון זמין לאיש קשר זה'); return; }
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error('ניתן לשלוח רק תמונות (JPG, PNG, GIF) או PDF');
      if (fileInput) fileInput.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('גודל הקובץ לא יכול לעלות על 10MB');
      if (fileInput) fileInput.value = '';
      return;
    }
    toast.loading('מעלה ושולח קובץ...', { id: 'file-upload' });
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.functions.invoke('sendWhatsApp', { phone, fileUrl: file_url, fileName: file.name, message: '' });
      await base44.entities.ChatMessage.create({
        contact_id: selectedContact.id,
        contact_phone: phone,
        link_status: 'linked',
        direction: 'sent',
        message_type: file.type.startsWith('image/') ? 'image' : 'document',
        content: file_url,
        timestamp: new Date().toISOString(),
      });
      toast.success('הקובץ נשלח בהצלחה!', { id: 'file-upload' });
      if (fileInput) fileInput.value = '';
      queryClient.invalidateQueries({ queryKey: ['chatMessages', selectedContact.id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    } catch (error) {
      toast.error('שגיאה בשליחת הקובץ: ' + (error?.response?.data?.error || error.message), { id: 'file-upload' });
    }
  };

  // ==========================================
  // Polling כל 30 שניות
  // ==========================================
  useEffect(() => {
    const poll = async () => {
      try {
        await base44.functions.invoke('pollGreenAPIMessages', {});
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        if (selectedContact?.id) {
          queryClient.invalidateQueries({ queryKey: ['chatMessages', selectedContact.id] });
        }
      } catch (e) {
        console.error('[Poll] Error:', e);
      }
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [selectedContact?.id, queryClient]);

  // ==========================================
  // Sync profile image
  // ==========================================
  useEffect(() => {
    if (!selectedContact?.id || selectedContact._isUnlinked) return;
    const syncProfileImage = async () => {
      try {
        const primaryPhone = selectedContact.owner_phone || selectedContact.tenant_phone;
        if (!primaryPhone) return;
        if (selectedContact.whatsapp_profile_last_synced_at) {
          const lastSync = new Date(selectedContact.whatsapp_profile_last_synced_at);
          if (new Date() - lastSync < 24 * 60 * 60 * 1000) return;
        }
        let hasUsefulImage = false;
        const updateData = { whatsapp_profile_last_synced_at: new Date().toISOString() };
        try {
          const avatarResponse = await base44.functions.invoke('getWhatsAppAvatar', { phoneNumber: primaryPhone });
          if (avatarResponse?.available === true && avatarResponse?.urlAvatar) {
            updateData.whatsapp_profile_image_url = avatarResponse.urlAvatar;
            updateData.whatsapp_profile_sync_status = 'synced';
            updateData.whatsapp_profile_sync_error = null;
            hasUsefulImage = true;
          }
        } catch { /* fallback */ }
        if (!hasUsefulImage) {
          try {
            const contactInfoResponse = await base44.functions.invoke('getWhatsAppContactInfo', { phoneNumber: primaryPhone });
            if (contactInfoResponse?.avatar) {
              updateData.whatsapp_profile_image_url = contactInfoResponse.avatar;
              updateData.whatsapp_profile_sync_status = 'synced';
              updateData.whatsapp_profile_sync_error = null;
              hasUsefulImage = true;
            }
          } catch { /* ignore */ }
        }
        if (!hasUsefulImage && !updateData.whatsapp_profile_image_url) {
          updateData.whatsapp_profile_sync_status = 'no_avatar';
          updateData.whatsapp_profile_sync_error = null;
        }
        await base44.entities.Contact.update(selectedContact.id, updateData);
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
      } catch (error) {
        console.error('[WhatsApp] Profile sync error:', error);
      }
    };
    syncProfileImage();
  }, [selectedContact?.id, queryClient]);

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-100" dir="rtl" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23ECE5DD\'/%3E%3Cpath d=\'M50 0L100 50L50 100L0 50z\' fill=\'%23E8DED2\' opacity=\'0.3\'/%3E%3C/svg%3E")', backgroundSize: '100px 100px' }}>
      <div className="h-screen flex gap-0">

        {/* ---- רשימת שיחות ---- */}
        <div className="w-96 bg-white flex flex-col shadow-lg border-l border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBroadcastOpen(true)}
                className="text-green-600 hover:bg-green-50 gap-1.5 text-xs px-2 h-8"
              >
                <Radio className="w-4 h-4" />
                תפוצה
              </Button>
              <h2 className="text-xl font-bold text-gray-800">הודעות</h2>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="חיפוש..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-100 border-0 rounded-full text-sm"
              />
            </div>
            <ConversationGroupFilter activeGroup={groupFilter} onChange={setGroupFilter} />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3cb371 transparent' }}>
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">אין שיחות</div>
            ) : (
              filteredConversations.map((conv) => {
                const displayName = getPrimaryName(conv);
                const secondaryInfo = getSecondaryInfo(conv);
                const initials = displayName.split(' ').map((n) => n[0]).join('').substring(0, 2);
                const isSelected = selectedContact?.id === conv.id;
                const isUnlinked = conv._isUnlinked;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedContact(conv)}
                    className={`w-full p-3 text-right hover:bg-gray-50 transition-colors flex items-center gap-3 border-r-4 ${isSelected ? 'border-r-blue-500' : 'border-r-transparent'}`}
                    style={isSelected ? { backgroundColor: '#f9fff5' } : {}}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden ${isUnlinked ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-gradient-to-br from-blue-400 to-blue-600'}`}>
                      {!isUnlinked && (conv.whatsapp_profile_image_url || conv.whatsapp_profile_image) ? (
                        <img src={conv.whatsapp_profile_image_url || conv.whatsapp_profile_image} alt={displayName} className="w-full h-full object-cover" />
                      ) : isUnlinked ? (
                        <AlertCircle className="w-6 h-6" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="flex-1 text-right min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">{displayName}</div>
                      {!isUnlinked ? (
                        <div className="text-xs text-gray-600 mt-0.5 truncate">דירה {conv.apartment_number}</div>
                      ) : (
                        <div className="text-xs text-orange-600 mt-0.5 font-medium">לא משויך לאיש קשר</div>
                      )}
                      {secondaryInfo && (
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{secondaryInfo}</div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ---- חלון צ'אט ---- */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundImage: `url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b3212f206c95cdd3b3e777/a209df2b7_BGWHATS.png')`, backgroundRepeat: 'repeat', backgroundSize: 'auto' }}>
          {selectedContact ? (
            <>
              {/* Header */}
              <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                  {selectedContact._isUnlinked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-orange-600 border-orange-300 hover:bg-orange-50 gap-1.5"
                      onClick={() => setLinkDialogOpen(true)}
                    >
                      <Link className="w-4 h-4" />
                      שייך איש קשר
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Info className="w-5 h-5 text-blue-600" />
                    </Button>
                  )}
                </div>
                <div className="text-right flex-1">
                  <h3 className="font-semibold text-gray-900">{getPrimaryName(selectedContact)}</h3>
                  {!selectedContact._isUnlinked && <LinkedContactInfo contact={selectedContact} />}
                  {selectedContact._isUnlinked && (
                    <p className="text-xs text-orange-500">הודעות ממספר לא מזוהה — לא משויך לדייר</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden ${selectedContact._isUnlinked ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-gradient-to-br from-blue-400 to-blue-600'}`}>
                    {!selectedContact._isUnlinked && (selectedContact.whatsapp_profile_image_url || selectedContact.whatsapp_profile_image) ? (
                      <img src={selectedContact.whatsapp_profile_image_url || selectedContact.whatsapp_profile_image} alt={getPrimaryName(selectedContact)} className="w-full h-full object-cover" />
                    ) : selectedContact._isUnlinked ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      getPrimaryName(selectedContact).split(' ').map((n) => n[0]).join('').substring(0, 2)
                    )}
                  </div>
                </div>
              </div>

              {/* הודעות */}
              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-3 space-y-2 flex flex-col"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#ccc transparent' }}
              >
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <p className="text-lg">אין הודעות עדיין</p>
                      <p className="text-sm mt-1">התחל שיחה חדשה</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const prevMsg = idx > 0 ? messages[idx - 1] : null;
                      const showDate = !prevMsg ||
                        format(new Date(msg.timestamp), 'yyyy-MM-dd') !== format(new Date(prevMsg.timestamp), 'yyyy-MM-dd');
                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="flex justify-center my-4">
                              <span className="text-xs text-gray-600 bg-white bg-opacity-70 px-4 py-1 rounded-full shadow-sm">
                                {format(new Date(msg.timestamp), 'd בMMMM yyyy', { locale: he })}
                              </span>
                            </div>
                          )}
                          <ChatMessageBubble message={msg} />
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="p-4 bg-white border-t border-gray-200 flex gap-3 shadow-lg">
                {selectedContact._isUnlinked ? (
                  <div className="flex-1 flex items-center justify-center text-orange-500 text-sm gap-2 py-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>לא ניתן לשלוח הודעות לשיחה לא משויכת. יש לשייך לאיש קשר תחילה.</span>
                  </div>
                ) : (
                  <>
                    <input
                      ref={setFileInput}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-gray-600 hover:bg-gray-100"
                      onClick={() => fileInput?.click()}
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    <Input
                      placeholder="הקלד הודעה..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={sendMessageMutation.isPending}
                      className="bg-gray-100 border-0 rounded-full text-sm"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || sendMessageMutation.isPending}
                      size="icon"
                      className="bg-green-500 hover:bg-green-600 text-white rounded-full h-10 w-10"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center mx-auto mb-6">
                  <div className="text-4xl">💬</div>
                </div>
                <p className="text-2xl font-light">בחר שיחה להתחלה</p>
                <p className="text-sm mt-2">בחר איש קשר מהרשימה בצד כדי להתחיל שיחה</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* דיאלוג שיוך רטרואקטיבי */}
      {selectedContact?._isUnlinked && (
        <LinkUnlinkedDialog
          open={linkDialogOpen}
          onClose={() => setLinkDialogOpen(false)}
          senderPhone={selectedContact.phone}
          senderChatId={selectedContact.chatId}
          onLinked={(contact) => {
            setSelectedContact(contact);
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
          }}
        />
      )}
    </div>
  );
}