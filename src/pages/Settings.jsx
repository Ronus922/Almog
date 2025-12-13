import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { isManagerRole, getUserRoleDisplay } from '@/components/utils/roles';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowRight, Settings as SettingsIcon } from "lucide-react";

import SettingsPanel from '../components/settings/SettingsPanel';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const timeoutId = setTimeout(() => {
          setError('הטעינה לוקחת יותר מדי זמן - אנא רענן את הדף');
          setIsLoading(false);
        }, 10000);

        const currentUser = await base44.auth.me().catch((e) => {
          console.error('[Settings] Auth error:', e);
          return null;
        });
        
        clearTimeout(timeoutId);
        setUser(currentUser);
        setIsLoading(false);
      } catch (err) {
        console.error('[Settings] Load user error:', err);
        setError('שגיאה בטעינת נתוני משתמש - נסה להתחבר מחדש');
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse">טוען...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir="rtl">
        <div className="max-w-md text-center">
          <ShieldAlert className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">שגיאה בטעינה</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()}>
              נסה שוב
            </Button>
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline">
                <ArrowRight className="w-4 h-4 ml-2" />
                חזרה לדשבורד
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // בדיקת הרשאות - רק מנהלים (ADMIN/SUPER_ADMIN)
  const isAdmin = isManagerRole(user);
  
  console.log('[Settings] Access check:', { 
    user: user?.username || user?.email, 
    role: user?.role, 
    isBase44Admin: user?.isBase44Admin,
    isAdmin,
    displayRole: getUserRoleDisplay(user)
  });
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir="rtl">
        <div className="max-w-md text-center">
          <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">אין הרשאה</h2>
          <p className="text-slate-600 mb-6">
            גישה להגדרות מותרת למנהלים בלבד<br />
            תפקיד נוכחי: {getUserRoleDisplay(user)}
          </p>
          <Link to={createPageUrl('Dashboard')}>
            <Button>
              <ArrowRight className="w-4 h-4 ml-2" />
              חזרה לדשבורד
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-white rounded-xl shadow-sm">
            <SettingsIcon className="w-6 h-6 text-slate-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">הגדרות מערכת</h1>
            <p className="text-sm text-slate-500">ניהול הגדרות והעדפות</p>
          </div>
        </div>

        <SettingsPanel />
      </div>
    </div>
  );
}