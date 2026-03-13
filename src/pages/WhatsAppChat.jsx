import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Search } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function WhatsAppChat() {
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);

  // Get all contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10 // 10 minutes
  });

  // Get chat messages
  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', selectedContact?.id],
    queryFn: () => {
      if (!selectedContact) return [];
      return base44.entities.ChatMessage.filter({
        contact_id: selectedContact.id
      }, '-timestamp');
    },
    enabled: !!selectedContact,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 // 1 minute
  });

  // Subscribe to new messages in real-time
  useEffect(() => {
    if (!selectedContact?.id) return;

    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.contact_id === selectedContact.id) {
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
    },
    onError: (error) => {
      console.error('Message send error:', error);
    }
  });

  // Filter contacts by search
  const filteredContacts = contacts.filter((contact) => {
    const searchLower = searchQuery.toLowerCase();
    const ownerName = (contact.owner_name || '').toLowerCase();
    const tenantName = (contact.tenant_name || '').toLowerCase();
    const apartmentNumber = (contact.apartment_number || '').toLowerCase();

    return (
      ownerName.includes(searchLower) ||
      tenantName.includes(searchLower) ||
      apartmentNumber.includes(searchLower)
    );
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto h-screen flex gap-4">
        {/* Contacts List - Right Side */}
        <div className="w-80 bg-white rounded-lg shadow-lg flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">צ'אט וואטסאפ</h2>
            <div className="relative">
              <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="חיפוש לפי שם או דירה..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full p-4 text-right border-b border-slate-100 hover:bg-blue-50 transition-colors ${
                  selectedContact?.id === contact.id ? 'bg-blue-100 border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="font-semibold text-slate-800">
                  {contact.owner_name || contact.tenant_name}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  דירה {contact.apartment_number}
                </div>
                {contact.tenant_name && contact.owner_name && (
                  <div className="text-xs text-slate-400 mt-1">
                    שוכר: {contact.tenant_name}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Window - Left Side */}
        <div className="flex-1 bg-white rounded-lg shadow-lg flex flex-col">
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                <div className="text-right">
                  <h3 className="font-bold text-slate-800">
                    {selectedContact.owner_name || selectedContact.tenant_name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    דירה {selectedContact.apartment_number}
                  </p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white">
                {messages.length === 0 ? (
                  <div className="text-center text-slate-400 mt-8">
                    אין הודעות עדיין
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'sent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.direction === 'sent'
                            ? 'bg-blue-600 text-white rounded-bl-lg'
                            : 'bg-slate-200 text-slate-800 rounded-br-lg'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {format(new Date(msg.timestamp), 'HH:mm', { locale: he })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-slate-200 flex gap-2">
                <Input
                  placeholder="הקלד הודעה..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              בחר איש קשר כדי להתחיל שיחה
            </div>
          )}
        </div>
      </div>
    </div>
  );
}