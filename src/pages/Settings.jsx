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
    <div className="page-root" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
              <SettingsIcon className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h1 className="page-title">הגדרות מערכת</h1>
              <p className="page-subtitle">ניהול הגדרות והעדפות</p>
            </div>
          </div>
        </div>

        <SettingsPanel />
      </div>

      {/* Debug Panel */}
      <AuthDebugPanel currentUser={currentUser} />
    </div>
  );
}