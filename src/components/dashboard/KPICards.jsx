import React from 'react';
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

const KPICard = ({ title, value, icon: Icon, color, colorAccent, subtext, onClick, isClickable, bgColor }) => (
  <div 
    className={`relative min-h-[108px] overflow-hidden rounded-[20px] border border-[rgba(225,231,248,0.96)] bg-[rgba(255,255,255,0.90)] px-[18px] pt-4 pb-[14px] backdrop-blur-[12px] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)] ${isClickable ? 'cursor-pointer transition-all duration-150 hover:-translate-y-[1px] hover:shadow-[0_20px_40px_rgba(95,110,180,0.14)]' : ''}`}
    onClick={onClick}
  >
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.10)_100%)]" />
    
    <div className="relative z-[1]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#a0aacb]">{title}</p>
        <div className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${colorAccent}`}>
          <Icon className={`h-4 w-4`} />
        </div>
      </div>
      
      <div className="mt-2">
        <p className={`text-[35px] font-extrabold leading-none ${color}`} title={value}>{value}</p>
      </div>
      
      {subtext && (
        <div className="mt-3 inline-flex h-7 items-center rounded-full border border-[rgba(226,232,248,0.96)] bg-[#f7f9ff] px-[14px] text-[11px] font-semibold text-[#8f99bd]">
          {subtext}
        </div>
      )}
    </div>
  </div>
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
      color: "text-[#2bc9a8]",
      colorAccent: "bg-[rgba(43,201,168,0.14)] text-[#2bc9a8]",
      isClickable: false
    },
    { 
      title: "דמי ניהול", 
      value: formatCurrency(totalMonthlyDebt), 
      icon: Calendar, 
      color: "text-[#6270ff]",
      colorAccent: "bg-[rgba(98,112,255,0.14)] text-[#6270ff]",
      isClickable: false
    },
    { 
      title: "מים חמים", 
      value: formatCurrency(totalSpecialDebt), 
      icon: AlertTriangle, 
      color: "text-[#f5a623]",
      colorAccent: "bg-[rgba(245,166,35,0.14)] text-[#f5a623]",
      isClickable: false
    },
    { 
      title: "לגבייה מיידית", 
      value: statusCounts['לגבייה מיידית'], 
      icon: Clock, 
      color: "text-[#ff5a9c]",
      colorAccent: "bg-[rgba(255,90,156,0.14)] text-[#ff5a9c]",
      isClickable: true,
      onClick: () => handleCardClick('IMMEDIATE_COLLECTION')
    }
  ];

  return (
    <>
      {kpis.map((kpi, idx) => (
        <KPICard key={idx} {...kpi} />
      ))}
    </>
  );
}