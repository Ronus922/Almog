import React from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { isManagerRole, getUserRoleDisplay } from '@/components/utils/roles';
import { useAuth } from '@/components/auth/AuthContext';
import { useNavigationBlock } from '@/components/import/ImportGuard';
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowRight, Loader2 } from "lucide-react";

import ExcelImporter from '../components/import/ExcelImporter';
import AuthDebugPanel from '../components/debug/AuthDebugPanel';

export default function Import() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const { attemptNavigation } = useNavigationBlock();

  const handleImportComplete = () => {
    attemptNavigation(() => {
      navigate(createPageUrl('Dashboard'));
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to={createPageUrl('AppLogin')} replace />;
  }

  const isAdmin = isManagerRole(currentUser);
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir="rtl">
        <div className="max-w-md text-center">
          <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">אין הרשאה</h2>
          <p className="text-slate-600 mb-6">
            ייבוא קבצים מותר למנהלים בלבד<br />
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
      <ExcelImporter onImportComplete={handleImportComplete} />
      
      {/* Debug Panel */}
      <AuthDebugPanel currentUser={currentUser} />
    </div>
  );
}