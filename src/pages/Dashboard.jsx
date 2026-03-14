import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import KPICards from '@/components/dashboard/KPICards';
import DebtorsTable from '@/components/dashboard/DebtorsTable';
import ApartmentDetailModal from '@/components/dashboard/ApartmentDetailModal';
import { Users, Archive, X, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import LastImportIndicator from '@/components/dashboard/LastImportIndicator';

function DashboardContent() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('debtors');
  const [filterKeyFromUrl, setFilterKeyFromUrl] = useState(null);
  const [filterDisplayName, setFilterDisplayName] = useState('');
  const [statusFilterFromUrl, setStatusFilterFromUrl] = useState(null);
  const [autoStatusFilter, setAutoStatusFilter] = useState(null);
  const [filteredDataset, setFilteredDataset] = useState([]);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.isBase44Admin;

  // Fetch records
  const { data: records = [] } = useQuery({
    queryKey: ['debtorRecords'],
    queryFn: () => base44.entities.DebtorRecord.list(),
  });

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const settingsList = await base44.entities.Settings.list();
      return settingsList[0] || {};
    },
  });

  // Fetch statuses
  const { data: allStatuses = [] } = useQuery({
    queryKey: ['allStatuses'],
    queryFn: () => base44.entities.Status.list(),
  });

  // Parse URL filters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reportKey = params.get('reportKey');
    const statusFilter = params.get('statusFilter');
    const autoStatusFilter = params.get('autoStatusFilter');

    if (reportKey) {
      setFilterKeyFromUrl(reportKey);
      // Set display name based on report key
      const displayNames = {
        'IMMEDIATE_COLLECTION': 'לגבייה מיידית',
        'REQUIRES_LEGAL_ACTION': 'חריגה מופרזת',
        'LEGAL_PROCESS': 'בהליך משפטי',
        'WARNING_LETTER': 'מכתבי התראה'
      };
      setFilterDisplayName(displayNames[reportKey] || reportKey);
    }

    if (statusFilter) {
      setStatusFilterFromUrl(statusFilter);
    }

    if (autoStatusFilter) {
      setAutoStatusFilter(autoStatusFilter);
    }
  }, []);

  // Separate archived and debtor records
  const debtorRecords = useMemo(() => {
    return records.filter(r => !r.isArchived);
  }, [records]);

  const archivedRecords = useMemo(() => {
    return records.filter(r => r.isArchived);
  }, [records]);

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleSaveRecord = async (updatedRecord) => {
    try {
      await base44.entities.DebtorRecord.update(updatedRecord.id, updatedRecord);
      queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
      setIsModalOpen(false);
      setSelectedRecord(null);
    } catch (error) {
      console.error('Error saving record:', error);
    }
  };

  const handleRecordUpdate = (recordId) => {
    queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
  };

  const handleRefresh = async () => {
    await queryClient.refetchQueries({ queryKey: ['debtorRecords'] });
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6" dir="rtl">
        <div className="max-w-full mx-auto">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">דשבורד חייבים</h1>
              <p className="text-slate-600 mt-2">ניהול וניטור חייבים הישראליים</p>
            </div>

            {/* KPI Cards */}
            <KPICards records={debtorRecords} settings={settings} allStatuses={allStatuses} />
          </div>

          {/* Filter indicators */}
          {filterKeyFromUrl &&
          <Alert className="rounded-[18px] border border-white/70 bg-white/85 backdrop-blur-[6px] shadow-[0_10px_26px_rgba(15,23,42,0.06)] px-5 md:px-6 py-4 mb-6">
              <AlertDescription className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-900">מציג:</span>
                  <span className="text-blue-700">{filterDisplayName}</span>
                </div>
                <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterKeyFromUrl(null);
                  setFilterDisplayName('');
                  window.history.pushState({}, '', window.location.pathname);
                }}
                className="text-blue-700 hover:text-blue-900 hover:bg-blue-100">

                  <X className="w-4 h-4 ml-1" />
                  נקה פילטר
                </Button>
              </AlertDescription>
            </Alert>
          }

          {statusFilterFromUrl && !filterKeyFromUrl &&
          <Alert className="rounded-[18px] border border-white/70 bg-white/85 backdrop-blur-[6px] shadow-[0_10px_26px_rgba(15,23,42,0.06)] px-5 md:px-6 py-4 mb-6">
              <AlertDescription className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-900">מסונן לפי סטטוס משפטי:</span>
                  <span className="text-blue-700">{statusFilterFromUrl}</span>
                </div>
                <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilterFromUrl(null);
                  window.history.pushState({}, '', window.location.pathname);
                }}
                className="text-blue-700 hover:text-blue-900 hover:bg-blue-100">

                  <X className="w-4 h-4 ml-1" />
                  נקה פילטר
                </Button>
              </AlertDescription>
            </Alert>
          }

          {autoStatusFilter && !filterKeyFromUrl &&
          <Alert className="rounded-[18px] border border-white/70 bg-white/85 backdrop-blur-[6px] shadow-[0_10px_26px_rgba(15,23,42,0.06)] px-5 md:px-6 py-4 mb-6">
              <AlertDescription className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-orange-900">מסונן לפי סטטוס אוטומטי:</span>
                  <span className="text-orange-700">{autoStatusFilter}</span>
                </div>
                <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAutoStatusFilter(null);
                  window.history.pushState({}, '', window.location.pathname);
                }}
                className="text-orange-700 hover:text-orange-900 hover:bg-orange-100">

                  <X className="w-4 h-4 ml-1" />
                  נקה פילטר
                </Button>
              </AlertDescription>
            </Alert>
          }

          {/* Last Import Indicator */}
          <LastImportIndicator lastImportAt={settings?.last_import_at} isAdmin={isAdmin} />

          {/* Tabs - Debtors / Archive (admin only) */}
          {isAdmin &&
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('debtors')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'debtors'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              חייבים ({debtorRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'archived'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Archive className="w-4 h-4" />
              ארכיון ({archivedRecords.length})
            </button>
          </div>
          }

          {/* Debtors Table */}
          {(activeTab === 'debtors' || !isAdmin) &&
          <DebtorsTable
            records={debtorRecords}
            onRowClick={handleRowClick}
            isAdmin={isAdmin}
            settings={settings}
            initialFilterKey={filterKeyFromUrl}
            initialStatusFilter={statusFilterFromUrl}
            initialAutoStatusFilter={autoStatusFilter}
            allStatuses={allStatuses}
            onFilteredDataChange={setFilteredDataset}
            onRecordUpdate={handleRecordUpdate}
            showArchived={false}
          />
          }

          {/* Archived Table */}
          {isAdmin && activeTab === 'archived' &&
          <DebtorsTable
            records={archivedRecords}
            onRowClick={handleRowClick}
            isAdmin={isAdmin}
            settings={settings}
            initialFilterKey={null}
            initialStatusFilter={null}
            initialAutoStatusFilter={null}
            allStatuses={allStatuses}
            onFilteredDataChange={setFilteredDataset}
            onRecordUpdate={handleRecordUpdate}
            showArchived={true}
          />
          }

        {/* Detail Modal */}
        <ApartmentDetailModal
          record={selectedRecord}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveRecord}
          isAdmin={isAdmin}
          settings={settings}
        />
        </div>
      </TooltipProvider>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}