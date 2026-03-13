import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function RecurrenceDeleteDialog({ isOpen, onClose, onDelete, appointmentTitle }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0" dir="rtl">
        <div className="bg-gradient-to-l from-red-600 to-orange-600 px-6 py-6 text-white rounded-t-lg">
          <h2 className="text-xl font-bold">מחיקת אירוע מחזורי</h2>
          <p className="text-sm text-red-100 mt-1">בחר את ההיקף של המחיקה</p>
        </div>
        
        <div className="px-6 py-4 space-y-3">
          <p className="text-base text-slate-700">
            האירוע "{appointmentTitle}" הוא חלק מסדרה מחזורית. מה תרצה למחוק?
          </p>
        </div>

        <div className="flex flex-col gap-2 px-6 pb-6 border-t border-slate-200">
          <Button
            onClick={() => onDelete('single')}
            variant="outline"
            className="w-full justify-center h-10 font-semibold text-slate-900 hover:bg-slate-50"
          >
            רק את האירוע הזה
          </Button>
          <Button
            onClick={() => onDelete('following')}
            variant="destructive"
            className="w-full justify-center h-10 font-semibold"
          >
            את כל האירועים העתידיים
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