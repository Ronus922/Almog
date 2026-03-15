import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Repeat2 } from 'lucide-react';

export default function RecurringFilter({ value, onChange }) {
  return (
    <div className="flex items-center gap-2" dir="rtl">
      <Repeat2 className="w-4 h-4 text-slate-600" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-48 h-10">
          <SelectValue placeholder="סוג מקור" />
        </SelectTrigger>
        <SelectContent dir="rtl">
          <SelectItem value={null}>הכל</SelectItem>
          <SelectItem value="recurring_only">מחזוריות בלבד</SelectItem>
          <SelectItem value="manual_only">ידניות בלבד</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}