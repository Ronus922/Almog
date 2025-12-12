import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export default function ProtectedRoute({ children, allowedRoles = [], pageName }) {
  const navigate = useNavigate();
  const { currentUser, loading, isPublicAccessEnabled } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (loading) return;

      // Check if this is Dashboard and public access is enabled
      if (pageName === 'Dashboard') {
        const publicEnabled = await isPublicAccessEnabled();
        if (publicEnabled) {
          setChecking(false);
          return; // Allow access
        }
      }

      // If no user and not public dashboard, redirect to login
      if (!currentUser) {
        navigate(createPageUrl('Login'), { replace: true });
        return;
      }

      // Check role permissions
      if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
        toast.error('אין לך הרשאה לגשת למסך זה');
        navigate(createPageUrl('Dashboard'), { replace: true });
        return;
      }

      setChecking(false);
    };

    checkAccess();
  }, [currentUser, loading, navigate, allowedRoles, pageName, isPublicAccessEnabled]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600 font-medium">טוען...</p>
        </div>
      </div>
    );
  }

  return children;
}