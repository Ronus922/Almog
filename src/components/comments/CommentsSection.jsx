import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { toast } from 'sonner';

export default function CommentsSection({ debtorRecordId, apartmentNumber, currentUser, isAdmin }) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', debtorRecordId],
    queryFn: () => base44.entities.Comment.filter(
      { debtor_record_id: debtorRecordId },
      '-created_date'
    ),
    enabled: !!debtorRecordId,
  });

  const createCommentMutation = useMutation({
    mutationFn: (commentData) => base44.entities.Comment.create(commentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', debtorRecordId] });
      setNewComment('');
      setIsSubmitting(false);
      toast.success('הערה נוספה בהצלחה');
    },
    onError: () => {
      setIsSubmitting(false);
      toast.error('שגיאה בהוספת הערה');
    },
  });

  const handleSubmit = async () => {
    if (!newComment.trim()) {
      toast.error('נא להזין תוכן להערה');
      return;
    }

    if (!currentUser) {
      toast.error('משתמש לא מחובר');
      return;
    }

    setIsSubmitting(true);

    createCommentMutation.mutate({
      debtor_record_id: debtorRecordId,
      apartment_number: apartmentNumber,
      content: newComment.trim(),
      author_name: currentUser.username || currentUser.email,
      author_email: currentUser.email || currentUser.username,
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('he-IL');
    const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    return `${timeStr}  ${dateStr}`;
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* רשימת הערות */}
      <div className="bg-white border border-slate-200 rounded-xl max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-slate-500 text-sm">טוען הערות...</div>
        ) : comments.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-sm">אין הערות עדיין</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">
                      {comment.author_name}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {formatDateTime(comment.created_date)}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* טופס הוספת הערה */}
      {isAdmin && (
        <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4">
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="הוסיפו הערה..."
              className="flex-1 rounded-xl text-right resize-none bg-white"
              rows={2}
              dir="rtl"
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSubmit();
                }
              }}
            />
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !newComment.trim()}
              size="icon"
              className="bg-blue-600 hover:bg-blue-700 h-10 w-10 rounded-xl flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-right">
            לחץ Ctrl+Enter לשליחה מהירה
          </p>
        </div>
      )}
    </div>
  );
}