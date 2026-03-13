import React from 'react';
import { useAlert } from './AlertContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const iconMap = {
  success: <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
};

const colorMap = {
  success: 'bg-green-50 border-green-300 text-green-900',
  error: 'bg-red-50 border-red-300 text-red-900',
  warning: 'bg-orange-50 border-orange-300 text-orange-900',
  info: 'bg-blue-50 border-blue-300 text-blue-900',
};

export default function GlobalAlert() {
  const { alert, dismissAlert, confirm, dismissConfirm, handleConfirm } = useAlert();

  return (
    <>
      {/* Toast-style alert */}
      {alert && (
        <div
          dir="rtl"
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-[9999] min-w-72 max-w-lg border rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg transition-all duration-300 ${colorMap[alert.type] || colorMap.info}`}
        >
          {iconMap[alert.type] || iconMap.info}
          <span className="flex-1 text-sm font-medium">{alert.message}</span>
          <button onClick={dismissAlert} className="opacity-50 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200">
            <div className="flex items-start gap-3 mb-5">
              <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-slate-800 font-medium leading-relaxed">{confirm.message}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={dismissConfirm}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                אישור
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}