import React from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { hasPermission, isFullAdmin } from './PermissionUtils';
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { toast } from 'sonner';

/**
 * קומפוננטת עטיפה לפעולות מוגנות
 * מציגה את הפעולה רק אם למשתמש יש הרשאה
 */
export default function ProtectedAction({ 
  resourceType, 
  action, 
  children, 
  fallback = null,
  onUnauthorized = null 
}) {
  const { currentUser, userPermissions } = useAuth();

  const authorized = hasPermission(currentUser, userPermissions, resourceType, action);

  if (!authorized) {
    if (onUnauthorized) {
      return React.cloneElement(children, {
        onClick: () => {
          onUnauthorized();
          toast.error('אין לך הרשאה לבצע פעולה זו');
        },
        disabled: true,
        className: `${children.props.className || ''} opacity-50 cursor-not-allowed`
      });
    }
    return fallback;
  }

  return children;
}

/**
 * Hook לבדיקת הרשאה
 */
export function usePermission(resourceType, action) {
  const { currentUser, userPermissions } = useAuth();
  return hasPermission(currentUser, userPermissions, resourceType, action);
}

/**
 * Hook לבדיקת admin מלא
 */
export function useIsFullAdmin() {
  const { currentUser } = useAuth();
  return isFullAdmin(currentUser);
}