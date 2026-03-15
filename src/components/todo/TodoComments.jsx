import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Send, Trash2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TodoComments({ itemId, currentUsername, isOwner }) {
  const [body, setBody] = useState('');
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['todo-comments', itemId],
    queryFn: async () => {
      const all = await base44.entities.TodoComment.list();
      return all
        .filter(c => c.todo_item_id === itemId)
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    staleTime: 0,
    enabled: !!itemId,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      base44.entities.TodoComment.create({
        todo_item_id: itemId,
        user_id: currentUsername,
        body: body.trim(),
      }),
    onSuccess: () => {
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['todo-comments', itemId] });
    },
    onError: e => toast.error('שגיאה בהוספת תגובה: ' + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TodoComment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todo-comments', itemId] }),
    onError: e => toast.error('שגיאה במחיקת תגובה: ' + e.message),
  });

  const canDeleteComment = (comment) =>
    comment.user_id === currentUsername || isOwner;

  return (
    <div dir="rtl" className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <MessageCircle className="w-4 h-4 text-blue-500" />
        תגובות {comments.length > 0 && <span className="text-slate-400 font-normal">({comments.length})</span>}
      </div>

      <div className="space-y-2 max-h-52 overflow-y-auto">
        {comments.length === 0 && (
          <p className="text-slate-400 text-xs text-center py-3">אין תגובות עדיין</p>
        )}
        {comments.map(c => (
          <div key={c.id} className="bg-slate-50 rounded-lg px-3 py-2 flex items-start gap-2 group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-slate-700">{c.user_id}</span>
                <span className="text-xs text-slate-400">
                  {new Date(c.created_date).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{c.body}</p>
            </div>
            {canDeleteComment(c) && (
              <button
                onClick={() => deleteMutation.mutate(c.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-400 hover:text-red-600 rounded flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <input
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="הוסף תגובה..."
          dir="rtl"
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && body.trim()) {
              e.preventDefault();
              addMutation.mutate();
            }
          }}
        />
        <Button
          size="sm"
          disabled={!body.trim() || addMutation.isPending}
          onClick={() => addMutation.mutate()}
          className="bg-blue-600 hover:bg-blue-700 text-white h-9 w-9 p-0 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}