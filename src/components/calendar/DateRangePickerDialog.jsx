import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function DateRangePickerDialog({ isOpen, onClose, onSelect, defaultStart, defaultEnd }) {
  const [startDate, setStartDate] = useState(defaultStart ? format(defaultStart, 'yyyy-MM-dd') : '');
  const [endDate, setEndDate] = useState(defaultEnd ? format(defaultEnd, 'yyyy-MM-dd') : '');
  const [openStartPicker, setOpenStartPicker] = useState(false);
  const [openEndPicker, setOpenEndPicker] = useState(false);

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
            <label className="block text-sm font-semibold text-slate-900 text-right">מתאריך</label>
            <Popover open={openStartPicker} onOpenChange={setOpenStartPicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-10 bg-white hover:bg-slate-50 border-slate-200">
                  {startDate ? format(new Date(startDate + "T00:00:00"), "dd MMMM yyyy", { locale: he }) : "בחר תאריך"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" dir="rtl">
                <Calendar
                  mode="single"
                  selected={startDate ? new Date(startDate + "T00:00:00") : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setStartDate(format(date, "yyyy-MM-dd"));
                      setOpenStartPicker(false);
                    }
                  }}
                  locale={he}
                  className="text-lg"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-900 text-right">עד תאריך</label>
            <Popover open={openEndPicker} onOpenChange={setOpenEndPicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-10 bg-white hover:bg-slate-50 border-slate-200">
                  {endDate ? format(new Date(endDate + "T00:00:00"), "dd MMMM yyyy", { locale: he }) : "בחר תאריך"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" dir="rtl">
                <Calendar
                  mode="single"
                  selected={endDate ? new Date(endDate + "T00:00:00") : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setEndDate(format(date, "yyyy-MM-dd"));
                      setOpenEndPicker(false);
                    }
                  }}
                  locale={he}
                  className="text-lg"
                />
              </PopoverContent>
            </Popover>
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