import React from 'react';
import { Card } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Wallet, 
  Calendar, 
  AlertTriangle, 
  Home, 
  Clock,
  ShieldAlert,
  Gavel,
  Mail
} from "lucide-react";

const KPICard = ({ title, value, icon: Icon, color, subtext, onClick, isClickable, bgColor }) => (
  <Card 
    className={`p-5 md:p-7 bg-white/80 backdrop-blur border-0 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl group ${isClickable ? 'cursor-pointer hover:scale-105 hover:-translate-y-1' : 'hover:scale-102'}`}
    style={{ height: '280px' }}
    onClick={onClick}
  >
    <div className="flex flex-col justify-center h-full gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <p className="text-base md:text-lg text-slate-800 font-extrabold tracking-tight">{title}</p>
        <div className={`flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md`} style={bgColor ? { backgroundColor: bgColor } : {}} className={bgColor ? 'flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md' : `flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('-600', '-100').replace('-700', '-100')} group-hover:scale-110 transition-transform shadow-md`}>
          <Icon className={`w-7 h-7 md:w-8 md:h-8 ${color}`} />
        </div>
      </div>
      <div>
        <p className={`text-2xl md:text-3xl font-black ${bgColor ? 'text-[#ff8080]' : color} leading-tight mb-1`} title={value}>{value}</p>
        {subtext && <p className="text-xs md:text-sm text-slate-500 mt-2 font-semibold">{subtext}</p>}
      </div>
    </div>
  </Card>
);

export default function KPICards({ records, settings, allStatuses = [] }) {
  const navigate = useNavigate();
  
  const totalDebt = records.reduce((sum, r) => sum + (r.totalDebt || 0), 0);
  const totalMonthlyDebt = records.reduce((sum, r) => sum + (r.monthlyDebt || 0), 0);
  const totalSpecialDebt = records.reduce((sum, r) => sum + (r.specialDebt || 0), 0);
  const debtorCount = records.filter(r => (r.totalDebt || 0) > 0).length;
  
  const statusCounts = {
    'תקין': records.filter(r => r.debt_status_auto === 'תקין').length,
    'לגבייה מיידית': records.filter(r => r.debt_status_auto === 'לגבייה מיידית').length,
    'חריגה מופרזת': records.filter(r => r.debt_status_auto === 'חריגה מופרזת').length,
  };

  // Status-based filters
  const legalLawsuitStatus = allStatuses.find(s => s.type === 'LEGAL' && s.name === 'תביעה משפטית');
  const legalWarningStatus = allStatuses.find(s => s.type === 'LEGAL' && s.name === 'מכתב התראה');
  
  const inLegalProcessCount = legalLawsuitStatus 
    ? records.filter(r => r.legal_status_id === legalLawsuitStatus.id).length 
    : 0;
  
  const warningLettersSentCount = legalWarningStatus 
    ? records.filter(r => r.legal_status_id === legalWarningStatus.id).length 
    : 0;

  const formatCurrency = (num) => 
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num);

  const handleCardClick = (reportKey) => {
    if (reportKey) {
      navigate(`${createPageUrl('DebtorReport')}?reportKey=${reportKey}`);
    }
  };

  const kpis = [
    { 
      title: "סה״כ חובות", 
      value: formatCurrency(totalDebt), 
      icon: Wallet, 
      color: "text-rose-600",
      isClickable: false
    },
    { 
      title: "חוב דמי ניהול", 
      value: formatCurrency(totalMonthlyDebt), 
      icon: Calendar, 
      color: "text-amber-600",
      isClickable: false
    },
    { 
      title: "חוב מים חמים", 
      value: formatCurrency(totalSpecialDebt), 
      icon: AlertTriangle, 
      color: "text-purple-600",
      isClickable: false
    },
    { 
      title: "דירות חייבות", 
      value: debtorCount, 
      icon: Home, 
      color: "text-blue-600",
      subtext: `מתוך ${records.length} דירות`,
      isClickable: false
    },
    { 
      title: "לגבייה מיידית", 
      value: statusCounts['לגבייה מיידית'], 
      icon: Clock, 
      color: "text-orange-600",
      isClickable: true,
      onClick: () => handleCardClick('IMMEDIATE_COLLECTION')
    },
    { 
      title: "חריגה מופרזת", 
      value: statusCounts['חריגה מופרזת'], 
      icon: ShieldAlert, 
      color: "text-white",
      bgColor: "#ff8080",
      isClickable: true,
      onClick: () => handleCardClick('REQUIRES_LEGAL_ACTION')
    },
    ...(legalLawsuitStatus ? [{
      title: "בהליך משפטי",
      value: inLegalProcessCount,
      icon: Gavel,
      color: "text-red-600",
      isClickable: true,
      onClick: () => handleCardClick('LEGAL_PROCESS')
    }] : []),
    ...(legalWarningStatus ? [{
      title: "מכתבי התראה",
      value: warningLettersSentCount,
      icon: Mail,
      color: "text-yellow-600",
      isClickable: true,
      onClick: () => handleCardClick('WARNING_LETTER')
    }] : [])
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
      {kpis.map((kpi, idx) => (
        <KPICard key={idx} {...kpi} />
      ))}
    </div>
  );
}