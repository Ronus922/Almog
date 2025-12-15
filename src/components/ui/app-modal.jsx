import React from 'react';
import { Dialog, DialogContent, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppModal({
  open,
  onClose,
  title,
  subtitle,
  statusPill,
  children,
  footer,
  dangerous = false,
  maxWidth = "630px",
  className,
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="bg-black/60 backdrop-blur-sm" />
        <DialogContent
          className="p-0 gap-0 overflow-hidden max-h-[90vh] border-0 rounded-lg shadow-2xl"
          style={{ width: `min(${maxWidth}, calc(100vw - 24px))` }}
          onPointerDownOutside={(e) => {
            if (dangerous) {
              e.preventDefault();
            }
          }}
        >
          <div className="flex flex-col h-full max-h-[90vh] bg-white rounded-lg overflow-hidden">
            {/* Header - Sticky */}
            <div className="sticky top-0 z-30 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-slate-700/95 to-slate-800/92 text-white border-b border-white/10">
              <div className="flex-1 text-right">
                <div className="flex items-center gap-3 justify-end">
                  <h2 className="text-lg font-bold leading-tight text-white">{title}</h2>
                  {dangerous && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-red-500/20 text-red-200 border border-red-400/30 rounded-md">
                      פעולה בלתי הפיכה
                    </span>
                  )}
                </div>
                {subtitle && (
                  <p className="text-sm mt-1" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{subtitle}</p>
                )}
              </div>

              <div className="flex items-center gap-2 mr-4">
                {statusPill && (
                  <span className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg border",
                    statusPill.color
                  )}>
                    {statusPill.text}
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-lg border border-white/20 bg-white/12 hover:bg-white/18 text-white flex items-center justify-center transition-all duration-120 hover:opacity-95 hover:-translate-y-px active:translate-y-0 active:opacity-85"
                  aria-label="סגור"
                >
                  <X className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>

            {/* Body - Scrollable */}
            <div className={cn(
              "flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 p-5",
              className
            )}>
              {children}
            </div>

            {/* Footer - Sticky (Optional) */}
            {footer && (
              <div className="sticky bottom-0 z-20 px-5 py-3 bg-white/96 backdrop-blur-sm border-t border-slate-200 flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}