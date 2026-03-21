import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/auth/AuthContext';
import ChatConversationList from '@/components/chat/ChatConversationList';
import ChatWindow from '@/components/chat/ChatWindow';
import NewChatDialog from '@/components/chat/NewChatDialog';
import { MessageCircle } from 'lucide-react';

function buildConvId(a, b) {
  return [a, b].sort().join('__');
}

export default function InternalChat() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  const [selectedConv, setSelectedConv] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);

  const { data: conversations = [] } = useQuery({
    queryKey: ['internal-conversations', currentUser?.username],
    queryFn: async () => {
      const [asA, asB] = await Promise.all([
        base44.entities.InternalConversation.filter({ participant_a: currentUser.username }),
        base44.entities.InternalConversation.filter({ participant_b: currentUser.username }),
      ]);
      const all = [...asA, ...asB];
      // sort by last_message_at desc
      return all.sort((a, b) => {
        const ta = a.last_message_at ? new Date(a.last_message_at) : new Date(0);
        const tb = b.last_message_at ? new Date(b.last_message_at) : new Date(0);
        return tb - ta;
      });
    },
    refetchInterval: 10000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['internal-messages', selectedConv?.conversation_id],
    queryFn: () => selectedConv
      ? base44.entities.InternalMessage.filter({ conversation_id: selectedConv.conversation_id })
      : Promise.resolve([]),
    enabled: !!selectedConv,
    refetchInterval: 5000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['app-users-chat'],
    queryFn: () => base44.entities.AppUser.filter({ is_active: true }),
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const unsub = base44.entities.InternalMessage.subscribe((event) => {
      if (event.data?.recipient_username === currentUser.username || event.data?.sender_username === currentUser.username) {
        qc.invalidateQueries({ queryKey: ['internal-conversations'] });
        if (selectedConv && event.data?.conversation_id === selectedConv.conversation_id) {
          qc.invalidateQueries({ queryKey: ['internal-messages', selectedConv.conversation_id] });
        }
      }
    });
    return unsub;
  }, [currentUser.username, selectedConv]);

  const sendMutation = useMutation({
    mutationFn: async ({ msgData, conv }) => {
      // Create message
      await base44.entities.InternalMessage.create({
        conversation_id: conv.conversation_id,
        sender_username: currentUser.username,
        sender_name: [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') || currentUser.username,
        recipient_username: conv.participant_a === currentUser.username ? conv.participant_b : conv.participant_a,
        ...msgData,
        is_read: false,
      });
      // Update conversation
      await base44.entities.InternalConversation.update(conv.id, {
        last_message_preview: msgData.content?.slice(0, 80),
        last_message_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['internal-messages', selectedConv?.conversation_id] });
      qc.invalidateQueries({ queryKey: ['internal-conversations'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (conv) => {
      const field = conv.participant_a === currentUser.username ? 'unread_count_a' : 'unread_count_b';
      await base44.entities.InternalConversation.update(conv.id, { [field]: 0 });
      // Mark messages as read
      const unread = messages.filter(m => m.sender_username !== currentUser.username && !m.is_read);
      for (const m of unread) {
        await base44.entities.InternalMessage.update(m.id, { is_read: true, read_at: new Date().toISOString() });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['internal-conversations'] });
      qc.invalidateQueries({ queryKey: ['internal-messages', selectedConv?.conversation_id] });
    },
  });

  const startNewChat = async (targetUser) => {
    setShowNewChat(false);
    const convId = buildConvId(currentUser.username, targetUser.username);
    // Check if exists
    const existing = conversations.find(c => c.conversation_id === convId);
    if (existing) { setSelectedConv(existing); return; }

    const targetName = [targetUser.first_name, targetUser.last_name].filter(Boolean).join(' ') || targetUser.username;
    const myName = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') || currentUser.username;

    const [a, b] = [currentUser.username, targetUser.username].sort();
    const aName = a === currentUser.username ? myName : targetName;
    const bName = b === currentUser.username ? myName : targetName;

    const newConv = await base44.entities.InternalConversation.create({
      conversation_id: convId,
      participant_a: a,
      participant_b: b,
      participant_a_name: aName,
      participant_b_name: bName,
    });
    qc.invalidateQueries({ queryKey: ['internal-conversations'] });
    setSelectedConv(newConv);
  };

  const totalUnread = conversations.reduce((sum, c) => {
    const unread = c.participant_a === currentUser.username ? (c.unread_count_a || 0) : (c.unread_count_b || 0);
    return sum + unread;
  }, 0);

  return (
    <div className="flex h-[calc(100vh-0px)] bg-slate-100" dir="rtl">
      {/* Sidebar — hidden on mobile when chat is selected */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-shrink-0 border-l border-slate-200 h-full overflow-hidden flex-col`}>
        <ChatConversationList
          conversations={conversations}
          currentUser={currentUser}
          selectedConvId={selectedConv?.conversation_id}
          onSelect={setSelectedConv}
          onNewChat={() => setShowNewChat(true)}
          users={users}
        />
      </div>

      {/* Chat Area — full width on mobile when chat selected */}
      <div className={`${selectedConv ? 'flex' : 'hidden md:flex'} flex-1 h-full overflow-hidden flex-col`}>
        {selectedConv ? (
          <ChatWindow
            conversation={selectedConv}
            currentUser={currentUser}
            messages={messages}
            onSend={(msgData) => sendMutation.mutate({ msgData, conv: selectedConv })}
            onMarkRead={(conv) => markReadMutation.mutate(conv)}
          />
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center h-full gap-4 text-slate-400">
            <div className="w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-600 mb-1">בחר שיחה</p>
              <p className="text-sm text-slate-400">בחר שיחה קיימת או פתח שיחה חדשה</p>
            </div>
          </div>
        )}
      </div>

      {showNewChat && (
        <NewChatDialog
          users={users}
          currentUser={currentUser}
          onStart={startNewChat}
          onClose={() => setShowNewChat(false)}
        />
      )}
    </div>
  );
}