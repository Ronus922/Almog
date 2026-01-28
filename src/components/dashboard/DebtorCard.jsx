import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Home, Wallet, Archive, Undo2 } from "lucide-react";

export default function DebtorCard({ record, onClick, settings, isAdmin, showArchived, onArchiveToggle, allStatuses = [] }) {
  const formatCurrency = (num) => 
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);

  const formatPhone = (phone) => {
    if (!phone) return 'אין מספר';
    const cleaned = phone.replace(/\D/g, '');
    if (/^0+$/.test(cleaned)) return 'אין מספר';
    return phone;
  };

  // Find legal status
  const legalStatus = allStatuses.find(s => s.id === record.legal_status_id);
  const legalStatusLabel = legalStatus?.name || 'לא הוגדר';
  const legalStatusColor = legalStatus?.color || 'bg-slate-100 text-slate-700';
  
  const borderColor = legalStatus?.color ? legalStatus.color.replace('bg-', 'border-r-') : 'border-r-slate-300';

  return (
    <Card 
      className={`p-4 hover:shadow-lg transition-all cursor-pointer border-r-4 ${borderColor} bg-gradient-to-l from-white to-slate-50/30`}
      onClick={() => onClick(record)}
      dir="rtl"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-sm">
              <Home className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">דירה {record.apartmentNumber}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{record.ownerName || 'לא צוין'}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 items-end">
            <Badge variant="outline" className={`${legalStatusColor} font-semibold text-xs transition-all duration-200 hover:opacity-80 border shadow-sm`}>
              {legalStatusLabel}
            </Badge>
            {record.legal_status_lock && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                🔒 נעול
              </span>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-2 rounded-lg">
          <Phone className="w-4 h-4 text-slate-500" />
          <span className="text-slate-700 font-medium">{formatPhone(record.phonePrimary)}</span>
        </div>

        {/* Debt Summary */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600 font-medium">סה"כ חוב:</span>
            </div>
            <span className="text-xl font-bold text-slate-900">{formatCurrency(record.totalDebt)}</span>
          </div>
          {(record.monthlyDebt > 0 || record.specialDebt > 0) && (
            <div className="mt-2 flex gap-2 text-xs text-slate-500">
              {record.monthlyDebt > 0 && (
                <span>דמי ניהול: {formatCurrency(record.monthlyDebt)}</span>
              )}
              {record.specialDebt > 0 && (
                <span>מיוחד: {formatCurrency(record.specialDebt)}</span>
              )}
            </div>
          )}
        </div>

        {/* Archive Button - Admin Only */}
        {isAdmin && onArchiveToggle && (
          <div className="pt-2 border-t border-slate-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchiveToggle(record);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 text-sm font-semibold"
            >
              {showArchived ? (
                <>
                  <Undo2 className="w-4 h-4" />
                  החזר לחייבים
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  העבר לארכיון
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}