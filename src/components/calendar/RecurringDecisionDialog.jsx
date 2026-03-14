import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function RecurringDecisionDialog({
  isOpen,
  onClose,
  onDecision,
  appointmentTitle,
  mode = 'edit', // edit, delete, move
  isLoading = false,
}) {
  const getModeText = () => {
    if (mode === 'delete') return 'מחיקה';
    if (mode === 'move') return 'הזזה';
    return 'עריכה';
  };

  const getDecisionLabels = () => {
    const common = {
      'this-only': 'אירוע זה בלבד',
      'this-and-future': 'אירוע זה והאירועים העתידיים',
      'entire-series': 'כל הסדרה',
    };
    return common;
  };

  const labels = getDecisionLabels();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>אירוע חוזר</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            האירוע "<strong>{appointmentTitle}</strong>" חוזר בתדירות. איזו גרסה תרצה {getModeText()}?
          </p>

          <div className="space-y-2">
            <Button
              onClick={() => onDecision('this-only')}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start text-right"
            >
              <span>{labels['this-only']}</span>
            </Button>

            <Button
              onClick={() => onDecision('this-and-future')}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start text-right"
            >
              <span>{labels['this-and-future']}</span>
            </Button>

            <Button
              onClick={() => onDecision('entire-series')}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start text-right"
            >
              <span>{labels['entire-series']}</span>
            </Button>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              ביטול
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}