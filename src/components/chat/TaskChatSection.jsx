import React, { useState, useEffect, useRef } from 'react';
import { Send, Check, CheckCheck, MessageCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function TaskChatSection({ taskId, currentUser }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const qc = useQueryClient();

  const convId = `task_${taskId}`;

  const { data: messages = [] } = useQuery({
    queryKey: ['task-chat', taskId],
    queryFn: () => base44.entities.InternalMessage.filter({ conversation_id: convId }),
    refetchInterval: 5000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const unsub = base44.entities.InternalMessage.subscribe((event) => {
      if (event.data?.conversation_id === convId) {
        qc.invalidateQueries({ queryKey: ['task-chat', taskId] });
      }
    });
    return unsub;
  }, [taskId]);

  const sendMutation = useMutation({
    mutationFn: (content) => base44.entities.InternalMessage.create({
      conversation_id: convId,
      sender_username: currentUser.username,
      sender_name: [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') || currentUser.username,
      content,
      task_pro_id: taskId,
      is_read: false,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-chat', taskId] });
      setText('');
    },
  });

  const handleSend = () => {
    if (!text.trim()) return;
    sendMutation.mutate(text.trim());
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-8">
            <MessageCircle className="w-8 h-8 opacity-30" />
            <p className="text-sm">אין הודעות בשיחה זו עדיין</p>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = msg.sender_username === currentUser.username;
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-start' : 'justify-end'} mb-1`}>
                <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm shadow-sm leading-relaxed
                  ${isOwn
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                  }`}
                >
                  {!isOwn && (
                    <p className="text-xs font-semibold text-blue-500 mb-1">{msg.sender_name || msg.sender_username}</p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-start' : 'justify-end'}`}>
                    <span className={`text-xs ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                      {msg.created_date ? format(new Date(msg.created_date), 'HH:mm') : ''}
                    </span>
                    {isOwn && <CheckCheck className="w-3 h-3 text-blue-200" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-3 bg-white">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="כתוב הודעה..."
              rows={1}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all min-h-[38px] max-h-[100px]"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center text-white flex-shrink-0 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}