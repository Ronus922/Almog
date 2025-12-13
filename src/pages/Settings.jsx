import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { isManagerRole, getUserRoleDisplay } from '@/components/utils/roles';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowRight, Settings as SettingsIcon, Loader2 } from "lucide-react";

import SettingsPanel from '../components/settings/SettingsPanel';
import AuthDebugPanel from '../components/debug/AuthDebugPanel';

export default function Settings() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Not logged in
  if (!currentUser) {
    return <Navigate to={createPageUrl('AppLogin')} replace />;
  }

  // Check permissions
  const isAdmin = isManagerRole(currentUser);
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir="rtl">
        <div className="max-w-md text-center">
          <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">אין הרשאה</h2>
          <p className="text-slate-600 mb-6">
            גישה להגדרות מותרת למנהלים בלבד<br />
            תפקיד נוכחי: {getUserRoleDisplay(currentUser)}
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

      {/* Debug Panel */}
      <AuthDebugPanel currentUser={currentUser} />
    </div>
  );
}