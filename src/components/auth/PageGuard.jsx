import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from './AuthContext';
import { ShieldOff } from 'lucide-react';

/**
 * PageGuard - הגנה ברמת דף/route.
 * עוטף כל דף ומונע גישה למשתמשים שאין להם הרשאה.
 * 
 * @param {string} pageName - מפתח הדף (חייב להיות זהה ל-PAGE_KEYS)
 * @param {React.ReactNode} children - תוכן הדף
 */
export default function PageGuard({ pageName, children }) {
  const { currentUser, loading, authChecked } = useAuth();
  const navigate = useNavigate();

  // טרם נבדקה אימות - לא מציגים כלום
  if (loading || !authChecked) return null;

  // לא מחובר
  if (!currentUser) {
    navigate(createPageUrl('AppLogin'), { replace: true });
    return null;
  }

  // SUPER_ADMIN ו-Base44Admin - גישה מלאה
  if (currentUser.isBase44Admin || currentUser.role === 'SUPER_ADMIN') {
    return <>{children}</>;
  }

  // accessiblePages === null = גישה מלאה (תפקיד is_admin)
  if (currentUser.accessiblePages === null) {
    return <>{children}</>;
  }

  // בדיקת הרשאה ספציפית
  const hasAccess = (currentUser.accessiblePages || []).includes(pageName);

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
        <div className="text-center max-w-sm mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldOff className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">אין הרשאת גישה</h2>
          <p className="text-slate-500 text-sm mb-6">
            אין לך הרשאה לצפות בדף זה. פנה למנהל המערכת.
          </p>
          <button
            onClick={() => navigate(createPageUrl('Dashboard'), { replace: true })}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            חזרה לדשבורד
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}