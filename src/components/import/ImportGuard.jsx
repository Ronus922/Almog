import React, { useEffect, useState } from 'react';
import { useImport } from './ImportContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AppButton from "@/components/ui/app-button";
import { AlertTriangle } from "lucide-react";

export default function ImportGuard({ children }) {
  const { importInProgress } = useImport();

  // Block browser back/refresh/close
  useEffect(() => {
    if (!importInProgress) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    console.log('[ImportGuard] beforeunload handler activated');

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      console.log('[ImportGuard] beforeunload handler removed');
    };
  }, [importInProgress]);

  return <>{children}</>;
}

// Hook for navigation blocking
export function useNavigationBlock() {
  const { importInProgress, cancelImport } = useImport();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const attemptNavigation = (navigateFn) => {
    if (!importInProgress) {
      navigateFn();
      return true;
    }

    setPendingNavigation(() => navigateFn);
    setShowConfirmDialog(true);
    return false;
  };

  const handleStay = () => {
    setShowConfirmDialog(false);
    setPendingNavigation(null);
  };

  const handleLeave = () => {
    cancelImport();
    setShowConfirmDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
    }
    setPendingNavigation(null);
  };

  const ConfirmDialog = () => (
    <Dialog open={showConfirmDialog} onOpenChange={handleStay}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            תהליך ייבוא פעיל
          </DialogTitle>
          <DialogDescription className="text-right text-base mt-4">
            הקובץ עדיין נטען או מעובד. מעבר למסך אחר יבטל את התהליך ויאבד את כל הנתונים שהועלו.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-3 flex-row-reverse justify-start mt-4">
          <AppButton 
            variant="primary" 
            onClick={handleStay}
          >
            הישאר בדף
          </AppButton>
          <AppButton 
            variant="danger" 
            onClick={handleLeave}
          >
            עזוב ובטל ייבוא
          </AppButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return {
    attemptNavigation,
    importInProgress,
    ConfirmDialog
  };
}