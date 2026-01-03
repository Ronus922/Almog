import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PRESET_COLORS = [
  // צבעי מקור
  { name: 'ירוק בהיר', value: 'bg-green-100 text-green-700 border-green-200' },
  { name: 'תכלת בהיר', value: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { name: 'לבן', value: 'bg-white text-slate-700 border-slate-300' },
  { name: 'ורוד בהיר', value: 'bg-pink-100 text-pink-700 border-pink-200' },
  { name: 'סגול בהיר', value: 'bg-purple-100 text-purple-700 border-purple-200' },
  { name: 'אפור בהיר', value: 'bg-slate-100 text-slate-700 border-slate-300' },
  
  // צבעים נוספים
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

export default function ColorPicker({ open, onClose, currentColor, onSelectColor, statusName }) {
  const [selectedColor, setSelectedColor] = useState(currentColor);

  const handleSelect = (colorValue) => {
    setSelectedColor(colorValue);
  };

  const handleSave = () => {
    onSelectColor(selectedColor);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-right">התאמת צבעים</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* תצוגה מקדימה */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3 text-right">תצוגה מקדימה:</p>
            <div className="flex justify-center">
              <Badge className={`${selectedColor} px-6 py-2 text-base font-semibold border`}>
                {statusName}
              </Badge>
            </div>
          </div>

          {/* פלטת צבעים */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3 text-right">בחר צבע:</p>
            
            {/* צבעי מקור */}
            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2 text-right">צבעי מקור</p>
              <div className="grid grid-cols-6 gap-3">
                {PRESET_COLORS.slice(0, 6).map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(color.value)}
                    className={`h-12 rounded-lg transition-all hover:scale-110 border-2 ${
                      selectedColor === color.value ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200'
                    } ${color.value.split(' ')[0]}`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* צבעים נוספים */}
            <div>
              <p className="text-xs text-slate-500 mb-2 text-right">צבעים נוספים</p>
              <div className="grid grid-cols-9 gap-3">
                {PRESET_COLORS.slice(6).map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(color.value)}
                    className={`h-10 rounded-lg transition-all hover:scale-110 border-2 ${
                      selectedColor === color.value ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200'
                    } ${color.value.split(' ')[0]}`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* כפתורי פעולה */}
        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            ביטול
          </Button>
          <Button onClick={handleSave} className="rounded-xl bg-blue-600 hover:bg-blue-700">
            שמירה
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}