import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Send, X } from "lucide-react";
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
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-right">
            הערות לדירה {record.apartmentNumber}
          </DialogTitle>
          <DialogDescription className="text-right">
            {record.ownerName || 'ללא שם'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ההערה האחרונה */}
          {lastComment && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">הערה אחרונה</span>
                <span className="font-bold text-sm text-blue-700">{lastComment.author_name}</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2">
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
                className="rounded-lg text-right resize-none bg-white"
                rows={3}
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

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-lg h-10"
          >
            <X className="w-4 h-4 ml-2" />
            סגור
          </Button>
          {isAdmin && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !comment.trim()}
              className="bg-blue-600 hover:bg-blue-700 rounded-lg h-10"
            >
              <Send className="w-4 h-4 ml-2" />
              {isSubmitting ? 'שולח...' : 'הוסף הערה'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}