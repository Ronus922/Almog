import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Home, Wallet, Archive, Undo2 } from "lucide-react";

const STATUS_COLORS = {
  'תקין': 'bg-green-100 text-green-700 border-green-200',
  'לגבייה מיידית': 'bg-orange-100 text-orange-700 border-orange-200',
  'חריגה מופרזת': 'bg-[#ff8080] text-white border-[#ff8080]'
};

const BORDER_COLORS = {
  'תקין': 'border-r-green-500',
  'לגבייה מיידית': 'border-r-orange-500',
  'חריגה מופרזת': 'border-r-[#ff8080]'
};

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
  
  const status = record.debt_status_auto || 'תקין';
  const borderColor = BORDER_COLORS[status] || BORDER_COLORS['תקין'];

  return (
    <Card 
      className={`p-4 hover:shadow-lg transition-all cursor-pointer border-r-4 ${borderColor}`}
      onClick={() => onClick(record)}
      dir="rtl"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Home className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">דירה {record.apartmentNumber}</h3>
              <p className="text-sm text-slate-600">{record.ownerName || 'לא צוין'}</p>
            </div>
          </div>
          <Badge variant="outline" className={`${STATUS_COLORS[status]} font-semibold text-xs transition-all duration-200 hover:opacity-80`}>
            {status}
          </Badge>
        </div>

        {/* Phone */}
        <div className="flex items-center gap-2 text-sm">
          <Phone className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700 font-medium">{formatPhone(record.phonePrimary)}</span>
        </div>

        {/* Debt Summary */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">סה"כ חוב:</span>
            </div>
            <span className="text-lg font-bold text-slate-800">{formatCurrency(record.totalDebt)}</span>
          </div>
        </div>

        {/* Legal Status */}
        {record.legal_status_manual && (
          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs text-slate-500">מצב משפטי:</p>
            <p className="text-sm font-semibold text-slate-700 mt-1">{record.legal_status_manual}</p>
          </div>
        )}

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