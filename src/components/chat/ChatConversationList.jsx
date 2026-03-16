import React, { useState } from 'react';
import { Search, MessageCircle, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

export default function ChatConversationList({ conversations, currentUser, selectedConvId, onSelect, onNewChat, users }) {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter(c => {
    const otherName = c.participant_a === currentUser.username ? c.participant_b_name : c.participant_a_name;
    return !search || otherName?.toLowerCase().includes(search.toLowerCase());
  });

  const getUnread = (c) => {
    if (c.participant_a === currentUser.username) return c.unread_count_a || 0;
    return c.unread_count_b || 0;
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800">הודעות פנימיות</h2>
          <Button size="sm" onClick={onNewChat} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-lg h-8 px-3 text-xs">
            <Plus className="w-3.5 h-3.5" />
            שיחה חדשה
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש שיחה..."
            className="pr-9 h-9 text-sm bg-slate-50 border-slate-200 rounded-lg"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 py-12">
            <MessageCircle className="w-10 h-10 opacity-30" />
            <p className="text-sm">אין שיחות עדיין</p>
          </div>
        ) : (
          filtered.map(c => {
            const otherName = c.participant_a === currentUser.username ? c.participant_b_name : c.participant_a_name;
            const otherUser = c.participant_a === currentUser.username ? c.participant_b : c.participant_a;
            const unread = getUnread(c);
            const isActive = selectedConvId === c.conversation_id;
            const initials = otherName?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';

            return (
              <button
                key={c.conversation_id}
                onClick={() => onSelect(c)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all text-right border-b border-slate-50 hover:bg-slate-50 ${isActive ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                    {initials}
                  </div>
                  {unread > 0 && (
                    <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                      {unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-slate-800 text-sm truncate">{otherName || otherUser}</span>
                    {c.last_message_at && (
                      <span className="text-xs text-slate-400 flex-shrink-0 mr-2">
                        {formatDistanceToNow(new Date(c.last_message_at), { locale: he, addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs truncate ${unread > 0 ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                    {c.last_message_preview || 'אין הודעות עדיין'}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}