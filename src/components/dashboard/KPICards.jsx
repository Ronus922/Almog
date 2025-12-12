import React from 'react';
import { Card } from "@/components/ui/card";
import { 
  Wallet, 
  Calendar, 
  AlertTriangle, 
  Home, 
  Scale, 
  Gavel,
  FileWarning
} from "lucide-react";

const KPICard = ({ title, value, icon: Icon, color, subtext }) => (
  <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full rounded-2xl group hover:scale-105">
    <div className="flex items-center gap-5">
      <div className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('-600', '-100').replace('-700', '-100')} group-hover:scale-110 transition-transform`}>
        <Icon className={`w-8 h-8 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-600 font-bold uppercase tracking-wide line-clamp-2 mb-2">{title}</p>
        <p className={`text-3xl font-extrabold ${color} leading-tight`} title={value}>{value}</p>
        {subtext && <p className="text-xs text-slate-500 mt-2 line-clamp-1 font-medium">{subtext}</p>}
      </div>
    </div>
  </Card>
);

export default function KPICards({ records, settings }) {
  const totalDebt = records.reduce((sum, r) => sum + (r.totalDebt || 0), 0);
  const totalMonthlyDebt = records.reduce((sum, r) => sum + (r.monthlyDebt || 0), 0);
  const totalSpecialDebt = records.reduce((sum, r) => sum + (r.specialDebt || 0), 0);
  const debtorCount = records.filter(r => (r.totalDebt || 0) > 0).length;
  const significantDebtors = records.filter(r => (r.totalDebt || 0) >= (settings?.highDebtThreshold || 1000)).length;
  const inLawsuit = records.filter(r => r.status === 'בתביעה').length;
  const lawsuitCandidates = records.filter(r => r.status === 'מועמד לתביעה').length;

  const formatCurrency = (num) => 
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num);

  const kpis = [
    { 
      title: "סה״כ חובות פתוחים", 
      value: formatCurrency(totalDebt), 
      icon: Wallet, 
      color: "text-rose-600" 
    },
    { 
      title: "חוב חודשי", 
      value: formatCurrency(totalMonthlyDebt), 
      icon: Calendar, 
      color: "text-amber-600" 
    },
    { 
      title: "חוב מיוחד", 
      value: formatCurrency(totalSpecialDebt), 
      icon: AlertTriangle, 
      color: "text-purple-600" 
    },
    { 
      title: "דירות חייבות", 
      value: debtorCount, 
      icon: Home, 
      color: "text-blue-600",
      subtext: `מתוך ${records.length} דירות`
    },
    { 
      title: "חייבים משמעותיים", 
      value: significantDebtors, 
      icon: Scale, 
      color: "text-orange-600",
      subtext: `מעל ${formatCurrency(settings?.highDebtThreshold || 1000)}`
    },
    { 
      title: "בתביעה", 
      value: inLawsuit, 
      icon: Gavel, 
      color: "text-red-700" 
    },
    { 
      title: "מועמדים לתביעה", 
      value: lawsuitCandidates, 
      icon: FileWarning, 
      color: "text-slate-700" 
    }
  ];

  // חלוקה לשתי שורות
  const midPoint = Math.ceil(kpis.length / 2);
  const row1 = kpis.slice(0, midPoint);
  const row2 = kpis.slice(midPoint);

  return (
    <div className="space-y-4">
      {/* שורה ראשונה */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {row1.map((kpi, idx) => (
          <KPICard key={idx} {...kpi} />
        ))}
      </div>
      
      {/* שורה שנייה */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {row2.map((kpi, idx) => (
          <KPICard key={idx} {...kpi} />
        ))}
      </div>
    </div>
  );
}