import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, X, Link, CheckCheck, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import TaskLinkPicker from './TaskLinkPicker';

export default function ChatWindow({ conversation, currentUser, messages, onSend, onMarkRead }) {
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showTaskLink, setShowTaskLink] = useState(false);
  const [linkedTask, setLinkedTask] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const otherName = conversation.participant_a === currentUser.username
    ? conversation.participant_b_name
    : conversation.participant_a_name;
  const otherUser = conversation.participant_a === currentUser.username
    ? conversation.participant_b
    : conversation.participant_a;
  const initials = otherName?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (onMarkRead) onMarkRead(conversation);
  }, [conversation?.conversation_id]);

  const handleSend = () => {
    if (!text.trim() && !linkedTask) return;
    onSend({
      content: text.trim() || (linkedTask ? `🔗 קישור למשימה: ${linkedTask.title}` : ''),
      reply_to_id: replyTo?.id || null,
      reply_to_preview: replyTo?.content?.slice(0, 60) || null,
      task_pro_id: linkedTask?.id || null,
      task_pro_title: linkedTask?.title || null,
    });
    setText('');
    setReplyTo(null);
    setLinkedTask(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const grouped = groupByDate(messages);

  return (
    <div className="flex flex-col h-full bg-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {initials}
        </div>
        <div>
          <h3 className="font-bold text-slate-800">{otherName || otherUser}</h3>
          <p className="text-xs text-slate-400">שיחה פרטית</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {grouped.map(({ date, msgs }) => (
          <div key={date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{date}</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            {msgs.map(msg => (
              <MessageBubble key={msg.id} msg={msg} isOwn={msg.sender_username === currentUser.username} onReply={setReplyTo} />
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="mx-4 mb-1 px-3 py-2 bg-blue-50 border-r-4 border-blue-400 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600 mb-0.5">תגובה להודעה</p>
            <p className="text-xs text-slate-600 truncate max-w-xs">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Task link preview */}
      {linkedTask && (
        <div className="mx-4 mb-1 px-3 py-2 bg-emerald-50 border-r-4 border-emerald-400 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 mb-0.5">🔗 משימה מקושרת</p>
            <p className="text-xs text-slate-600 truncate max-w-xs">{linkedTask.title}</p>
          </div>
          <button onClick={() => setLinkedTask(null)} className="text-slate-400 hover:text-slate-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-4 py-3">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowTaskLink(true)}
            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-300 transition-colors flex-shrink-0"
            title="קשר למשימה"
          >
            <Link className="w-4 h-4" />
          </button>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="כתוב הודעה..."
              rows={1}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all min-h-[42px] max-h-[120px]"
              style={{ lineHeight: '1.5' }}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!text.trim() && !linkedTask}
            className="w-9 h-9 p-0 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 text-right">Enter לשליחה · Shift+Enter לשורה חדשה</p>
      </div>

      {showTaskLink && (
        <TaskLinkPicker
          onSelect={task => { setLinkedTask(task); setShowTaskLink(false); }}
          onClose={() => setShowTaskLink(false)}
        />
      )}
    </div>
  );
}

function MessageBubble({ msg, isOwn, onReply }) {
  return (
    <div className={`flex ${isOwn ? 'justify-start' : 'justify-end'} mb-1 group`}>
      <div className={`max-w-[70%] ${isOwn ? 'items-start' : 'items-end'} flex flex-col`}>
        {msg.reply_to_preview && (
          <div className={`px-3 py-1.5 mb-1 rounded-lg text-xs ${isOwn ? 'bg-blue-50 border-r-2 border-blue-300' : 'bg-slate-100 border-r-2 border-slate-300'} text-slate-500`}>
            <span className="font-medium">↩ ↩</span> {msg.reply_to_preview}
          </div>
        )}
        {msg.task_pro_id && (
          <div className={`px-3 py-1.5 mb-1 rounded-lg text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1.5 cursor-pointer hover:bg-emerald-100 transition-colors`}
            onClick={() => window.location.href = '/TasksPro'}>
            <ExternalLink className="w-3 h-3" />
            <span>משימה: <strong>{msg.task_pro_title}</strong></span>
          </div>
        )}
        <div
          className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
            ${isOwn
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
            }`}
        >
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-start' : 'justify-end'}`}>
            <span className={`text-xs ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
              {msg.created_date ? format(new Date(msg.created_date), 'HH:mm') : ''}
            </span>
            {isOwn && (
              msg.is_read
                ? <CheckCheck className="w-3 h-3 text-blue-200" />
                : <Check className="w-3 h-3 text-blue-300" />
            )}
          </div>
          <button
            onClick={() => onReply(msg)}
            className={`absolute -bottom-2 ${isOwn ? 'left-0' : 'right-0'} opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-200 rounded-full px-2 py-0.5 text-xs text-slate-500 hover:text-slate-700 shadow-sm`}
          >
            ↩ השב
          </button>
        </div>
      </div>
    </div>
  );
}

function groupByDate(messages) {
  const groups = {};
  for (const msg of messages) {
    const d = msg.created_date ? format(new Date(msg.created_date), 'dd/MM/yyyy') : 'היום';
    if (!groups[d]) groups[d] = [];
    groups[d].push(msg);
  }
  return Object.entries(groups).map(([date, msgs]) => ({ date, msgs }));
}