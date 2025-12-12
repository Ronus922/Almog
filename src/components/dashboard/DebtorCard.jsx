import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Home, Wallet } from "lucide-react";

const STATUS_COLORS = {
  'תקין': 'bg-green-100 text-green-700 border-green-200',
  'לגבייה': 'bg-orange-100 text-orange-700 border-orange-200',
  'מכתב התראה': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'לטיפול משפטי': 'bg-red-100 text-red-700 border-red-200'
};

const BORDER_COLORS = {
  'תקין': 'border-r-green-500',
  'לגבייה': 'border-r-orange-500',
  'מכתב התראה': 'border-r-yellow-500',
  'לטיפול משפטי': 'border-r-red-500'
};

export default function DebtorCard({ record, onClick, settings }) {
  const formatCurrency = (num) => 
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);

  const formatPhone = (phone) => {
    if (!phone) return 'אין מספר';
    const cleaned = phone.replace(/\D/g, '');
    if (/^0+$/.test(cleaned)) return 'אין מספר';
    return phone;
  };

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
          <Badge variant="outline" className={`${STATUS_COLORS[status]} font-semibold text-xs`}>
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

        {/* Legal Status - removed from mobile card */}
      </div>
    </Card>
  );
}