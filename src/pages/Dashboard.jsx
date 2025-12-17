import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from "@/components/ui/button";
import AppButton from "@/components/ui/app-button";
import { Loader2, Building2, RefreshCw, X, Users, Archive } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isManagerRole } from '@/components/utils/roles';

import KPICards from '../components/dashboard/KPICards';
import DebtorsTable from '../components/dashboard/DebtorsTable';
import ApartmentDetailModal from '../components/dashboard/ApartmentDetailModal';
import ExcelExporter from '../components/export/ExcelExporter';
import PDFExporter from '../components/export/PDFExporter';
import LastImportIndicator from '../components/dashboard/LastImportIndicator';

function DashboardContent() {
  const { currentUser, loading, authChecked } = useAuth();
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilterFromUrl, setStatusFilterFromUrl] = useState(null);
  const [filteredDataset, setFilteredDataset] = useState([]);
  const [activeTab, setActiveTab] = useState('debtors');
  const queryClient = useQueryClient();

  // CRITICAL: Require authentication
  if (authChecked && !currentUser) {
    return <Navigate to={createPageUrl('AppLogin')} replace />;
  }

  // Check URL for filters
  const [filterKeyFromUrl, setFilterKeyFromUrl] = useState(null);
  const [filterDisplayName, setFilterDisplayName] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const filterKeyParam = urlParams.get('filterKey');
    const statusParam = urlParams.get('status');

    if (filterKeyParam) {
      setFilterKeyFromUrl(filterKeyParam);
      // Map filterKey to display name
      const filterNames = {
        'IMMEDIATE_COLLECTION': 'לגבייה מיידית',
        'REQUIRES_LEGAL_ACTION': 'דרוש טיפול משפטי',
        'LEGAL_PROCESS': 'בהליך משפטי',
        'WARNING_LETTER': 'מכתבי התראה'
      };
      setFilterDisplayName(filterNames[filterKeyParam] || filterKeyParam);
    } else if (statusParam) {
      setStatusFilterFromUrl(decodeURIComponent(statusParam));
    }
  }, []);

  const { data: allRecords = [], isLoading: allRecordsLoading } = useQuery({
    queryKey: ['allDebtorRecords'],
    queryFn: () => base44.entities.DebtorRecord.list('-totalDebt'),
  });

  const { data: debtorRecords = [], isLoading: debtorRecordsLoading, refetch: refetchDebtors } = useQuery({
    queryKey: ['debtorRecords', { isArchived: false }],
    queryFn: () => base44.entities.DebtorRecord.filter({ isArchived: false }, '-totalDebt'),
  });

  const { data: archivedRecords = [], isLoading: archivedRecordsLoading, refetch: refetchArchived } = useQuery({
    queryKey: ['archivedRecords', { isArchived: true }],
    queryFn: () => base44.entities.DebtorRecord.filter({ isArchived: true }, '-totalDebt'),
  });

  const { data: settingsList = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.Settings.list(),
  });

  const { data: legalStatuses = [] } = useQuery({
    queryKey: ['legalStatuses'],
    queryFn: () => base44.entities.LegalStatus.list('order'),
  });

  const { data: allStatuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => base44.entities.Status.list(),
  });

  // Extract autoStatus filter from URL
  const [autoStatusFilter, setAutoStatusFilter] = useState(null);
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const autoStatusParam = urlParams.get('autoStatus');
    if (autoStatusParam) {
      setAutoStatusFilter(decodeURIComponent(autoStatusParam));
    }
  }, []);

  const settings = settingsList[0] || { highDebtThreshold: 1000, monthsBeforeLawsuit: 3 };
  const isAdmin = isManagerRole(currentUser);

  console.log('[Dashboard] Auth state:', { 
    user: currentUser?.username,
    role: currentUser?.role,
    isAdmin,
    authChecked 
  });



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

  const handleRecordUpdate = (recordId) => {
    // Invalidate both queries to refresh data immediately
    queryClient.invalidateQueries({ queryKey: ['debtorRecords'] });
    queryClient.invalidateQueries({ queryKey: ['archivedRecords'] });
    queryClient.invalidateQueries({ queryKey: ['allDebtorRecords'] });
  };

  const refetchRecords = () => {
    refetchDebtors();
    refetchArchived();
  };

  const records = activeTab === 'debtors' ? debtorRecords : archivedRecords;
  const recordsLoading = activeTab === 'debtors' ? debtorRecordsLoading : archivedRecordsLoading;

  if (loading || allRecordsLoading || settingsLoading) {
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
        {/* Filter indicators */}
        {filterKeyFromUrl && (
          <Alert className="bg-blue-50 border-blue-200">
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
                className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
              >
                <X className="w-4 h-4 ml-1" />
                נקה פילטר
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {statusFilterFromUrl && !filterKeyFromUrl && (
          <Alert className="bg-blue-50 border-blue-200">
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
                className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
              >
                <X className="w-4 h-4 ml-1" />
                נקה פילטר
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {autoStatusFilter && !filterKeyFromUrl && (
          <Alert className="bg-orange-50 border-orange-200">
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
                className="text-orange-700 hover:text-orange-900 hover:bg-orange-100"
              >
                <X className="w-4 h-4 ml-1" />
                נקה פילטר
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* כותרת */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-3xl font-extrabold bg-gradient-to-l from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  שלום, {currentUser.firstName || currentUser.username}
                </h1>
                {currentUser?.isBase44Admin && (
                  <span className="text-xs bg-gradient-to-l from-purple-600 to-purple-700 text-white px-2 py-1 rounded-lg font-bold">
                    Base44 Super Admin
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-slate-600 font-medium mt-0.5 md:mt-1">
                {settings.buildingName || 'דשבורד חייבים'} • {settings.buildingAddress || ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {!isAdmin && (
              <div className="text-xs md:text-sm bg-gradient-to-l from-blue-50 to-blue-100 text-blue-700 px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl border border-blue-200 font-semibold shadow-sm">
                צפייה בלבד
              </div>
            )}
            <AppButton variant="outline" size="md" icon={RefreshCw} onClick={() => refetchRecords()}>
              רענן נתונים
            </AppButton>
            {isAdmin && (
              <>
                <ExcelExporter records={filteredDataset.length > 0 ? filteredDataset : records} statuses={allStatuses} />
                <PDFExporter records={filteredDataset.length > 0 ? filteredDataset : records} statuses={allStatuses} settings={settings} />
              </>
            )}
            </div>
            </div>

        {/* כרטיסי KPI - מבוסס על כל הרשומות הפעילות */}
        <KPICards records={debtorRecords} settings={settings} allStatuses={allStatuses} />

        {/* אינדיקציית ייבוא אחרון - בין KPI לטבלה */}
        <LastImportIndicator lastImportAt={settings?.last_import_at} isAdmin={isAdmin} />

        {/* טאבים - חייבים / ארכיון */}
        <div className="w-full">
          <div className="grid w-full max-w-md grid-cols-2 h-12 rounded-xl bg-slate-100 p-1 mb-6" dir="rtl">
            <button
              onClick={() => setActiveTab('debtors')}
              className={`rounded-lg text-base font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'debtors' 
                  ? 'bg-white shadow-sm' 
                  : 'hover:bg-slate-200/50'
              }`}
            >
              <Users className="w-4 h-4" />
              חייבים
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                {debtorRecords.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`rounded-lg text-base font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'archived' 
                  ? 'bg-white shadow-sm' 
                  : 'bg-indigo-50 border border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <Archive className="w-4 h-4" />
              ארכיון
              <span className="text-xs bg-slate-600 text-white px-2 py-0.5 rounded-full font-bold">
                {archivedRecords.length}
              </span>
            </button>
          </div>

          {activeTab === 'debtors' && (
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
          )}

          {activeTab === 'archived' && (
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
          )}
        </div>

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

export default function Dashboard() {
  return <DashboardContent />;
}