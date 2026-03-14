import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogClose
} from "@/components/ui/dialog";
import { Send, X, MessageSquare } from "lucide-react";
import { toast } from 'sonner';

export default function QuickCommentDialog({ 
  open, 
  onClose, 
  record, 
  currentUser, 
  isAdmin 
}) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', record?.id],
    queryFn: () => base44.entities.Comment.filter(
      { debtor_record_id: record.id },
      '-created_date'
    ),
    enabled: !!record?.id,
  });

  const createCommentMutation = useMutation({
    mutationFn: (commentData) => base44.entities.Comment.create(commentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', record?.id] });
      setComment('');
      setIsSubmitting(false);
      toast.success('הערה נוספה בהצלחה');
    },
    onError: () => {
      setIsSubmitting(false);
      toast.error('שגיאה בהוספת הערה');
    },
  });

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error('נא להזין תוכן להערה');
      return;
    }

    if (!currentUser || !record) {
      toast.error('נתונים חסרים');
      return;
    }

    setIsSubmitting(true);

    const fullName = currentUser.isBase44Admin 
      ? currentUser.firstName
      : (currentUser.firstName && currentUser.lastName 
          ? `${currentUser.firstName} ${currentUser.lastName}`
          : currentUser.firstName || currentUser.username);

    createCommentMutation.mutate({
      debtor_record_id: record.id,
      apartment_number: record.apartmentNumber,
      content: comment.trim(),
      author_name: fullName,
      author_email: currentUser.email || currentUser.username,
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('he-IL');
    const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    return `${timeStr} ${dateStr}`;
  };

  if (!record) return null;

  const lastComment = comments.length > 0 ? comments[0] : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-w-lg w-full p-0 overflow-hidden flex flex-col border shadow-lg rounded-lg bg-background"
        style={{ maxHeight: '90vh', maxWidth: '472px' }}
        dir="rtl"
      >
        {/* כפתור סגירה */}
        <DialogClose className="absolute left-4 top-4 rounded-lg bg-white/20 p-1.5 hover:bg-white/40 transition-colors z-10">
          <X className="h-5 w-5 text-white" />
          <span className="sr-only">סגור</span>
        </DialogClose>

        {/* כותרת */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-lg flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-white" />
          <div>
            <div className="text-white text-lg font-bold">הערות לדירה {record.apartmentNumber}</div>
            <p className="text-blue-100 text-sm mt-1">{record.ownerName || 'ללא שם'}</p>
          </div>
        </div>

        {/* תוכן ראשי */}
        <div className="space-y-4 flex-1 overflow-y-auto px-6 pt-4 pb-6">
          {/* ההערה האחרונה */}
          {lastComment && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-600">הערה אחרונה</span>
                <span className="font-bold text-sm text-blue-700">{lastComment.author_name}</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap mb-3">
                {lastComment.content}
              </p>
              <span className="text-xs text-slate-500">
                {formatDateTime(lastComment.created_date)}
              </span>
            </div>
          )}

          {/* טופס הוספת הערה */}
          {isAdmin && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">
                הוסף הערה חדשה
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="כתוב הערה..."
                className="rounded-lg text-sm resize-none border-slate-200 bg-white"
                rows={4}
                dir="rtl"
                disabled={isSubmitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleSubmit();
                  }
                }}
              />
              <p className="text-xs text-slate-500 text-right">
                Ctrl+Enter לשליחה מהירה
              </p>
            </div>
          )}
        </div>

        {/* כפתורי פעולה */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg h-9"
          >
            סגור
          </Button>
          {isAdmin && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !comment.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 gap-2"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'שולח...' : 'הוסף הערה'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}