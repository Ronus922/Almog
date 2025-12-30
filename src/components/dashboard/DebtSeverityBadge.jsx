import React from 'react';
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export default function DebtSeverityBadge({ status, debt, settings }) {
  // If status prop is provided, use it directly
  if (status) {
    const statusColors = {
      'תקין': 'bg-green-100 text-green-700 border-green-200',
      'לגבייה מיידית': 'bg-orange-100 text-orange-700 border-orange-200',
      'חריגה מופרזת': 'bg-red-100 text-red-700 border-red-200',
      'בארכיון': 'bg-slate-200 text-slate-700 border-slate-300'
    };
    
    return (
      <Badge className={`${statusColors[status] || 'bg-slate-100 text-slate-700'} font-semibold text-xs`}>
        {status}
      </Badge>
    );
  }

  // Legacy: calculate from debt amount
  const lowThreshold = settings?.low_threshold || 1500;
  const midThreshold = settings?.mid_threshold || 5000;
  const labelLow = settings?.label_low || '';
  const labelMid = settings?.label_mid || 'חוב משמעותי';
  const labelHigh = settings?.label_high || 'לטיפול משפטי';

  const amount = debt || 0;

  if (amount < lowThreshold) {
    if (!labelLow) return null;
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 font-semibold text-xs">
        {labelLow}
      </Badge>
    );
  } else if (amount < midThreshold) {
    return (
      <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-semibold text-xs">
        {labelMid}
      </Badge>
    );
  } else {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 font-semibold text-xs flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        {labelHigh}
      </Badge>
    );
  }
}

export function getDebtSeverityColor(debt, settings) {
  const lowThreshold = settings?.low_threshold || 1500;
  const midThreshold = settings?.mid_threshold || 5000;
  const amount = debt || 0;

  if (amount < lowThreshold) return 'green';
  if (amount < midThreshold) return 'orange';
  return 'red';
}