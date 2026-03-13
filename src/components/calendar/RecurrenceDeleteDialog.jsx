import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function RecurrenceDeleteDialog({ isOpen, onClose, onDelete, appointmentTitle }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader className="border-b border-slate-200 pb-4 mb-4">
          <DialogTitle className="text-xl font-bold text-slate-900">מחיקת אירוע מחזורי</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-3">
          <DialogDescription className="text-base text-slate-700">
            האירוע "{appointmentTitle}" הוא חלק מסדרה מחזורית. מה תרצה למחוק?
          </DialogDescription>
        </div>

        <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
          <Button
            onClick={() => onDelete('single')}
            variant="outline"
            className="w-full justify-center h-10 font-semibold text-slate-900 hover:bg-slate-50"
          >
            רק אירוע זה
          </Button>
          <Button
            onClick={() => onDelete('all')}
            variant="destructive"
            className="w-full justify-center h-10 font-semibold"
          >
            את כל הסדרה
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full justify-center h-10 font-semibold text-slate-600"
          >
            חזור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}