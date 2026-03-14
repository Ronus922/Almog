import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from "@/components/ui/button";
import AppButton from "@/components/ui/app-button";
import { Loader2, Building2, RefreshCw, X, Users, Archive, Download, Printer, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isManagerRole } from '@/components/utils/roles';
import { toast } from 'sonner';

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

  const { data: allRecords = [], isLoading: allRecordsLoading, refetch: refetchAllRecords } = useQuery({
    queryKey: ['allDebtorRecords', refreshKey],
    queryFn: async () => {
      const records = await base44.entities.DebtorRecord.list('-totalDebt');
      return records;
    },
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Auto-refresh after import - check once on mount only
  useEffect(() => {
    const checkForNewImport = async () => {
      const lastImport = localStorage.getItem('lastImportTimestamp');
      if (lastImport) {
        const timestamp = parseInt(lastImport);
        if (Date.now() - timestamp < 10000) { // Only within 10 seconds
          console.log('[Dashboard] 🔄 IMPORT DETECTED - REFRESHING NOW');
          
          queryClient.clear();
          await refetchAllRecords();
          await queryClient.invalidateQueries({ queryKey: ['settings'] });
          setRefreshKey(Date.now());
          
          toast.success('✅ הנתונים עודכנו מהייבוא');
        }
        
        // Always remove after checking
        localStorage.removeItem('lastImportTimestamp');
        localStorage.removeItem('lastImportStatus');
      }
    };
    
    // Check only once on mount
    checkForNewImport();
  }, [queryClient, refetchAllRecords]);

  // Apply unique filtering: one record per apartmentNumber (most recent by updated_date)
  // Active debtors: NOT archived AND totalDebt>0
  const debtorRecords = useMemo(() => getActiveDebtors(allRecords), [allRecords]);
  const debtorRecordsLoading = allRecordsLoading;

  // Archived debtors: isArchived=true (unique per apartmentNumber)
  const archivedRecords = useMemo(() => getArchivedDebtors(allRecords), [allRecords]);
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
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f5f7ff_0%,#edf2ff_100%)] px-[18px] pt-[22px] pb-10" dir="rtl">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .debtors-table-container, .debtors-table-container * {
            visibility: visible;
          }
          .debtors-table-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button, .filter-controls, .tabs-shell {
            display: none !important;
          }
        }

        .tabs-shell {
          display: flex;
          gap: 6px;
          padding: 6px;
          background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          width: fit-content;
          max-width: 100%;
          border-bottom: none !important;
          box-shadow: 0 4px 20px rgba(0,0,0,.05), inset 0 1px 2px rgba(255,255,255,.9);
        }

        .tab-pill {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-width: 170px;
          height: 50px;
          padding: 0 18px;
          border-radius: 16px;
          border: 1px solid transparent;
          background: #ffffff;
          cursor: pointer;
          user-select: none;
          transition: all .2s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none !important;
          font-family: inherit;
          border-bottom: none !important;
          box-shadow: 0 2px 8px rgba(0,0,0,.04);
        }

        .tab-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,.1);
          border-color: #cbd5e1;
        }

        .tab-pill:active {
          transform: translateY(0px);
          box-shadow: 0 2px 8px rgba(0,0,0,.06);
        }

        .tab-label {
          font-size: 15px;
          font-weight: 600;
          color: #334155;
          letter-spacing: -0.01em;
        }

        .tab-badge {
          min-width: 36px;
          height: 28px;
          padding: 0 12px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          background: #f1f5f9;
          color: #334155;
          box-shadow: inset 0 1px 2px rgba(0,0,0,.06);
        }

        .tab-pill.is-active {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-color: #2563eb;
          box-shadow: 0 12px 32px rgba(37,99,235,.25);
        }

        .tab-pill.is-active::after {
          content: none !important;
        }

        .tab-pill.is-active .tab-label {
          font-weight: 700;
          color: #ffffff;
        }

        .tab-pill.is-active .tab-badge {
          background: rgba(255,255,255,.25);
          color: #ffffff;
          box-shadow: inset 0 1px 2px rgba(0,0,0,.1);
        }

        .tab-archive:not(.is-active) {
          background: #fefce8;
          border-color: #fde047;
        }

        .tabs-shell.mode-archive .tab-pill:not(.tab-archive) {
          background: #f1f5f9;
          border-color: #cbd5e1;
          opacity: 0.7;
        }

        @media (max-width: 480px) {
          .tabs-shell { width: 100%; }
          .tab-pill { flex: 1; min-width: 0; }
        }
      `}</style>

      {/* Main Shell */}
      <div className="relative mx-auto w-full max-w-[1365px] overflow-hidden rounded-[24px] border border-[rgba(184,198,245,0.60)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(245,248,255,0.98)_100%)] shadow-[0_24px_70px_rgba(109,132,220,0.14),0_8px_24px_rgba(160,180,255,0.10),inset_0_1px_0_rgba(255,255,255,0.95)]">
        
        {/* Glow Layer */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(circle at 10% 16%, rgba(109,223,255,0.22) 0%, rgba(109,223,255,0) 30%),
              radial-gradient(circle at 86% 14%, rgba(196,165,255,0.18) 0%, rgba(196,165,255,0) 32%),
              radial-gradient(circle at 50% -10%, rgba(255,255,255,0.80) 0%, rgba(255,255,255,0) 45%)
            `
          }}
        />

        {/* Header */}
        <div className="relative z-[2] flex h-[68px] items-center justify-between border-b border-[rgba(225,230,247,0.92)] bg-[rgba(255,255,255,0.70)] px-7 backdrop-blur-[12px]">
          {/* Left - Nav (Hidden on mobile) */}
          <div className="hidden items-center gap-[22px] md:flex">
            <a href="#" className="text-[11px] font-semibold text-[#8e98bb] transition-colors hover:text-[#5d6dff]">דירוג</a>
            <a href="#" className="text-[11px] font-semibold text-[#8e98bb] transition-colors hover:text-[#5d6dff]">דשבורד</a>
            <a href="#" className="text-[11px] font-semibold text-[#8e98bb] transition-colors hover:text-[#5d6dff]">חשבונות</a>
            <a href="#" className="text-[11px] font-semibold text-[#8e98bb] transition-colors hover:text-[#5d6dff]">עזרה וחקר</a>
          </div>

          {/* Right - User */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-[14px] font-bold text-[#2f3969]">{currentUser.firstName || currentUser.username}</p>
                <p className="mt-[2px] text-[11px] font-medium text-[#9aa5c9]">בעל הדירוג</p>
              </div>
              <div className="h-[34px] w-[34px] rounded-full border-2 border-white/95 shadow-[0_6px_18px_rgba(95,110,180,0.16)] bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {(currentUser.firstName || currentUser.username).charAt(0)}
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative z-[3] min-h-[148px] overflow-hidden bg-[linear-gradient(135deg,rgba(187,234,255,0.40)_0%,rgba(217,230,255,0.33)_42%,rgba(239,230,255,0.28)_100%)] px-[34px] pt-5 pb-[26px]">
          {/* Blob 1 */}
          <div 
            className="absolute top-0 left-1/4 w-[280px] h-[280px] rounded-full blur-[80px] opacity-40 pointer-events-none"
            style={{ background: 'rgba(200, 230, 255, 0.5)', transform: 'translate(-50%, -30%)' }}
          />
          {/* Blob 2 */}
          <div 
            className="absolute -bottom-12 right-1/3 w-[200px] h-[200px] rounded-full blur-[60px] opacity-30 pointer-events-none"
            style={{ background: 'rgba(220, 200, 255, 0.4)' }}
          />

          <h1 className="relative text-[44px] font-bold leading-[1.05] text-[#2f3969]">
            {currentUser.firstName || currentUser.username}
          </h1>
          <p className="relative mt-[6px] text-[13px] font-medium text-[#96a1c6]">
            {settings.buildingName || 'בניין אלמוג'} • {settings.buildingAddress || ''}
          </p>
        </div>

        {/* KPI Row */}
        <div className="relative z-[4] -mt-[16px] px-[26px] pb-[26px]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'בעלי חוב', value: '₪ 734', color: '#2bc9a8', icon: '🔒' },
              { label: 'דמי ניהול חודשיים', value: '₪ 162,445', color: '#6270ff', icon: '📋' },
              { label: 'סכום מיוחד חודשי', value: '₪ 12,773', color: '#f5a623', icon: '⚠️' },
              { label: 'חשמל כולל חודשי', value: '₪ 91,772', color: '#ff5a9c', icon: '📱' }
            ].map((kpi, idx) => (
              <div
                key={idx}
                className="relative min-h-[108px] overflow-hidden rounded-[20px] border border-[rgba(225,231,248,0.96)] bg-[rgba(255,255,255,0.90)] px-[18px] pt-4 pb-[14px] backdrop-blur-[12px] shadow-[0_12px_30px_rgba(126,145,220,0.12),inset_0_1px_0_rgba(255,255,255,0.96)]"
              >
                {/* Overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.10) 100%)'
                  }}
                />

                {/* Content */}
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#a0aacb]">{kpi.label}</p>
                      <p className="mt-2 text-[35px] font-extrabold leading-none" style={{ color: kpi.color }}>
                        {kpi.value}
                      </p>
                    </div>
                    <span className="text-2xl">{kpi.icon}</span>
                  </div>
                  <div className="mt-3">
                    <span className="inline-flex h-7 items-center rounded-full border border-[rgba(226,232,248,0.96)] bg-[#f7f9ff] px-[14px] text-[11px] font-semibold text-[#8f99bd]">
                      ראה פרטים →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Wrapper Below Shell */}
      <div className="relative mx-auto w-full max-w-[1365px] mt-8 space-y-6 px-[18px]">

        {/* Filter indicators */}
        {filterKeyFromUrl &&
        <Alert className="rounded-[18px] border border-white/70 bg-white/85 backdrop-blur-[6px] shadow-[0_10px_26px_rgba(15,23,42,0.06)] px-5 md:px-6 py-4">
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
        <Alert className="rounded-[18px] border border-white/70 bg-white/85 backdrop-blur-[6px] shadow-[0_10px_26px_rgba(15,23,42,0.06)] px-5 md:px-6 py-4">
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
        <Alert className="rounded-[18px] border border-white/70 bg-white/85 backdrop-blur-[6px] shadow-[0_10px_26px_rgba(15,23,42,0.06)] px-5 md:px-6 py-4">
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

        {/* Tools Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div />
          <div className="flex flex-wrap items-center gap-2">
            {!isAdmin &&
            <div className="text-sm rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-slate-600 font-medium shadow-sm">
              צפייה בלבד
            </div>
            }
            {isAdmin &&
            <>
              <ExcelExporter records={filteredDataset.length > 0 ? filteredDataset : records} statuses={allStatuses} />
              <PDFExporter records={filteredDataset.length > 0 ? filteredDataset : records} statuses={allStatuses} settings={settings} />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.print()}
                className="gap-2 h-10 rounded-[12px] px-4 border border-slate-200 hover:bg-slate-50"
              >
                <Printer className="w-4 h-4" />
                הדפס
              </Button>
            </>
            }
            <AppButton variant="outline" size="md" icon={RefreshCw} onClick={handleRefresh} className="hover:text-slate-900">
              רענן נתונים
            </AppButton>
          </div>
        </div>

        {/* אינדיקציית ייבוא אחרון - בין KPI לטבלה */}
        <LastImportIndicator lastImportAt={settings?.last_import_at} isAdmin={isAdmin} />

        {/* טאבים - חייבים / ארכיון (רק למנהלים) */}
        {isAdmin &&
        <div className={`tabs-shell ${activeTab === 'archived' ? 'mode-archive' : ''}`} dir="rtl">
          <button
            onClick={() => setActiveTab('debtors')}
            className={`tab-pill ${activeTab === 'debtors' ? 'is-active' : ''}`}
          >
            <span className="tab-label">
              <Users className="w-4 h-4 inline ml-1" />
              חייבים
            </span>
            <span className="tab-badge">{debtorRecords.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`tab-pill tab-archive ${activeTab === 'archived' ? 'is-active' : ''}`}
          >
            <span className="tab-label">
              <Archive className="w-4 h-4 inline ml-1" />
              ארכיון
            </span>
            <span className="tab-badge">{archivedRecords.length}</span>
          </button>
        </div>
        }

        {/* טבלה במיכל פרימיום */}
         {/* Table Module Card */}
         <div className="mx-[26px] mt-[18px] mb-7 overflow-hidden rounded-[22px] border border-[rgba(227,232,247,0.98)] bg-[rgba(255,255,255,0.91)] shadow-[0_18px_42px_rgba(122,140,210,0.10),inset_0_1px_0_rgba(255,255,255,0.98)]">
            
            {/* Toolbar */}
            <div className="flex min-h-[58px] flex-wrap items-center justify-between gap-3 border-b border-[rgba(231,236,248,0.96)] bg-[linear-gradient(180deg,rgba(252,253,255,0.98)_0%,rgba(246,248,255,0.98)_100%)] px-[18px] py-2">
              {/* Title Section */}
              <div>
                <p className="text-[12px] font-bold text-[#5f698d]">טבלת חייבים</p>
                <p className="text-[11px] font-medium text-[#9aa5c9]">סה״כ {filteredDataset.length > 0 ? filteredDataset.length : records.length} רשומות</p>
              </div>

              {/* Actions Section */}
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    {/* PDF Download */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          aria-label="הורד PDF"
                          onClick={() => {
                            const pdfExporter = document.querySelector('[data-pdf-export]');
                            if (pdfExporter) pdfExporter.click();
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[rgba(224,230,246,0.96)] bg-white text-[#8f99be] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all hover:border-[#d7def8] hover:bg-[#f8faff] hover:text-[#5f6fff]"
                        >
                          <FileText className="w-5 h-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent><p>הורד PDF</p></TooltipContent>
                    </Tooltip>

                    {/* Excel Download */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          aria-label="הורד אקסל"
                          onClick={() => {
                            const excelExporter = document.querySelector('[data-excel-export]');
                            if (excelExporter) excelExporter.click();
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[rgba(224,230,246,0.96)] bg-white text-[#8f99be] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all hover:border-[#d7def8] hover:bg-[#f8faff] hover:text-[#5f6fff]"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent><p>הורד אקסל</p></TooltipContent>
                    </Tooltip>

                    {/* Print */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          aria-label="הדפס"
                          onClick={() => window.print()}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[rgba(224,230,246,0.96)] bg-white text-[#8f99be] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all hover:border-[#d7def8] hover:bg-[#f8faff] hover:text-[#5f6fff]"
                        >
                          <Printer className="w-5 h-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent><p>הדפס</p></TooltipContent>
                    </Tooltip>
                  </>
                )}

                {/* Refresh */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      aria-label="רענן"
                      onClick={handleRefresh}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[rgba(224,230,246,0.96)] bg-white text-[#8f99be] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all hover:border-[#d7def8] hover:bg-[#f8faff] hover:text-[#5f6fff]"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent><p>רענן</p></TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Hidden Export Components */}
            <div className="hidden">
              <div data-pdf-export>
                <PDFExporter records={filteredDataset.length > 0 ? filteredDataset : records} statuses={allStatuses} settings={settings} />
              </div>
              <div data-excel-export>
                <ExcelExporter records={filteredDataset.length > 0 ? filteredDataset : records} statuses={allStatuses} />
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto px-[14px] pt-3 pb-4">
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
          </div>

          {/* מודל פרטי דירה */}
          <ApartmentDetailModal
            record={selectedRecord}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveRecord}
            isAdmin={isAdmin}
            settings={settings} />
          </>
          </div>
          </TooltipProvider>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}