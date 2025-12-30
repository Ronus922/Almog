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
import { getActiveDebtors, getArchivedDebtors } from '@/components/utils/debtorFilters';
import { getPhonePrimaryForTable } from '@/components/utils/phoneDisplay';

function DashboardContent() {
  const { currentUser, loading, authChecked } = useAuth();
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());
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
    queryKey: ['allDebtorRecords', refreshKey],
    queryFn: async () => {
      const records = await base44.entities.DebtorRecord.list('-totalDebt');
      // Debug log
      if (records.length > 0) {
        const sample = records[0];
        console.log('[Dashboard] Sample record:', {
          apartmentNumber: sample.apartmentNumber,
          phonePrimary: sample.phonePrimary,
          phoneOwner: sample.phoneOwner,
          phonePrimaryForTable: getPhonePrimaryForTable(sample)
        });
      }
      return records;
    },
    staleTime: 0,
    cacheTime: 0
  });

  // Apply unique filtering: one record per apartmentNumber (most recent by updated_date)
  // Active debtors: isArchived=false AND totalDebt>0
  const debtorRecords = getActiveDebtors(allRecords);
  const debtorRecordsLoading = allRecordsLoading;

  // Archived debtors: isArchived=true (unique per apartmentNumber)
  const archivedRecords = getArchivedDebtors(allRecords);
  const archivedRecordsLoading = allRecordsLoading;

  const refetchDebtors = () => queryClient.invalidateQueries({ queryKey: ['allDebtorRecords'] });
  const refetchArchived = () => queryClient.invalidateQueries({ queryKey: ['allDebtorRecords'] });

  const { data: settingsList = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.Settings.list()
  });

  const { data: legalStatuses = [] } = useQuery({
    queryKey: ['legalStatuses'],
    queryFn: () => base44.entities.LegalStatus.list('order')
  });

  const { data: allStatuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => base44.entities.Status.list()
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
      // Trigger real refresh after save
      setRefreshKey(Date.now());
      setIsModalOpen(false);
    }
  });

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleSaveRecord = async (editedRecord) => {
    await updateMutation.mutateAsync({ id: editedRecord.id, data: editedRecord });
  };

  const handleRecordUpdate = (recordId) => {
    // Trigger real refresh
    setRefreshKey(Date.now());
  };

  const handleRefresh = () => {
    setRefreshKey(Date.now());
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
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100" dir="rtl">
      <style>{`
        .tabs-shell {
          display: flex;
          gap: 10px;
          padding: 8px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          width: fit-content;
          max-width: 100%;
          border-bottom: none !important;
        }

        .tab-pill {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-width: 160px;
          height: 44px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid transparent;
          background: #ffffff;
          cursor: pointer;
          user-select: none;
          transition: transform .12s ease, box-shadow .12s ease, background .12s ease, border-color .12s ease;
          text-decoration: none !important;
          font-family: inherit;
          border-bottom: none !important;
        }

        .tab-pill:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0,0,0,.08);
          border-color: #e5e7eb;
        }

        .tab-pill:active {
          transform: translateY(0px);
          box-shadow: 0 2px 8px rgba(0,0,0,.06);
        }

        .tab-label {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          letter-spacing: 0;
        }

        .tab-badge {
          min-width: 32px;
          height: 26px;
          padding: 0 10px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          background: #e5e7eb;
          color: #111827;
        }

        .tab-pill.is-active {
          background: #eef2ff;
          border-color: #c7d2fe;
          box-shadow: 0 10px 26px rgba(37,99,235,.18);
        }

        .tab-pill.is-active::after {
          content: none !important;
        }

        .tab-pill.is-active .tab-label {
          font-weight: 700;
        }

        .tab-pill.is-active .tab-badge {
          background: #2563eb;
          color: #ffffff;
        }

        .tab-archive:not(.is-active) {
          background: #f8fafc;
          border-color: #e5e7eb;
        }

        .tabs-shell.mode-archive .tab-pill:not(.tab-archive) {
          background: #e5e7eb;
          border-color: #cbd5e1;
        }

        @media (max-width: 480px) {
          .tabs-shell { width: 100%; }
          .tab-pill { flex: 1; min-width: 0; }
        }
      `}</style>
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
        {/* Filter indicators */}
        {filterKeyFromUrl &&
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
              className="text-blue-700 hover:text-blue-900 hover:bg-blue-100">

                <X className="w-4 h-4 ml-1" />
                נקה פילטר
              </Button>
            </AlertDescription>
          </Alert>
        }

        {statusFilterFromUrl && !filterKeyFromUrl &&
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
              className="text-blue-700 hover:text-blue-900 hover:bg-blue-100">

                <X className="w-4 h-4 ml-1" />
                נקה פילטר
              </Button>
            </AlertDescription>
          </Alert>
        }

        {autoStatusFilter && !filterKeyFromUrl &&
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
              className="text-orange-700 hover:text-orange-900 hover:bg-orange-100">

                <X className="w-4 h-4 ml-1" />
                נקה פילטר
              </Button>
            </AlertDescription>
          </Alert>
        }

        {/* כותרת */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-3xl font-extrabold bg-gradient-to-l from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  שלום, {currentUser.firstName || currentUser.username}
                </h1>
                {currentUser?.isBase44Admin &&
                <span className="text-xs bg-gradient-to-l from-purple-600 to-purple-700 text-white px-2 py-1 rounded-lg font-bold">
                    Base44 Super Admin
                  </span>
                }
              </div>
              <p className="text-xs md:text-sm text-slate-600 font-medium mt-0.5 md:mt-1">
                {settings.buildingName || 'דשבורד חייבים'} • {settings.buildingAddress || ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {!isAdmin &&
            <div className="text-xs md:text-sm bg-gradient-to-l from-blue-50 to-blue-100 text-blue-700 px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl border border-blue-200 font-semibold shadow-sm">
                צפייה בלבד
              </div>
            }
            <AppButton variant="outline" size="md" icon={RefreshCw} onClick={handleRefresh} className="hover:text-slate-900">
              רענן נתונים
            </AppButton>
            {isAdmin &&
            <>
                <ExcelExporter records={filteredDataset.length > 0 ? filteredDataset : records} statuses={allStatuses} />
                <PDFExporter records={filteredDataset.length > 0 ? filteredDataset : records} statuses={allStatuses} settings={settings} />
              </>
            }
            </div>
            </div>

        {/* כרטיסי KPI - מבוסס על כל הרשומות כולל ארכיון */}
        <KPICards records={allRecords} settings={settings} allStatuses={allStatuses} />

        {/* אינדיקציית ייבוא אחרון - בין KPI לטבלה */}
        <LastImportIndicator lastImportAt={settings?.last_import_at} isAdmin={isAdmin} />

        {/* טאבים - חייבים / ארכיון (רק למנהלים) */}
        <div className="w-full">
          {isAdmin &&
          <div className={`tabs-shell ${activeTab === 'archived' ? 'mode-archive' : ''}`} dir="rtl">
              <button
              onClick={() => setActiveTab('debtors')}
              className={`tab-pill ${activeTab === 'debtors' ? 'is-active' : ''}`}>

                <span className="tab-label">
                  <Users className="w-4 h-4 inline ml-1" />
                  חייבים
                </span>
                <span className="tab-badge">{debtorRecords.length}</span>
              </button>
              <button
              onClick={() => setActiveTab('archived')}
              className={`tab-pill tab-archive ${activeTab === 'archived' ? 'is-active' : ''}`}>

                <span className="tab-label">
                  <Archive className="w-4 h-4 inline ml-1" />
                  ארכיון
                </span>
                <span className="tab-badge">{archivedRecords.length}</span>
              </button>
            </div>
          }

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
            showArchived={false} />

          }

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
            showArchived={true} />

          }
        </div>

        {/* מודל פרטי דירה */}
        <ApartmentDetailModal
          record={selectedRecord}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveRecord}
          isAdmin={isAdmin}
          settings={settings} />

      </div>
    </div>);

}

export default function Dashboard() {
  return <DashboardContent />;
}