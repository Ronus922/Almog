import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowRight } from "lucide-react";

import ExcelImporter from '../components/import/ExcelImporter';

export default function Import() {
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

        const currentUser = await base44.auth.me();
        clearTimeout(timeoutId);
        setUser(currentUser);
        setIsLoading(false);
      } catch (err) {
        console.error('[Import] Load user error:', err);
        setError(err.message || 'שגיאה בטעינת נתוני משתמש');
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleImportComplete = () => {
    window.location.href = createPageUrl('Dashboard');
  };

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

  // בדיקת הרשאות - רק מנהל (גם base44 admin וגם app admin)
  const isAdmin = user?.role === 'admin' || user?.isBase44Admin;
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir="rtl">
        <div className="max-w-md text-center">
          <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">אין הרשאה</h2>
          <p className="text-slate-600 mb-6">
            ייבוא קבצים מותר למנהלים בלבד
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
    </div>
  );
}