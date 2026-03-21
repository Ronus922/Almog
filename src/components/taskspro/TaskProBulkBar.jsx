import React, { useState } from "react";
import { X, CheckSquare, Archive, RotateCcw, Trash2, UserCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TaskProBulkBar({ selectedIds, onClear, onBulkStatus, onBulkPriority, onBulkAssign, onBulkArchive, onBulkUnarchive, onBulkDelete, assignedOptions = [], isAdmin }) {
  const count = selectedIds.size;
  if (count === 0) return null;

  return (
    <div className="fixed bottom-4 right-2 left-2 sm:right-1/2 sm:left-auto sm:translate-x-1/2 z-50 bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-2 flex-wrap justify-center sm:justify-start max-w-full" dir="rtl">
      <div className="flex items-center gap-2">
        <CheckSquare className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-semibold">{count} נבחרו</span>
      </div>

      <div className="w-px h-6 bg-slate-600" />

      <Select onValueChange={(v) => onBulkStatus(v)}>
        <SelectTrigger className="w-32 h-8 bg-slate-700 border-slate-600 text-white text-xs">
          <SelectValue placeholder="שנה סטטוס" />
        </SelectTrigger>
        <SelectContent>
          {["פתוחה","בטיפול","הושלמה","בוטלה","ממתינה"].map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select onValueChange={(v) => onBulkPriority(v)}>
        <SelectTrigger className="w-32 h-8 bg-slate-700 border-slate-600 text-white text-xs">
          <SelectValue placeholder="שנה עדיפות" />
        </SelectTrigger>
        <SelectContent>
          {["גבוהה","בינונית","נמוכה"].map((p) => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select onValueChange={(v) => onBulkAssign(v)}>
        <SelectTrigger className="w-36 h-8 bg-slate-700 border-slate-600 text-white text-xs">
          <SelectValue placeholder="שנה משויך" />
        </SelectTrigger>
        <SelectContent>
          {assignedOptions.map((o) => (
            <SelectItem key={o.username} value={o.username}>{o.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-slate-600" />

      <button
        onClick={onBulkArchive}
        className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-orange-600 px-3 py-1.5 rounded-lg transition-colors"
      >
        <Archive className="w-3.5 h-3.5" /> ארכב
      </button>

      <button
        onClick={onBulkUnarchive}
        className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" /> בטל ארכיב
      </button>

      {isAdmin && (
        <button
          onClick={onBulkDelete}
          className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> מחק
        </button>
      )}

      <div className="w-px h-6 bg-slate-600" />

      <button onClick={onClear} className="text-slate-400 hover:text-white transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}