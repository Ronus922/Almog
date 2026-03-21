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
        className="fixed left-1/2 top-1/2 z-50 w-[min(96vw,870px)] h-[92vh] max-h-[940px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[24px] border-0 bg-[#f0f4f8] shadow-[0_40px_100px_rgba(15,23,42,0.30)] flex flex-col p-0 gap-0"
        style={{ maxWidth: '800px' }}
          aria-describedby="modal-description"
          onPointerDownOutside={(e) => {
            if (dangerous) {
              e.preventDefault();
            }
          }}>

          <VisuallyHidden>
            <DialogTitle>{title}</DialogTitle>
            <div id="modal-description">{subtitle}</div>
          </VisuallyHidden>

          {/* Header */}
          <div className="relative shrink-0 overflow-hidden bg-[#1a3a6b] px-6 pt-5 pb-5 text-white" dir="rtl">
            {/* Decorative blobs */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.07)_0%,transparent_55%)]" />
            <div className="absolute bottom-0 right-0 w-48 h-24 bg-white/5 rounded-full blur-3xl" />

            {/* Close button — left side (LTR-position = left) */}
            <button
              onClick={() => onClose()}
              type="button"
              className="absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/20 bg-white/10 text-white transition hover:bg-white/25 z-20 cursor-pointer">
              <X className="h-4 w-4" />
            </button>

            {/* Status pill — top left near close */}
            {statusPill && statusPill.text !== 'לא הוגדר' && (
              <div className="absolute left-16 top-4 z-20">
                <span className="inline-flex items-center h-8 rounded-full bg-[#c94040] px-4 text-[12px] font-bold text-white shadow-sm">
                  {statusPill.text.replace('סטטוס משפטי: ', '')}
                </span>
              </div>
            )}

            {/* Title block — RTL right side */}
            <div className="relative z-10 pr-1 pl-28 text-right">
              <h2 className="text-[28px] sm:text-[32px] leading-none font-black tracking-[-0.02em] text-white">{title}</h2>
              {subtitle && (
                <p className="mt-1.5 text-[13px] font-medium text-white/70">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 bg-[#f0f4f8]" style={{ WebkitOverflowScrolling: 'touch' }}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="shrink-0 border-t border-slate-200/80 bg-white px-4 sm:px-6 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2" dir="rtl">
                {footer}
              </div>
            </div>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>);

}