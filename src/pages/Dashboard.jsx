import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Loader2, Building2, RefreshCw } from "lucide-react";

import KPICards from '../components/dashboard/KPICards';
import DebtCharts from '../components/dashboard/DebtCharts';
import DebtorsTable from '../components/dashboard/DebtorsTable';
import ApartmentDetailModal from '../components/dashboard/ApartmentDetailModal';

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          <p className="text-sm text-slate-500 mt-2">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* כותרת */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <Building2 className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{settings.buildingName || 'דשבורד חייבים'}</h1>
              <p className="text-sm text-slate-500">{settings.buildingAddress || ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isAdmin && (
              <div className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200">
                מצב צפייה בלבד
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => refetchRecords()}>
              <RefreshCw className="w-4 h-4 ml-2" />
              רענן
            </Button>
          </div>
        </div>

        {/* כרטיסי KPI */}
        <KPICards records={records} settings={settings} />

        {/* גרפים */}
        <DebtCharts records={records} />

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