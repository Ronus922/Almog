import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Navigate, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isManagerRole } from '@/components/utils/roles';

import DebtorsTable from '../components/dashboard/DebtorsTable';
import ApartmentDetailModal from '../components/dashboard/ApartmentDetailModal';

const REPORT_TITLES = {
  'IMMEDIATE_COLLECTION': 'לגבייה מיידית',
  'REQUIRES_LEGAL_ACTION': 'חריגה מופרזת',
  'LEGAL_PROCESS': 'בהליך משפטי',
  'WARNING_LETTER': 'מכתבי התראה'
};

export default function DebtorReport() {
  const { currentUser, loading, authChecked } = useAuth();
  const navigate = useNavigate();
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Get reportKey from URL
  const urlParams = new URLSearchParams(window.location.search);
  const reportKey = urlParams.get('reportKey');

  // CRITICAL: Require authentication
  if (authChecked && !currentUser) {
    return <Navigate to={createPageUrl('AppLogin')} replace />;
  }

  const { data: allRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['debtorRecords'],
    queryFn: () => base44.entities.DebtorRecord.list('-totalDebt'),
  });

  const { data: allStatuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => base44.entities.Status.list(),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.Settings.list(),
  });

  const settings = settingsList[0] || {};
  const isAdmin = isManagerRole(currentUser);

  // Filter records based on reportKey
  const filteredRecords = React.useMemo(() => {
    if (!reportKey || !allRecords.length) return allRecords;

    switch (reportKey) {
      case 'IMMEDIATE_COLLECTION':
        return allRecords.filter(r => r.debt_status_auto === 'לגבייה מיידית');
      
      case 'REQUIRES_LEGAL_ACTION':
        return allRecords.filter(r => r.debt_status_auto === 'חריגה מופרזת');
      
      case 'LEGAL_PROCESS': {
        const legalStatus = allStatuses.find(s => s.type === 'LEGAL' && s.name === 'תביעה משפטית');
        return legalStatus 
          ? allRecords.filter(r => r.legal_status_id === legalStatus.id)
          : [];
      }
      
      case 'WARNING_LETTER': {
        const warningStatus = allStatuses.find(s => s.type === 'LEGAL' && s.name === 'מכתב התראה');
        return warningStatus
          ? allRecords.filter(r => r.legal_status_id === warningStatus.id)
          : [];
      }
      
      default:
        return allRecords;
    }
  }, [reportKey, allRecords, allStatuses]);

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

  const handleBackToDashboard = () => {
    navigate(createPageUrl('Dashboard'));
  };

  if (loading || recordsLoading) {
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

  const reportTitle = REPORT_TITLES[reportKey] || 'דוח חייבים';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToDashboard}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowRight className="w-4 h-4 ml-1" />
                חזרה לדשבורד
              </Button>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-l from-slate-800 to-slate-600 bg-clip-text text-transparent">
              דוח: {reportTitle}
            </h1>
            <p className="text-sm text-slate-600 font-medium mt-1">
              {filteredRecords.length} רשומות
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-900">
            <span className="font-bold">מציג:</span> {reportTitle}
          </AlertDescription>
        </Alert>

        {/* Table */}
        <div data-debtors-table>
          <DebtorsTable 
            records={filteredRecords} 
            onRowClick={handleRowClick}
            isAdmin={isAdmin}
            settings={settings}
            allStatuses={allStatuses}
          />
        </div>

        {/* Modal */}
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