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
  <Card className="p-4 md:p-6 bg-white/80 backdrop-blur border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full rounded-2xl group hover:scale-105">
    <div className="flex items-center gap-3 md:gap-5">
      <div className={`flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('-600', '-100').replace('-700', '-100')} group-hover:scale-110 transition-transform`}>
        <Icon className={`w-6 h-6 md:w-8 md:h-8 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-600 font-bold uppercase tracking-wide line-clamp-2 mb-1 md:mb-2">{title}</p>
        <p className={`text-xl md:text-3xl font-extrabold ${color} leading-tight`} title={value}>{value}</p>
        {subtext && <p className="text-xs text-slate-500 mt-1 md:mt-2 line-clamp-1 font-medium">{subtext}</p>}
      </div>
    </div>
  </Card>
);

export default function KPICards({ records, settings }) {
  const totalDebt = records.reduce((sum, r) => sum + (r.totalDebt || 0), 0);
  const totalMonthlyDebt = records.reduce((sum, r) => sum + (r.monthlyDebt || 0), 0);
  const totalSpecialDebt = records.reduce((sum, r) => sum + (r.specialDebt || 0), 0);
  const debtorCount = records.filter(r => (r.totalDebt || 0) > 0).length;
  
  const statusCounts = {
    'תקין': records.filter(r => r.debt_status_auto === 'תקין').length,
    'לגבייה': records.filter(r => r.debt_status_auto === 'לגבייה').length,
    'מכתב התראה': records.filter(r => r.debt_status_auto === 'מכתב התראה').length,
    'לטיפול משפטי': records.filter(r => r.debt_status_auto === 'לטיפול משפטי').length,
  };

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
      title: "לגבייה", 
      value: statusCounts['לגבייה'], 
      icon: Scale, 
      color: "text-orange-600"
    },
    { 
      title: "מכתב התראה", 
      value: statusCounts['מכתב התראה'], 
      icon: FileWarning, 
      color: "text-yellow-700" 
    },
    { 
      title: "לטיפול משפטי", 
      value: statusCounts['לטיפול משפטי'], 
      icon: Gavel, 
      color: "text-red-700" 
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {kpis.map((kpi, idx) => (
        <KPICard key={idx} {...kpi} />
      ))}
    </div>
  );
}