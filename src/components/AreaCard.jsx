import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Sparkles, AlertCircle, CheckCircle2, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  clean:         { label: 'נקי',          color: 'bg-green-100 text-green-800',  icon: CheckCircle2,  bg: 'from-green-50 to-emerald-100 border-green-200' },
  dirty:         { label: 'מלוכלך',       color: 'bg-red-100 text-red-800',     icon: AlertCircle,   bg: 'from-red-50 to-rose-100 border-red-200' },
  needs_refresh: { label: 'צריך ריענון',  color: 'bg-amber-100 text-amber-800', icon: Sparkles,      bg: 'from-amber-50 to-yellow-100 border-amber-200' },
};

export default function AreaCard({ area, onClick }) {
  const cfg = STATUS_CONFIG[area.cleanliness_status] || STATUS_CONFIG.dirty;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -3 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`cursor-pointer border-2 shadow-md hover:shadow-lg transition-all bg-gradient-to-br ${cfg.bg}`}
        onClick={() => onClick?.(area)}
        dir="rtl"
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <Icon className="w-6 h-6 mt-0.5 flex-shrink-0 text-slate-600" />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 truncate">{area.name}</h3>
              {area.description && (
                <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{area.description}</p>
              )}
            </div>
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
          </div>

          <div className="flex items-center justify-between">
            <Badge className={`${cfg.color} text-xs font-semibold px-2.5 py-0.5`}>{cfg.label}</Badge>
            {area.last_cleaned_at && (
              <p className="text-xs text-slate-400">
                {format(new Date(area.last_cleaned_at), 'dd/MM/yyyy HH:mm')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}