import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Home, Wallet, Archive, Undo2, Lock } from "lucide-react";

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
      className={`p-5 hover:shadow-xl transition-all duration-300 cursor-pointer border-r-4 ${borderColor} bg-gradient-to-l from-white to-slate-50/50`}
      onClick={() => onClick(record)}
      dir="rtl"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-sm border border-blue-200/50">
              <Home className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900">דירה {record.apartmentNumber}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{record.ownerName || 'לא צוין'}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge variant="outline" className={`${legalStatusColor} font-bold text-xs px-3 py-1 transition-all duration-200 hover:opacity-90 border-2 shadow-sm`}>
              {legalStatusLabel}
            </Badge>
            {record.legal_status_lock && (
              <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                <Lock className="w-3 h-3" />
                <span className="font-medium">נעול</span>
              </div>
            )}
            {record.debt_status_auto && record.debt_status_auto !== legalStatusLabel && (
              <Badge variant="outline" className="bg-slate-50 text-slate-600 font-medium text-xs border-slate-300">
                {record.debt_status_auto}
              </Badge>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-center gap-2.5 text-sm bg-slate-50/70 px-3 py-2.5 rounded-lg border border-slate-200/50">
          <Phone className="w-4 h-4 text-slate-500" />
          <span className="text-slate-700 font-medium">{formatPhone(record.phonePrimary)}</span>
        </div>

        {/* Debt Summary */}
        <div className="pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 rounded-lg">
                <Wallet className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-sm text-slate-600 font-semibold">סה"כ חוב:</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(record.totalDebt)}</span>
          </div>
          {(record.monthlyDebt > 0 || record.specialDebt > 0) && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {record.monthlyDebt > 0 && (
                <div className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200 font-medium">
                  דמי ניהול: {formatCurrency(record.monthlyDebt)}
                </div>
              )}
              {record.specialDebt > 0 && (
                <div className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md border border-purple-200 font-medium">
                  מיוחד: {formatCurrency(record.specialDebt)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Archive Button - Admin Only */}
        {isAdmin && onArchiveToggle && (
          <div className="pt-3 border-t border-slate-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchiveToggle(record);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 transition-all duration-200 text-slate-700 text-sm font-semibold hover:shadow-md"
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