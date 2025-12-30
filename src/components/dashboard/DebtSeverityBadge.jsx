import React from 'react';
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export default function DebtSeverityBadge({ debt, settings }) {
  const lowThreshold = settings?.low_threshold || 1500;
  const midThreshold = settings?.mid_threshold || 5000;
  const labelLow = settings?.label_low || '';
  const labelMid = settings?.label_mid || 'חוב משמעותי';
  const labelHigh = settings?.label_high || 'לטיפול משפטי';

  const amount = debt || 0;

  if (amount < lowThreshold) {
    // Green - low debt
    if (!labelLow) return null; // No badge if label is empty
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 font-semibold text-xs">
        {labelLow}
      </Badge>
    );
  } else if (amount < midThreshold) {
    // Orange - medium debt
    return (
      <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-semibold text-xs">
        {labelMid}
      </Badge>
    );
  } else {
    // Red - high debt
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