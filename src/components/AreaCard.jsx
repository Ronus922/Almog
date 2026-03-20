import React from 'react';
import { MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AreaCard({ area, onClick }) {
  const color = area.color || '#3b82f6';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -3 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className="cursor-pointer rounded-2xl shadow-md hover:shadow-lg transition-all border-2 overflow-hidden"
        style={{ borderColor: color + '55' }}
        onClick={() => onClick?.(area)}
        dir="rtl"
      >
        {/* Color bar */}
        <div className="h-2 w-full" style={{ backgroundColor: color }} />
        <div className="p-5 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
              <MapPin className="w-5 h-5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">{area.name}</h3>
              {area.description && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">{area.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}