import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

export default function ProtectedAction({ 
  isAdmin, 
  children, 
  showMessage = false,
  message = "פעולה זו מיועדת למנהלי מערכת בלבד"
}) {
  if (!isAdmin) {
    if (showMessage) {
      return (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <Lock className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {message}
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  return <>{children}</>;
}