import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Home } from "lucide-react";
import { createPageUrl } from '@/utils';

import KPICards from '../components/dashboard/KPICards';
import DebtorsTable from '../components/dashboard/DebtorsTable';
import ApartmentDetailModal from '../components/dashboard/ApartmentDetailModal';

function ShareDashboardContent() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isValidToken, setIsValidToken] = useState(null);

  const { data: settingsList = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['debtorRecords'],
    queryFn: () => base44.entities.DebtorRecord.list('-totalDebt'),
    enabled: isValidToken === true,
  });

  const { data: settings = [], isLoading: systemSettingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.Settings.list(),
    enabled: isValidToken === true,
  });

  const systemSettings = settings[0] || { highDebtThreshold: 1000, monthsBeforeLawsuit: 3 };

  useEffect(() => {
    if (!settingsLoading && settingsList.length > 0) {
      const appSettings = settingsList[0];
      
      if (
        appSettings.dashboard_public_enabled && 
        appSettings.dashboard_share_token === token
      ) {
        setIsValidToken(true);
      } else {
        setIsValidToken(false);
      }
    } else if (!settingsLoading) {
      setIsValidToken(false);
    }
  }, [settingsList, settingsLoading, token]);

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  if (settingsLoading || isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
          <p className="text-lg font-semibold text-slate-700">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-3">אין גישה לקישור</h1>
          <p className="text-slate-600 mb-6">
            הקישור אינו תקף או בוטל על ידי מנהל המערכת.
          </p>
          <Button 
            onClick={() => navigate(createPageUrl('AppLogin'))}
            className="rounded-xl"
          >
            <Home className="w-4 h-4 ml-2" />
            חזור למסך התחברות
          </Button>
        </div>
      </div>
    );
  }

  if (recordsLoading || systemSettingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
          <p className="text-lg font-semibold text-slate-700">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
        {/* כותרת */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-3xl font-extrabold bg-gradient-to-l from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  דשבורד חייבים
                </h1>
              </div>
              <p className="text-xs md:text-sm text-slate-600 font-medium mt-0.5 md:mt-1">
                {systemSettings.buildingName || 'דשבורד חייבים'} • {systemSettings.buildingAddress || ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="text-xs md:text-sm bg-gradient-to-l from-slate-50 to-slate-100 text-slate-700 px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl border border-slate-200 font-semibold shadow-sm">
              מצב צפייה בלבד
            </div>
          </div>
        </div>

        {/* כרטיסי KPI */}
        <KPICards records={records} settings={systemSettings} />

        {/* טבלת חייבים */}
        <DebtorsTable 
          records={records} 
          onRowClick={handleRowClick}
          isAdmin={false}
        />

        {/* מודל פרטי דירה */}
        <ApartmentDetailModal
          record={selectedRecord}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={() => {}}
          isAdmin={false}
        />
      </div>
    </div>
  );
}

export default function ShareDashboard() {
  return <ShareDashboardContent />;
}