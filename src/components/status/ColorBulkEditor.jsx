import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

const PRESET_COLORS = [
  // שורה 1 - צבעי מקור
  { name: 'ירוק בהיר', value: 'bg-green-100 text-green-700 border-green-200' },
  { name: 'תכלת בהיר', value: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { name: 'לבן', value: 'bg-white text-slate-700 border-slate-300' },
  { name: 'ורוד בהיר', value: 'bg-pink-100 text-pink-700 border-pink-200' },
  { name: 'סגול בהיר', value: 'bg-purple-100 text-purple-700 border-purple-200' },
  { name: 'אפור בהיר', value: 'bg-slate-100 text-slate-700 border-slate-300' },
  
  // שורות נוספות
  { name: 'צהוב', value: 'bg-yellow-200 text-yellow-800 border-yellow-300' },
  { name: 'אפור', value: 'bg-gray-300 text-gray-700 border-gray-400' },
  { name: 'ירוק בהיר 2', value: 'bg-green-200 text-green-800 border-green-300' },
  { name: 'ליים', value: 'bg-lime-200 text-lime-800 border-lime-300' },
  { name: 'ורוד', value: 'bg-pink-200 text-pink-800 border-pink-300' },
  { name: 'כתום בהיר', value: 'bg-orange-200 text-orange-800 border-orange-300' },
  { name: 'תכלת', value: 'bg-cyan-200 text-cyan-800 border-cyan-300' },
  { name: 'אדום בהיר', value: 'bg-red-200 text-red-800 border-red-300' },
  { name: 'ירוק ים', value: 'bg-teal-200 text-teal-800 border-teal-300' },
  
  { name: 'כתום פסטל', value: 'bg-orange-100 text-orange-700 border-orange-200' },
  { name: 'חום בהיר', value: 'bg-amber-200 text-amber-800 border-amber-300' },
  { name: 'כחול בהיר', value: 'bg-blue-200 text-blue-800 border-blue-300' },
  { name: 'ירוק זית', value: 'bg-lime-300 text-lime-900 border-lime-400' },
  { name: 'כחול תכלת', value: 'bg-sky-200 text-sky-800 border-sky-300' },
  { name: 'ורוד בינוני', value: 'bg-pink-300 text-pink-900 border-pink-400' },
  { name: 'ירוק', value: 'bg-green-300 text-green-900 border-green-400' },
  { name: 'כחול', value: 'bg-blue-300 text-blue-900 border-blue-400' },
  { name: 'חום', value: 'bg-amber-300 text-amber-900 border-amber-400' },
  
  { name: 'כחול כהה', value: 'bg-blue-500 text-white border-blue-600' },
  { name: 'אדום', value: 'bg-red-400 text-white border-red-500' },
  { name: 'סגול', value: 'bg-purple-300 text-purple-900 border-purple-400' },
  { name: 'ירוק בהיר 3', value: 'bg-emerald-200 text-emerald-800 border-emerald-300' },
  { name: 'תכלת בהיר 2', value: 'bg-cyan-300 text-cyan-900 border-cyan-400' },
  { name: 'סגול בהיר 2', value: 'bg-violet-300 text-violet-900 border-violet-400' },
  { name: 'צהוב בהיר', value: 'bg-yellow-300 text-yellow-900 border-yellow-400' },
  { name: 'כתום', value: 'bg-orange-400 text-white border-orange-500' },
  { name: 'תכלת בהיר 3', value: 'bg-sky-100 text-sky-700 border-sky-200' },
];

export default function ColorBulkEditor({ open, onClose, statuses, onUpdateStatus }) {
  const [selectedStatusId, setSelectedStatusId] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const selectedStatus = statuses.find(s => s.id === selectedStatusId);

  const handleColorSelect = async (colorValue) => {
    if (!selectedStatus) {
      toast.error('בחר סטטוס תחילה');
      return;
    }

    setUpdatingStatus(selectedStatus.id);
    
    try {
      await onUpdateStatus(selectedStatus.id, { color: colorValue });
      toast.success(`צבע עודכן עבור ${selectedStatus.name}`);
    } catch (error) {
      toast.error('שגיאה בעדכון הצבע');
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-right">התאמת צבעים</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-[600px]" dir="rtl">
          {/* צד ימין - רשימת סטטוסים */}
          <div className="w-1/3 border-l border-slate-200 pl-6">
            <h3 className="text-sm font-bold text-slate-700 mb-3 text-right">סטטוסים</h3>
            <div className="space-y-2 overflow-y-auto max-h-[540px]">
              {statuses.map((status) => (
                <button
                  key={status.id}
                  onClick={() => setSelectedStatusId(status.id)}
                  disabled={updatingStatus === status.id}
                  className={`w-full text-right p-3 rounded-xl border-2 transition-all ${
                    selectedStatusId === status.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  } ${updatingStatus === status.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge className={`${status.color} border text-sm font-semibold`}>
                      {status.name}
                    </Badge>
                    {selectedStatusId === status.id && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* צד שמאל - בוחר צבעים */}
          <div className="flex-1">
            {selectedStatus ? (
              <div className="space-y-4">
                {/* תצוגה מקדימה */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3 text-right">תצוגה מקדימה:</p>
                  <div className="flex justify-center">
                    <Badge className={`${selectedStatus.color} px-6 py-2 text-base font-semibold border`}>
                      {selectedStatus.name}
                    </Badge>
                  </div>
                </div>

                {/* פלטת צבעים */}
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3 text-right">צבע מקור</p>
                  <div className="grid grid-cols-6 gap-3 mb-4">
                    {PRESET_COLORS.slice(0, 6).map((color, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleColorSelect(color.value)}
                        disabled={updatingStatus === selectedStatus.id}
                        className={`h-14 rounded-lg transition-all hover:scale-110 border-2 ${
                          selectedStatus.color === color.value ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200'
                        } ${color.value.split(' ')[0]} disabled:opacity-50`}
                        title={color.name}
                      />
                    ))}
                  </div>

                  <p className="text-sm font-semibold text-slate-700 mb-3 text-right">צבעים נוספים</p>
                  <div className="grid grid-cols-9 gap-3 overflow-y-auto max-h-[380px]">
                    {PRESET_COLORS.slice(6).map((color, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleColorSelect(color.value)}
                        disabled={updatingStatus === selectedStatus.id}
                        className={`h-12 rounded-lg transition-all hover:scale-110 border-2 ${
                          selectedStatus.color === color.value ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200'
                        } ${color.value.split(' ')[0]} disabled:opacity-50`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <p className="text-lg font-semibold mb-2">בחר סטטוס מהרשימה</p>
                  <p className="text-sm">לחץ על סטטוס כדי לשנות את צבעו</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} className="rounded-xl">
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}