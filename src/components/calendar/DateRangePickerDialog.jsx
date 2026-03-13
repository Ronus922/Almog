import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function DateRangePickerDialog({ isOpen, onClose, onSelect, defaultStart, defaultEnd }) {
  const [startDate, setStartDate] = useState(defaultStart ? format(defaultStart, 'yyyy-MM-dd') : '');
  const [endDate, setEndDate] = useState(defaultEnd ? format(defaultEnd, 'yyyy-MM-dd') : '');

  const handleApply = () => {
    if (startDate && endDate) {
      onSelect(new Date(startDate), new Date(endDate));
      onClose();
    }
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    onSelect(null, null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">בחר טווח תאריכים</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4" dir="rtl">
          {/* Start Date */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-900 text-right">
              <span className="flex items-center justify-end gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                מתאריך
              </span>
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-right"
              dir="rtl"
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-900 text-right">
              <span className="flex items-center justify-end gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                עד תאריך
              </span>
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-right"
              dir="rtl"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              onClick={handleApply}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!startDate || !endDate}
            >
              אישור
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="flex-1"
            >
              איפוס
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              className="flex-1"
            >
              ביטול
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}