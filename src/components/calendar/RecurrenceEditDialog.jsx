import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function RecurrenceEditDialog({ isOpen, onClose, onEdit, appointmentTitle, isException }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0" dir="rtl">
        <div className="bg-gradient-to-l from-blue-600 to-indigo-600 px-6 py-6 text-white rounded-t-lg">
          <h2 className="text-xl font-bold">עריכת אירוע מחזורי</h2>
          <p className="text-sm text-blue-100 mt-1">בחר את ההיקף של העריכה</p>
        </div>
        
        <div className="px-6 py-4 space-y-3">
          <p className="text-base text-slate-700">
            האירוע "{appointmentTitle}" הוא חלק מסדרה מחזורית. מה תרצה לערוך?
          </p>
        </div>

        <div className="flex flex-col gap-2 px-6 pb-6 border-t border-slate-200">
          <Button
            onClick={() => onEdit('single')}
            variant="outline"
            className="w-full justify-center h-10 font-semibold text-slate-900 hover:bg-slate-50"
          >
            רק אירוע זה
          </Button>
          {!isException && (
            <>
              <Button
                onClick={() => onEdit('following')}
                variant="outline"
                className="w-full justify-center h-10 font-semibold text-slate-900 hover:bg-slate-50"
              >
                אירוע זה וכל הבאים
              </Button>
            </>
          )}
          <Button
            onClick={() => onEdit('all')}
            variant="outline"
            className="w-full justify-center h-10 font-semibold text-slate-900 hover:bg-slate-50"
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