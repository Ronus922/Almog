import React from 'react';
import { Dialog, DialogContent, DialogPortal, DialogOverlay, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { X } from 'lucide-react';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

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
  showDefaultClose = false,
  onHeaderClose
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[2px]" />
        <DialogContent
          className="fixed left-1/2 top-1/2 z-50 w-[min(96vw,820px)] h-[92vh] max-h-[920px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[22px] border border-slate-200 bg-[#eef3f8] shadow-[0_30px_80px_rgba(15,23,42,0.24)] flex flex-col p-0 gap-0 [&>button]:hidden"
          style={{ maxWidth: '622px' }}
          onPointerDownOutside={(e) => {
            if (dangerous) {
              e.preventDefault();
            }
          }}>

          <VisuallyHidden>
            <DialogTitle>{title}</DialogTitle>
          </VisuallyHidden>

          {/* Header */}
          <div className="relative shrink-0 overflow-hidden bg-[linear-gradient(180deg,#23477a_0%,#274b80_45%,#2c5088_100%)] px-6 pt-5 pb-4 text-white">
            {/* Decorative overlay layers */}
            <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_top_right,white_0,transparent_42%)]" />
            <div className="absolute -bottom-8 -left-10 h-28 w-[55%] rounded-[999px] bg-white/10 blur-2xl" />
            <div className="absolute -top-10 right-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

            {/* Close button */}
            <button
              onClick={onHeaderClose || onClose}
              className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/20 bg-white/10 text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20 z-10"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">סגור</span>
            </button>

            {/* Header content */}
            <div className="relative z-10 flex items-start justify-end gap-4" dir="rtl">
              <div className="flex-1 text-right">
                <h2 className="text-[34px] leading-none font-black tracking-[-0.02em] text-white">{title}</h2>
                {subtitle && (
                  <p className="mt-2 text-[13px] font-medium text-white/75">{subtitle}</p>
                )}
              </div>
            </div>

            {/* Status pill row */}
            {statusPill && (
              <div className="relative z-10 mt-4 flex items-center justify-end gap-3" dir="rtl">
                <span className="inline-flex h-9 items-center rounded-full bg-[#ff6b63] px-5 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(255,107,99,0.35)]">
                  {statusPill.text.replace('סטטוס משפטי: ', '')}
                </span>
                <span className="text-[13px] font-semibold text-white/80">סטטוס משפטי:</span>
              </div>
            )}
          </div>

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto px-5 py-5 bg-[#eef3f8]">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="shrink-0 border-t border-slate-200 bg-[#f8fbff] px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {footer}
              </div>
            </div>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}