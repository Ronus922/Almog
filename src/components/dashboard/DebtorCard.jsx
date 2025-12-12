import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Wallet, Calendar, ChevronLeft } from "lucide-react";

const STATUS_COLORS = {
  'סדיר': 'bg-green-100 text-green-700 border-green-200',
  'חייב': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'חייב משמעותי': 'bg-orange-100 text-orange-700 border-orange-200',
  'מועמד לתביעה': 'bg-slate-100 text-slate-700 border-slate-200',
  'בתביעה': 'bg-red-100 text-red-700 border-red-200',
  'בהסדר': 'bg-blue-100 text-blue-700 border-blue-200'
};

import DebtSeverityBadge, { getDebtSeverityColor } from './DebtSeverityBadge';

export default function DebtorCard({ record, onClick, settings }) {
  const formatCurrency = (num) => 
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);

  const formatPhone = (phone) => {
    if (!phone) return 'אין מספר';
    const cleaned = phone.replace(/\D/g, '');
    if (/^0+$/.test(cleaned)) return 'אין מספר';
    return phone;
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer border-r-4 border-r-blue-500"
      onClick={() => onClick(record)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs text-slate-500 font-semibold mb-1">דירה</div>
            <div className="text-2xl font-bold text-slate-800">{record.apartmentNumber}</div>
          </div>
          <Badge variant="outline" className={`${STATUS_COLORS[record.status] || 'bg-slate-100 text-slate-700'} font-semibold text-xs`}>
            {record.status || 'סדיר'}
          </Badge>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">בעל דירה</span>
            <span className="text-sm font-semibold text-slate-700">{record.ownerName || '-'}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              טלפון
            </span>
            <span className="text-sm font-medium text-slate-700" dir="ltr">{formatPhone(record.phonePrimary)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3 pt-3 border-t">
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">סה״כ חוב</div>
            <div className="text-sm font-bold text-rose-600">{formatCurrency(record.totalDebt)}</div>
          </div>
          <div className="text-center border-x border-slate-200">
            <div className="text-xs text-slate-500 mb-1">חודשי</div>
            <div className="text-sm font-semibold text-amber-600">{formatCurrency(record.monthlyDebt)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 mb-1">מיוחד</div>
            <div className="text-sm font-semibold text-purple-600">{formatCurrency(record.specialDebt)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{record.monthsInArrears || 0} חודשי פיגור</span>
          </div>
          <ChevronLeft className="w-4 h-4 text-blue-500" />
        </div>
      </CardContent>
    </Card>
  );
}