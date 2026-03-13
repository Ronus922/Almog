import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Search, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import ChatMessageBubble from '@/components/whatsapp/ChatMessageBubble';

export default function WhatsAppChat() {
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);

  // Get all contacts with last message info
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const allContacts = await base44.entities.Contact.list();
      const allMessages = await base44.entities.ChatMessage.list();
      
      // Attach last message to each contact
      return allContacts.map(contact => {
        const lastMsg = allMessages
          .filter(m => m.contact_id === contact.id)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        
        return {
          ...contact,
          lastMessageTime: lastMsg?.timestamp || null,
          lastMessage: lastMsg || null
        };
      });
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60
  });

  // Get chat messages - sorted chronologically (oldest first for proper display)
  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', selectedContact?.id],
    queryFn: async () => {
      if (!selectedContact) return [];
      const msgs = await base44.entities.ChatMessage.filter({
        contact_id: selectedContact.id
      }, 'timestamp'); // Keep oldest first - they'll appear at top
      console.log('[WhatsAppChat] Messages fetched:', msgs.length, 'for contact:', selectedContact.id);
      return msgs;
    },
    enabled: !!selectedContact,
    staleTime: 1000 * 3,
    gcTime: 1000 * 60
  });

  // Subscribe to new messages in real-time
  useEffect(() => {
    if (!selectedContact?.id) return;

    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      console.log('[WhatsAppChat] Message event:', event.type, 'contact_id:', event.data?.contact_id, 'selected:', selectedContact.id);
      if (event.data?.contact_id === selectedContact.id) {
        console.log('[WhatsAppChat] Invalidating query for contact:', selectedContact.id);
        queryClient.invalidateQueries({ queryKey: ['chatMessages', selectedContact.id] });
      }
    });

    return () => unsubscribe?.();
  }, [selectedContact?.id]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      const phone = selectedContact.owner_phone || selectedContact.tenant_phone;
      if (!phone) throw new Error('אין מספר טלפון זמין');

      // Save to ChatMessage first
      const msg = await base44.entities.ChatMessage.create({
        contact_id: selectedContact.id,
        contact_phone: phone,
        direction: 'sent',
        message_type: 'text',
        content,
        timestamp: new Date().toISOString()
      });

      // Send via Green API
      try {
        await base44.functions.invoke('sendWhatsApp', {
          phone,
          message: content
        });
      } catch (error) {
        console.error('Failed to send via Green API:', error);
        // Message is still saved, but log the error
      }

      return msg;
    },
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['chatMessages', selectedContact.id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] }); // Update contacts list order
    },
    onError: (error) => {
      console.error('Message send error:', error);
    }
  });

  // Filter and sort contacts by last message (newest first)
  const filteredContacts = contacts
    .filter((contact) => {
      const searchLower = searchQuery.toLowerCase();
      const ownerName = (contact.owner_name || '').toLowerCase();
      const tenantName = (contact.tenant_name || '').toLowerCase();
      const apartmentNumber = (contact.apartment_number || '').toLowerCase();

      return (
        ownerName.includes(searchLower) ||
        tenantName.includes(searchLower) ||
        apartmentNumber.includes(searchLower)
      );
    })
    .sort((a, b) => {
      // Sort by last message time (newest first)
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
      return timeB - timeA;
    });

  const handleSendMessage = () => {
    if (messageInput.trim() && selectedContact) {
      sendMessageMutation.mutate(messageInput);
    }
  };

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="min-h-screen bg-gray-100 p-4" dir="rtl">
      <div className="max-w-7xl mx-auto h-screen flex gap-4">
        {/* Contacts List - Right Side (WhatsApp Web style) */}
        <div className="w-96 bg-white rounded-lg shadow-xl flex flex-col border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">הודעות</h2>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                placeholder="חיפוש..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-100 border-0 rounded-full"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                אין אנשי קשר
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const displayName = contact.owner_name || contact.tenant_name || 'ללא שם';
                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full p-3 text-right hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                      selectedContact?.id === contact.id ? 'bg-blue-50 border-r-4 border-r-blue-600' : ''
                    }`}
                  >
                    <div className="flex-1 text-right">
                      <div className="font-semibold text-gray-900 text-sm">
                        {displayName}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        דירה {contact.apartment_number}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Window - Left Side (WhatsApp Web style) */}
        <div className="flex-1 bg-white rounded-lg shadow-xl flex flex-col border border-gray-200 overflow-hidden">
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon">
                    <Plus className="w-5 h-5 text-gray-600" />
                  </Button>
                </div>
                <div className="text-right">
                  <h3 className="font-semibold text-gray-900">
                    {selectedContact.owner_name || selectedContact.tenant_name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    דירה {selectedContact.apartment_number}
                  </p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-400">
                      <p className="text-lg">אין הודעות עדיין</p>
                      <p className="text-sm mt-1">התחל שיחה חדשה</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const prevMsg = idx > 0 ? messages[idx - 1] : null;
                      const showDate = !prevMsg || 
                        format(new Date(msg.timestamp), 'yyyy-MM-dd') !== 
                        format(new Date(prevMsg.timestamp), 'yyyy-MM-dd');
                      
                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="flex justify-center my-3">
                              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                {format(new Date(msg.timestamp), 'd בMMMM', { locale: he })}
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

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200 bg-white flex gap-2">
                <Input
                  placeholder="הקלד הודעה..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={sendMessageMutation.isPending}
                  className="bg-gray-100 border-0 rounded-full"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  size="icon"
                  className="bg-green-500 hover:bg-green-600 text-white rounded-full"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <p className="text-xl">בחר שיחה להתחלה</p>
                <p className="text-sm mt-2">בחר איש קשר מהרשימה בצד</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}