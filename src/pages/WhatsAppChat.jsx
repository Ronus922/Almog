import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Search, Plus, Phone, Info, Paperclip, Image as ImageIcon } from 'lucide-react';
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
    staleTime: 0,
    refetchInterval: 1000,
    gcTime: 1000 * 60
  });

  // Subscribe to new messages in real-time
  useEffect(() => {
    if (!selectedContact?.id) return;

    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      console.log('[WhatsAppChat] Message event:', event.type, 'contact_id:', event.data?.contact_id, 'selected:', selectedContact.id);
      if (event.data?.contact_id === selectedContact.id) {
        console.log('[WhatsAppChat] New message received:', event.data.id);
        // Update cache directly with new message
        queryClient.setQueryData(['chatMessages', selectedContact.id], (old = []) => {
          return [...old, event.data];
        });
      }
    });

    return () => unsubscribe?.();
  }, [selectedContact?.id, queryClient]);

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
    <div className="h-screen flex gap-0 bg-gray-100 overflow-hidden" dir="rtl" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23ECE5DD\'/%3E%3Cpath d=\'M50 0L100 50L50 100L0 50z\' fill=\'%23E8DED2\' opacity=\'0.3\'/%3E%3C/svg%3E")', backgroundSize: '100px 100px' }}>
      <div className="w-96 bg-white flex flex-col shadow-lg border-l border-gray-200 overflow-hidden">
        {/* Contacts List - Right Side - Removed, now part of main container */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">הודעות</h2>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                placeholder="חיפוש..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-100 border-0 rounded-full text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3cb371 transparent' }}>
            {filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                אין אנשי קשר
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const displayName = contact.owner_name || contact.tenant_name || 'ללא שם';
                const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2);
                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full p-3 text-right hover:bg-gray-50 transition-colors flex items-center gap-3 border-r-4 ${
                      selectedContact?.id === contact.id ? 'border-r-blue-500' : 'border-r-transparent'
                    }`}
                    style={selectedContact?.id === contact.id ? { backgroundColor: '#f9fff5' } : {}}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                      {contact.whatsapp_profile_image ? (
                        <img src={contact.whatsapp_profile_image} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="flex-1 text-right min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">
                        {displayName}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5 truncate">
                        דירה {contact.apartment_number}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col" style={{ backgroundColor: '#fef5ea' }}>
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Info className="w-5 h-5 text-blue-600" />
                  </Button>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {selectedContact.owner_name || selectedContact.tenant_name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      דירה {selectedContact.apartment_number}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                    {selectedContact.whatsapp_profile_image ? (
                      <img src={selectedContact.whatsapp_profile_image} alt={selectedContact.owner_name || selectedContact.tenant_name} className="w-full h-full object-cover" />
                    ) : (
                      (selectedContact.owner_name || selectedContact.tenant_name).split(' ').map(n => n[0]).join('').substring(0, 2)
                    )}
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 flex flex-col" style={{ backgroundColor: '#fef5ea', scrollbarWidth: 'thin', scrollbarColor: '#ccc transparent' }}>
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
                        format(new Date(msg.timestamp), 'yyyy-MM-dd') !== 
                        format(new Date(prevMsg.timestamp), 'yyyy-MM-dd');
                      
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

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-gray-200 flex gap-3 shadow-lg">
                <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-600 hover:bg-gray-100">
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-600 hover:bg-gray-100">
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
    </div>
  );
}