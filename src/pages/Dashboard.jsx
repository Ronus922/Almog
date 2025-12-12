import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Loader2, Building2, RefreshCw } from "lucide-react";

import KPICards from '../components/dashboard/KPICards';
import DebtorsTable from '../components/dashboard/DebtorsTable';
import ApartmentDetailModal from '../components/dashboard/ApartmentDetailModal';
import CopyLoginLink from '../components/CopyLoginLink';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: records = [], isLoading: recordsLoading, refetch: refetchRecords } = useQuery({
    queryKey: ['debtorRecords'],
    queryFn: () => base44.entities.DebtorRecord.list('-totalDebt'),
  });

  const { data: settingsList = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.Settings.list(),
  });

  const settings = settingsList[0] || { highDebtThreshold: 1000, monthsBeforeLawsuit: 3 };
  const isAdmin = user?.role === 'admin';

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DebtorRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      setIsModalOpen(false);
    },
  });

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleSaveRecord = async (editedRecord) => {
    await updateMutation.mutateAsync({ id: editedRecord.id, data: editedRecord });
  };

  if (recordsLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
          <p className="text-lg font-semibold text-slate-700">טוען נתונים...</p>
          <p className="text-sm text-slate-500 mt-1">אנא המתן</p>
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
            <div className="p-3 md:p-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl md:rounded-2xl shadow-xl">
              <Building2 className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-extrabold bg-gradient-to-l from-slate-800 to-slate-600 bg-clip-text text-transparent">
                {settings.buildingName || 'דשבורד חייבים'}
              </h1>
              <p className="text-xs md:text-sm text-slate-600 font-medium mt-0.5 md:mt-1">{settings.buildingAddress || ''}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {isAdmin && <CopyLoginLink />}
            {!isAdmin && (
              <div className="text-xs md:text-sm bg-gradient-to-l from-blue-50 to-blue-100 text-blue-700 px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl border border-blue-200 font-semibold shadow-sm">
                צפייה בלבד
              </div>
            )}
            <Button variant="outline" size="sm" className="rounded-lg md:rounded-xl h-9 md:h-10 px-3 md:px-4 font-semibold text-xs md:text-sm" onClick={() => refetchRecords()}>
              <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1 md:ml-2" />
              <span className="hidden sm:inline">רענן נתונים</span>
              <span className="sm:hidden">רענן</span>
            </Button>
          </div>
        </div>

        {/* כרטיסי KPI */}
        <KPICards records={records} settings={settings} />

        {/* טבלת חייבים */}
        <DebtorsTable 
          records={records} 
          onRowClick={handleRowClick}
          isAdmin={isAdmin}
        />

        {/* מודל פרטי דירה */}
        <ApartmentDetailModal
          record={selectedRecord}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveRecord}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}