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
    className={`rounded-[22px] border border-white/70 bg-white/85 backdrop-blur-[6px] shadow-[0_12px_30px_rgba(15,23,42,0.08)] px-5 md:px-6 py-4 md:py-5 min-h-[110px] transition-all duration-200 group ${isClickable ? 'cursor-pointer hover:-translate-y-[2px]' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between gap-4 h-full">
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-slate-500 mb-2">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className={`text-[28px] md:text-[30px] font-[700] leading-none ${bgColor ? 'text-[#ff8080]' : color}`} title={value}>{value}</p>
          {subtext && <p className="text-[12px] text-slate-500 font-medium whitespace-nowrap">{subtext}</p>}
        </div>
      </div>
      <div className={`h-11 w-11 rounded-[14px] flex items-center justify-center flex-shrink-0 ${bgColor ? 'bg-red-100' : `${color.replace('text-', 'bg-').replace('-600', '-100').replace('-700', '-100')}`}`}>
           <Icon className={`w-6 h-6 ${color}`} />
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
  const legalTreatmentStatus = allStatuses.find(s => s.type === 'LEGAL' && s.name === 'לטיפול משפטי');
  const legalProceedingsStatus = allStatuses.find(s => s.type === 'LEGAL' && s.name === 'בהליך משפטי');
  
  const inLegalProcessCount = legalLawsuitStatus 
    ? records.filter(r => r.legal_status_id === legalLawsuitStatus.id).length 
    : 0;
  
  const warningLettersSentCount = legalWarningStatus 
    ? records.filter(r => r.legal_status_id === legalWarningStatus.id).length 
    : 0;
  
  const inLegalTreatmentCount = legalTreatmentStatus 
    ? records.filter(r => r.legal_status_id === legalTreatmentStatus.id).length 
    : 0;
  
  const inLegalProceedingsCount = legalProceedingsStatus 
    ? records.filter(r => r.legal_status_id === legalProceedingsStatus.id).length 
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
      title: "דמי ניהול", 
      value: formatCurrency(totalMonthlyDebt), 
      icon: Calendar, 
      color: "text-amber-600",
      isClickable: false
    },
    { 
      title: "מים חמים", 
      value: formatCurrency(totalSpecialDebt), 
      icon: AlertTriangle, 
      color: "text-purple-600",
      isClickable: false
    },
    // { 
    //   title: "דירות חייבות", 
    //   value: debtorCount, 
    //   icon: Home, 
    //   color: "text-blue-600",
    //   subtext: "מתוך 298 דירות",
    //   isClickable: false
    // },
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
    }] : []),
    ...(legalTreatmentStatus ? [{
      title: "לטיפול משפטי",
      value: inLegalTreatmentCount,
      icon: Gavel,
      color: "text-indigo-600",
      isClickable: true,
      onClick: () => navigate(`${createPageUrl('LinkedRecords')}?statusId=${legalTreatmentStatus.id}&statusName=${encodeURIComponent('לטיפול משפטי')}`)
    }] : []),
    ...(legalProceedingsStatus ? [{
      title: "בהליך משפטי",
      value: inLegalProceedingsCount,
      icon: Gavel,
      color: "text-teal-600",
      isClickable: true,
      onClick: () => navigate(`${createPageUrl('LinkedRecords')}?statusId=${legalProceedingsStatus.id}&statusName=${encodeURIComponent('בהליך משפטי')}`)
    }] : [])
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
      {kpis.map((kpi, idx) => (
        <KPICard key={idx} {...kpi} />
      ))}
    </div>
  );
}