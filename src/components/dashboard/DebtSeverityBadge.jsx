import React from 'react';
import { Badge } from "@/components/ui/badge";

export default function DebtStatusBadge({ debtStatusAuto }) {
  const statusConfig = {
    'סך חוב תקין': {
      className: 'bg-green-100 text-green-700 border-green-200',
      borderColor: 'border-r-green-500'
    },
    'חוב משמעותי': {
      className: 'bg-orange-100 text-orange-700 border-orange-200',
      borderColor: 'border-r-orange-500'
    },
    'לטיפול משפטי': {
      className: 'bg-red-100 text-red-700 border-red-200',
      borderColor: 'border-r-red-500'
    }
  };

  const config = statusConfig[debtStatusAuto] || statusConfig['סך חוב תקין'];

  return (
    <Badge className={`${config.className} font-semibold text-sm`}>
      {debtStatusAuto}
    </Badge>
  );
}

export function getDebtStatusColor(debtStatusAuto) {
  const colorMap = {
    'סך חוב תקין': 'green',
    'חוב משמעותי': 'orange',
    'לטיפול משפטי': 'red'
  };
  return colorMap[debtStatusAuto] || 'green';
}

export function getBorderColor(debtStatusAuto) {
  const borderMap = {
    'סך חוב תקין': 'border-r-green-500',
    'חוב משמעותי': 'border-r-orange-500',
    'לטיפול משפטי': 'border-r-red-500'
  };
  return borderMap[debtStatusAuto] || 'border-r-green-500';
}

export function calculateDebtStatus(totalDebt, settings) {
  const thresholdOk = settings?.threshold_ok || 1000;
  const thresholdLegal = settings?.threshold_legal || 5000;
  const debt = totalDebt || 0;

  if (debt <= thresholdOk) return 'סך חוב תקין';
  if (debt < thresholdLegal) return 'חוב משמעותי';
  return 'לטיפול משפטי';
}